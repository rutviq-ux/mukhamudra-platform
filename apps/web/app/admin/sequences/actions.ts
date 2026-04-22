"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { sequenceSchema, sequenceStepSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";

// ── Derived schemas ──

const updateSequenceSchema = sequenceSchema.extend({ id: z.string().cuid() });
const deleteSequenceSchema = z.object({ id: z.string().cuid() });

const createStepSchema = sequenceStepSchema.extend({
  sequenceId: z.string().cuid(),
});
const updateStepSchema = sequenceStepSchema.extend({
  id: z.string().cuid(),
  sequenceId: z.string().cuid(),
});
const deleteStepSchema = z.object({
  id: z.string().cuid(),
  sequenceId: z.string().cuid(),
});

// ── Sequence actions ──

export const createSequence = createAdminAction("createSequence", {
  schema: sequenceSchema,
  audit: {
    action: "sequence.create",
    targetType: "Sequence",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({
      name: data.name,
      slug: data.slug,
      triggerEvent: data.triggerEvent,
    }),
  },
  handler: async ({ data }) => {
    const { name, slug, description, triggerEvent, cancelEvents, isActive } =
      data;

    const existing = await prisma.sequence.findUnique({ where: { slug } });
    if (existing) {
      throw new Error("A sequence with this slug already exists");
    }

    const sequence = await prisma.sequence.create({
      data: { name, slug, description, triggerEvent, cancelEvents, isActive },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
          include: { template: { select: { name: true, channel: true } } },
        },
        _count: { select: { enrollments: true } },
      },
    });

    revalidatePath("/admin/sequences");
    return sequence;
  },
});

export const updateSequence = createAdminAction("updateSequence", {
  schema: updateSequenceSchema,
  audit: {
    action: "sequence.update",
    targetType: "Sequence",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({
      name: data.name,
      slug: data.slug,
      triggerEvent: data.triggerEvent,
    }),
  },
  handler: async ({ data }) => {
    const { id, name, slug, description, triggerEvent, cancelEvents, isActive } =
      data;

    const existing = await prisma.sequence.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Sequence not found");
    }

    if (slug !== existing.slug) {
      const slugConflict = await prisma.sequence.findUnique({
        where: { slug },
      });
      if (slugConflict) {
        throw new Error("A sequence with this slug already exists");
      }
    }

    const sequence = await prisma.sequence.update({
      where: { id },
      data: { name, slug, description, triggerEvent, cancelEvents, isActive },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
          include: { template: { select: { name: true, channel: true } } },
        },
        _count: { select: { enrollments: true } },
      },
    });

    revalidatePath("/admin/sequences");
    return sequence;
  },
});

export const deleteSequence = createAdminAction("deleteSequence", {
  schema: deleteSequenceSchema,
  audit: {
    action: "sequence.delete",
    targetType: "Sequence",
    getTargetId: (data) => data.id,
    getMetadata: (data, result) => ({
      name: result.name,
      deactivated: result.deactivated,
    }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const existing = await prisma.sequence.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!existing) {
      throw new Error("Sequence not found");
    }

    if (existing._count.enrollments > 0) {
      await prisma.sequence.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/admin/sequences");
      return { deleted: false, deactivated: true, name: existing.name };
    }

    await prisma.sequence.delete({ where: { id } });

    revalidatePath("/admin/sequences");
    return { deleted: true, deactivated: false, name: existing.name };
  },
});

// ── Step actions ──

export const createStep = createAdminAction("createStep", {
  schema: createStepSchema,
  audit: {
    action: "sequence_step.create",
    targetType: "SequenceStep",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({
      sequenceId: data.sequenceId,
      stepOrder: data.stepOrder,
    }),
  },
  handler: async ({ data }) => {
    const { sequenceId, templateId, stepOrder, delayMinutes, isActive } = data;

    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId },
    });
    if (!sequence) {
      throw new Error("Sequence not found");
    }

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new Error("Template not found");
    }

    const existingStep = await prisma.sequenceStep.findUnique({
      where: { sequenceId_stepOrder: { sequenceId, stepOrder } },
    });
    if (existingStep) {
      throw new Error(
        `Step order ${stepOrder} already exists in this sequence`,
      );
    }

    const step = await prisma.sequenceStep.create({
      data: { sequenceId, templateId, stepOrder, delayMinutes, isActive },
      include: { template: { select: { name: true, channel: true } } },
    });

    revalidatePath("/admin/sequences");
    return step;
  },
});

export const updateStep = createAdminAction("updateStep", {
  schema: updateStepSchema,
  audit: {
    action: "sequence_step.update",
    targetType: "SequenceStep",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({
      sequenceId: data.sequenceId,
      stepOrder: data.stepOrder,
    }),
  },
  handler: async ({ data }) => {
    const { id, sequenceId, templateId, stepOrder, delayMinutes, isActive } =
      data;

    const existing = await prisma.sequenceStep.findFirst({
      where: { id, sequenceId },
    });
    if (!existing) {
      throw new Error("Step not found");
    }

    if (stepOrder !== existing.stepOrder) {
      const orderConflict = await prisma.sequenceStep.findUnique({
        where: { sequenceId_stepOrder: { sequenceId, stepOrder } },
      });
      if (orderConflict) {
        throw new Error(
          `Step order ${stepOrder} already exists in this sequence`,
        );
      }
    }

    const step = await prisma.sequenceStep.update({
      where: { id },
      data: { templateId, stepOrder, delayMinutes, isActive },
      include: { template: { select: { name: true, channel: true } } },
    });

    revalidatePath("/admin/sequences");
    return step;
  },
});

export const deleteStep = createAdminAction("deleteStep", {
  schema: deleteStepSchema,
  audit: {
    action: "sequence_step.delete",
    targetType: "SequenceStep",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({
      sequenceId: data.sequenceId,
    }),
  },
  handler: async ({ data }) => {
    const { id, sequenceId } = data;

    const existing = await prisma.sequenceStep.findFirst({
      where: { id, sequenceId },
    });
    if (!existing) {
      throw new Error("Step not found");
    }

    await prisma.sequenceStep.delete({ where: { id } });

    revalidatePath("/admin/sequences");
    return { deleted: true };
  },
});
