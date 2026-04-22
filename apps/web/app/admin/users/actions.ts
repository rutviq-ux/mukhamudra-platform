"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { adminCreateUserSchema, adminUpdateUserSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";
import { clerkClient } from "@clerk/nextjs/server";

/* ─── Create User ─── */
export const createUser = createAdminAction("createUser", {
  schema: adminCreateUserSchema,
  audit: {
    action: "user.create",
    targetType: "User",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data, result) => ({
      email: data.email,
      role: data.role ?? "USER",
      clerkId: result.clerkId,
    }),
  },
  handler: async ({ data }) => {
    const { email, name, phone, password, role } = data;

    const existing = await prisma.user.findUnique({
      where: { email: email.trim() },
    });
    if (existing) {
      throw new Error("A user with this email already exists");
    }

    // Create user in Clerk first
    const clerk = await clerkClient();
    let createdClerkUserId: string | null = null;

    try {
      const clerkUser = await clerk.users.createUser({
        emailAddress: [email.trim()],
        ...(password ? { password } : {}),
        ...(name
          ? {
              firstName: name.split(" ")[0],
              lastName: name.split(" ").slice(1).join(" ") || undefined,
            }
          : {}),
        ...(phone ? { phoneNumber: [phone.trim()] } : {}),
      });
      createdClerkUserId = clerkUser.id;

      // Create user in Prisma
      const user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: email.trim(),
          name: name?.trim() || null,
          phone: phone?.trim() || null,
          role: role ?? "USER",
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          clerkId: true,
          marketingOptIn: true,
          whatsappOptIn: true,
          createdAt: true,
          _count: { select: { orders: true, memberships: true, bookings: true } },
        },
      });

      revalidatePath("/admin/users");
      return user;
    } catch (error) {
      // Roll back Clerk user if DB creation failed
      if (createdClerkUserId) {
        try {
          const c = await clerkClient();
          await c.users.deleteUser(createdClerkUserId);
        } catch {
          // Best-effort cleanup
        }
      }

      const message =
        error instanceof Error ? error.message : "Failed to create user";
      if (message.includes("already exists") || message.includes("taken")) {
        throw new Error("This email is already registered in the auth system");
      }
      throw error;
    }
  },
});

/* ─── Update User ─── */
const updateUserSchema = adminUpdateUserSchema.extend({
  id: z.string().cuid(),
});

export const updateUser = createAdminAction("updateUser", {
  schema: updateUserSchema,
  audit: {
    action: "user.update",
    targetType: "User",
    getTargetId: (data) => data.id,
    getMetadata: (data) => {
      const { id: _, ...rest } = data;
      return rest as Record<string, unknown>;
    },
  },
  handler: async ({ data }) => {
    const { id, name, phone, marketingOptIn, whatsappOptIn } = data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found");
    }

    const dbUpdates: Record<string, unknown> = {};
    const clerkUpdates: Record<string, unknown> = {};

    if (name !== undefined) {
      const trimmed = name?.trim() || null;
      dbUpdates.name = trimmed;
      if (trimmed) {
        const parts = trimmed.split(" ");
        clerkUpdates.firstName = parts[0];
        clerkUpdates.lastName = parts.slice(1).join(" ") || undefined;
      } else {
        clerkUpdates.firstName = "";
        clerkUpdates.lastName = "";
      }
    }

    if (phone !== undefined) {
      dbUpdates.phone = phone?.trim() || null;
    }

    if (marketingOptIn !== undefined) {
      dbUpdates.marketingOptIn = marketingOptIn;
    }

    if (whatsappOptIn !== undefined) {
      dbUpdates.whatsappOptIn = whatsappOptIn;
    }

    if (Object.keys(dbUpdates).length === 0) {
      throw new Error("No valid fields to update");
    }

    // Sync name to Clerk if user has a clerkId
    if (user.clerkId && Object.keys(clerkUpdates).length > 0) {
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUser(user.clerkId, clerkUpdates);
      } catch {
        // Don't fail the whole request — DB is source of truth
      }
    }

    await prisma.user.update({ where: { id }, data: dbUpdates });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return { success: true };
  },
});

/* ─── Update User Role ─── */
const updateUserRoleSchema = z.object({
  id: z.string().cuid(),
  role: z.enum(["USER", "COACH", "OPS", "ADMIN"]),
});

export const updateUserRole = createAdminAction("updateUserRole", {
  schema: updateUserRoleSchema,
  audit: {
    action: "user.role_change",
    targetType: "User",
    getTargetId: (data) => data.id,
    getMetadata: (data, result) => ({
      previousRole: result.previousRole,
      newRole: data.role,
    }),
  },
  handler: async ({ data }) => {
    const { id, role } = data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === role) {
      throw new Error("Role is already set to " + role);
    }

    const previousRole = user.role;

    await prisma.user.update({ where: { id }, data: { role } });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return { previousRole };
  },
});

/* ─── Delete User ─── */
const deleteUserSchema = z.object({ id: z.string().cuid() });

export const deleteUser = createAdminAction("deleteUser", {
  schema: deleteUserSchema,
  audit: {
    action: "user.delete",
    targetType: "User",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({
      email: result.email,
      clerkId: result.clerkId,
    }),
  },
  handler: async ({ data, user: admin }) => {
    const { id } = data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found");
    }

    // Prevent self-deletion
    if (user.id === admin.id) {
      throw new Error("You cannot delete your own account");
    }

    // Check for blocking related data
    const [activeMemberships, upcomingSessions] = await Promise.all([
      prisma.membership.count({ where: { userId: id, status: "ACTIVE" } }),
      prisma.session.count({
        where: {
          coachId: id,
          startsAt: { gte: new Date() },
          status: "SCHEDULED",
        },
      }),
    ]);

    if (activeMemberships > 0) {
      throw new Error(
        `User has ${activeMemberships} active membership(s). Cancel them first.`,
      );
    }
    if (upcomingSessions > 0) {
      throw new Error(
        `User is coaching ${upcomingSessions} upcoming session(s). Reassign them first.`,
      );
    }

    // Delete from Clerk if linked
    if (user.clerkId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(user.clerkId);
      } catch {
        // May already be deleted
      }
    }

    // Delete related records in a transaction, then the user
    await prisma.$transaction(async (tx) => {
      await tx.booking.deleteMany({ where: { userId: id } });
      await tx.attendance.deleteMany({ where: { userId: id } });
      await tx.order.deleteMany({ where: { userId: id } });
      await tx.membership.deleteMany({ where: { userId: id } });
      await tx.progressMedia.deleteMany({ where: { userId: id } });
      await tx.userCourseProgress.deleteMany({ where: { userId: id } });
      await tx.messageLog.deleteMany({ where: { userId: id } });
      await tx.auditLog.deleteMany({ where: { actorId: id } });
      await tx.recordingAccess.deleteMany({ where: { userId: id } });
      // Unlink coached sessions (don't delete them)
      await tx.session.updateMany({
        where: { coachId: id },
        data: { coachId: null },
      });
      await tx.user.delete({ where: { id } });
    });

    revalidatePath("/admin/users");
    return { email: user.email, clerkId: user.clerkId };
  },
});
