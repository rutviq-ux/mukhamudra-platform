"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@ru/db";
import { batchSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";
import { buildSessionsForBatch } from "@/lib/sessions";
import { getConfig } from "@/lib/config";

const updateBatchSchema = batchSchema.extend({ id: z.string().cuid() });
const deleteBatchSchema = z.object({ id: z.string().cuid() });
const regenerateSchema = z.object({
  id: z.string().cuid(),
  effectiveDate: z.string().min(1, "Effective date is required"),
});

// ---------- createBatch ----------

export const createBatch = createAdminAction("createBatch", {
  schema: batchSchema,
  audit: {
    action: "batch.create",
    targetType: "Batch",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({ name: data.name, slug: data.slug }),
  },
  handler: async ({ data }) => {
    const existing = await prisma.batch.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new Error("A batch with this slug already exists");
    }

    const { dayModalities, ...rest } = data;
    const batch = await prisma.batch.create({
      data: {
        ...rest,
        dayModalities:
          dayModalities === null || dayModalities === undefined
            ? Prisma.DbNull
            : dayModalities,
      },
      include: { product: { select: { id: true, name: true, type: true } } },
    });

    revalidatePath("/admin/batches");
    return batch;
  },
});

// ---------- updateBatch ----------

export const updateBatch = createAdminAction("updateBatch", {
  schema: updateBatchSchema,
  audit: {
    action: "batch.update",
    targetType: "Batch",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({ name: data.name, slug: data.slug }),
  },
  handler: async ({ data }) => {
    const { id, dayModalities, ...rest } = data;

    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Batch not found");
    }

    if (rest.slug !== existing.slug) {
      const slugConflict = await prisma.batch.findUnique({
        where: { slug: rest.slug },
      });
      if (slugConflict) {
        throw new Error("A batch with this slug already exists");
      }
    }

    const batch = await prisma.batch.update({
      where: { id },
      data: {
        ...rest,
        dayModalities:
          dayModalities === null || dayModalities === undefined
            ? Prisma.DbNull
            : dayModalities,
      },
      include: { product: { select: { id: true, name: true, type: true } } },
    });

    revalidatePath("/admin/batches");
    return batch;
  },
});

// ---------- deleteBatch ----------

export const deleteBatch = createAdminAction("deleteBatch", {
  schema: deleteBatchSchema,
  audit: {
    action: "batch.delete",
    targetType: "Batch",
    getTargetId: (data) => data.id,
    getMetadata: (data, result) => ({
      name: result.name,
      deactivated: result.deactivated,
    }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const existing = await prisma.batch.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } },
    });
    if (!existing) {
      throw new Error("Batch not found");
    }

    if (existing._count.sessions > 0) {
      await prisma.batch.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/admin/batches");
      return { deleted: false, deactivated: true, name: existing.name };
    }

    await prisma.batch.delete({ where: { id } });

    revalidatePath("/admin/batches");
    return { deleted: true, deactivated: false, name: existing.name };
  },
});

// ---------- regenerateBatchSessions ----------

export const regenerateBatchSessions = createAdminAction(
  "regenerateBatchSessions",
  {
    schema: regenerateSchema,
    audit: {
      action: "batch.regenerate_sessions",
      targetType: "Batch",
      getTargetId: (data) => data.id,
      getMetadata: (_data, result) => ({
        effectiveDate: result.effectiveDate,
        deleted: result.deleted,
        cancelled: result.cancelled,
        generated: result.generated,
      }),
    },
    handler: async ({ data }) => {
      const { id, effectiveDate } = data;

      const cutoff = new Date(effectiveDate);
      cutoff.setUTCHours(0, 0, 0, 0);

      if (isNaN(cutoff.getTime())) {
        throw new Error("Invalid date format");
      }

      // 1. Fetch batch
      const batch = await prisma.batch.findUnique({
        where: { id },
        include: { product: true },
      });
      if (!batch) {
        throw new Error("Batch not found");
      }

      // 2. Find future sessions from cutoff date
      const futureSessions = await prisma.session.findMany({
        where: {
          batchId: id,
          startsAt: { gte: cutoff },
          status: "SCHEDULED",
        },
        include: {
          _count: { select: { bookings: true } },
        },
      });

      const unbookedIds = futureSessions
        .filter((s) => s._count.bookings === 0)
        .map((s) => s.id);

      const bookedIds = futureSessions
        .filter((s) => s._count.bookings > 0)
        .map((s) => s.id);

      // 3. Delete unbooked sessions, cancel booked sessions
      let deleted = 0;
      if (unbookedIds.length > 0) {
        const result = await prisma.session.deleteMany({
          where: { id: { in: unbookedIds } },
        });
        deleted = result.count;
      }

      let cancelled = 0;
      if (bookedIds.length > 0) {
        const result = await prisma.session.updateMany({
          where: { id: { in: bookedIds } },
          data: { status: "CANCELLED" },
        });
        cancelled = result.count;
      }

      // 4. Generate new sessions
      const config = await getConfig();
      const daysToGenerate = config.SESSION_GENERATION_DAYS;
      const now = new Date();

      const defaultCoach = config.DEFAULT_COACH_EMAIL
        ? await prisma.user.findUnique({
            where: { email: config.DEFAULT_COACH_EMAIL },
            select: { id: true },
          })
        : null;

      const sessionsToCreate = buildSessionsForBatch(
        batch,
        cutoff,
        daysToGenerate,
        now,
        defaultCoach?.id,
      );

      // Check for duplicates against remaining sessions
      const existingSessions = await prisma.session.findMany({
        where: {
          batchId: id,
          status: "SCHEDULED",
          startsAt: { gte: now },
        },
        select: { startsAt: true },
      });

      const existingTimes = new Set(
        existingSessions.map((s) => s.startsAt.getTime()),
      );

      const newSessions = sessionsToCreate.filter(
        (s) => !existingTimes.has(s.startsAt.getTime()),
      );

      let generated = 0;
      if (newSessions.length > 0) {
        await prisma.session.createMany({ data: newSessions });
        generated = newSessions.length;
      }

      revalidatePath("/admin/batches");
      return {
        deleted,
        cancelled,
        generated,
        effectiveDate: cutoff.toISOString(),
      };
    },
  },
);
