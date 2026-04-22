"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { messageTemplateSchema, sendTestMessageSchema, getServerEnv } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";
import { ListmonkEmailProvider, logMessage } from "@ru/notifications";

const updateTemplateSchema = messageTemplateSchema.extend({ id: z.string().cuid() });
const deleteTemplateSchema = z.object({ id: z.string().cuid() });

export const createTemplate = createAdminAction("createTemplate", {
  schema: messageTemplateSchema,
  audit: {
    action: "template.create",
    targetType: "MessageTemplate",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({
      name: data.name,
      channel: data.channel,
    }),
  },
  handler: async ({ data }) => {
    const { name, channel, subject, body, variables, isActive } = data;

    const existing = await prisma.messageTemplate.findUnique({
      where: { name },
    });
    if (existing) {
      throw new Error("A template with this name already exists");
    }

    const template = await prisma.messageTemplate.create({
      data: { name, channel, subject, body, variables, isActive },
    });

    revalidatePath("/admin/messages");
    return template;
  },
});

export const updateTemplate = createAdminAction("updateTemplate", {
  schema: updateTemplateSchema,
  audit: {
    action: "template.update",
    targetType: "MessageTemplate",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({
      name: data.name,
      channel: data.channel,
    }),
  },
  handler: async ({ data }) => {
    const { id, name, channel, subject, body, variables, isActive } = data;

    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error("Template not found");
    }

    if (name !== existing.name) {
      const nameConflict = await prisma.messageTemplate.findUnique({
        where: { name },
      });
      if (nameConflict) {
        throw new Error("A template with this name already exists");
      }
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: { name, channel, subject, body, variables, isActive },
    });

    revalidatePath("/admin/messages");
    return template;
  },
});

export const deleteTemplate = createAdminAction("deleteTemplate", {
  schema: deleteTemplateSchema,
  audit: {
    action: "template.delete",
    targetType: "MessageTemplate",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({
      name: result.name,
      deactivated: result.deactivated,
    }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
      include: { _count: { select: { messageLogs: true } } },
    });
    if (!existing) {
      throw new Error("Template not found");
    }

    if (existing._count.messageLogs > 0) {
      await prisma.messageTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/admin/messages");
      return { deleted: false, deactivated: true, name: existing.name };
    }

    await prisma.messageTemplate.delete({ where: { id } });

    revalidatePath("/admin/messages");
    return { deleted: true, deactivated: false, name: existing.name };
  },
});

// ── Send Test Message ────────────────────────────────────────────────

export const sendTestMessage = createAdminAction("sendTestMessage", {
  schema: sendTestMessageSchema,
  audit: {
    action: "message.test.send",
    targetType: "MessageLog",
    getTargetId: (_data, result) => result.logId,
    getMetadata: (data) => ({
      channel: data.channel,
      templateId: data.templateId,
      recipient: data.testRecipient,
    }),
  },
  handler: async ({ data }) => {
    const { templateId, channel, testRecipient, variables } = data;

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isActive) {
      throw new Error("Message template not found or inactive");
    }

    if (template.channel !== channel) {
      throw new Error("Template channel mismatch");
    }

    // Optional user lookup — test messages can be sent to any recipient
    const recipientUser =
      channel === "EMAIL"
        ? await prisma.user.findUnique({ where: { email: testRecipient } })
        : await prisma.user.findUnique({ where: { phone: testRecipient } });

    function interpolate(text: string): string {
      if (!variables) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
        key in variables ? variables[key]! : match,
      );
    }

    const subject = interpolate(template.subject || `Test: ${template.name}`);
    const bodyText = interpolate(template.body);

    let status: "QUEUED" | "SENT" | "FAILED" = "SENT";
    let providerMessageId: string | undefined;
    let errorMessage: string | undefined;

    if (channel === "EMAIL") {
      const env = getServerEnv();
      const provider = new ListmonkEmailProvider({
        url: env.LISTMONK_URL,
        username: env.LISTMONK_API_USER,
        password: env.LISTMONK_API_PASSWORD,
      });
      const result = await provider.send({
        to: testRecipient,
        subject,
        html: bodyText,
        text: bodyText,
      });
      status = result.success ? "SENT" : "FAILED";
      providerMessageId = result.messageId;
      errorMessage = result.error;
    } else {
      // WhatsApp / Push: queue the message
      status = "QUEUED";
    }

    const logId = await logMessage({
      channel,
      to: testRecipient,
      userId: recipientUser?.id,
      templateId: template.id,
      subject: channel === "EMAIL" ? subject : undefined,
      body: bodyText,
      status,
      providerMessageId,
      error: errorMessage,
    });

    if (status === "FAILED") {
      throw new Error(errorMessage || "Failed to send test message");
    }

    revalidatePath("/admin/messages");
    return { logId, status };
  },
});
