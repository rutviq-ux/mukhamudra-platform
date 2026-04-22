"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { createAdminAction } from "@/lib/actions/safe-action";

const coachSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  coachModalities: true,
  createdAt: true,
  _count: { select: { coachedSessions: true } },
} as const;

// --- Schemas ---

const promoteCoachSchema = z.object({
  email: z.string().email("Valid email is required"),
  modalities: z.array(z.string()).default([]),
});

const updateCoachModalitiesSchema = z.object({
  id: z.string().cuid("Invalid coach ID"),
  modalities: z.array(z.string().min(1)),
});

const demoteCoachSchema = z.object({
  id: z.string().cuid("Invalid coach ID"),
});

// --- Actions ---

export const promoteCoach = createAdminAction("promoteCoach", {
  schema: promoteCoachSchema,
  audit: {
    action: "coach.create",
    targetType: "User",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data, result) => ({
      email: data.email,
      modalities: data.modalities,
      wasAlreadyCoach: result.wasAlreadyCoach,
    }),
  },
  handler: async ({ data }) => {
    const { email, modalities } = data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      throw new Error(`No user found with email ${email}`);
    }

    if (existing.role === "COACH" || existing.role === "ADMIN") {
      // Already a coach or admin — just update modalities
      const coach = await prisma.user.update({
        where: { id: existing.id },
        data: { coachModalities: modalities },
        select: coachSelect,
      });

      revalidatePath("/admin/coaches");
      return { ...coach, wasAlreadyCoach: true };
    }

    // Promote to COACH
    const coach = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "COACH",
        coachModalities: modalities,
      },
      select: coachSelect,
    });

    revalidatePath("/admin/coaches");
    return { ...coach, wasAlreadyCoach: false };
  },
});

export const updateCoachModalities = createAdminAction(
  "updateCoachModalities",
  {
    schema: updateCoachModalitiesSchema,
    audit: {
      action: "coach.update",
      targetType: "User",
      getTargetId: (data) => data.id,
      getMetadata: (data) => ({ modalities: data.modalities }),
    },
    handler: async ({ data }) => {
      const { id, modalities } = data;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new Error("User not found");
      }
      if (user.role !== "COACH" && user.role !== "ADMIN") {
        throw new Error("User is not a coach or admin");
      }

      const coach = await prisma.user.update({
        where: { id },
        data: { coachModalities: modalities },
        select: coachSelect,
      });

      revalidatePath("/admin/coaches");
      return coach;
    },
  },
);

export const demoteCoach = createAdminAction("demoteCoach", {
  schema: demoteCoachSchema,
  audit: {
    action: "coach.delete",
    targetType: "User",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({ previousEmail: result.previousEmail }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role !== "COACH" && user.role !== "ADMIN") {
      throw new Error("User is not a coach or admin");
    }

    // Check for upcoming assigned sessions
    const upcomingSessions = await prisma.session.count({
      where: {
        coachId: id,
        startsAt: { gte: new Date() },
        status: "SCHEDULED",
      },
    });

    if (upcomingSessions > 0) {
      throw new Error(
        `Has ${upcomingSessions} upcoming session${upcomingSessions > 1 ? "s" : ""}. Reassign them first.`,
      );
    }

    if (user.role === "ADMIN") {
      // Don't demote admins — just clear their coaching modalities
      await prisma.user.update({
        where: { id },
        data: { coachModalities: [] },
      });
    } else {
      await prisma.user.update({
        where: { id },
        data: { role: "USER", coachModalities: [] },
      });
    }

    revalidatePath("/admin/coaches");
    return { previousEmail: user.email };
  },
});
