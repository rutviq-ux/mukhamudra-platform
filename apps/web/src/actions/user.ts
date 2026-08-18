"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@ru/db";
import { userUpdateSchema, createLogger } from "@ru/config";
import { notifyWelcome, emitSequenceEvent } from "@ru/notifications";
import { createAuthAction } from "@/lib/actions/safe-action";
import { getPostHogServer } from "@/lib/posthog-server";
import { syncPaidUserToSheet } from "@/lib/sync-paid-user-sheet";

const log = createLogger("action:updateUserProfile");

export const updateUserProfile = createAuthAction("updateUserProfile", {
  schema: userUpdateSchema,
  handler: async ({ data, user }) => {
    const {
      name,
      phone,
      goal,
      whatsappOptIn,
      marketingOptIn,
      pushOptIn,
      timezone,
      termsAccepted,
    } = data;

    // Clear whatsappOptIn if user opted in but has no phone number
    const effectivePhone = phone !== undefined ? phone : user.phone;
    const effectiveWhatsappOptIn =
      whatsappOptIn !== undefined
        ? !effectivePhone
          ? false
          : whatsappOptIn
        : undefined;

    // Check if this is the first onboarding completion
    const isOnboarding = goal !== undefined && !user.onboardedAt;

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          goal: goal !== undefined ? goal : undefined,
          whatsappOptIn: effectiveWhatsappOptIn,
          marketingOptIn:
            marketingOptIn !== undefined ? marketingOptIn : undefined,
          pushOptIn: pushOptIn !== undefined ? pushOptIn : undefined,
          timezone: timezone !== undefined ? timezone : undefined,
          ...(isOnboarding ? { onboardedAt: new Date() } : {}),
          ...(termsAccepted ? { termsAcceptedAt: new Date() } : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes("phone")) {
          throw new Error("This phone number is already in use");
        }
      }
      throw error;
    }

    // Fire welcome notification + sequence enrollment on first onboarding
    if (isOnboarding) {
      notifyWelcome({ userId: user.id }).catch((err) =>
        log.error({ err }, "Failed to queue welcome notification"),
      );
      emitSequenceEvent("user.onboarded", { userId: user.id }).catch((err) =>
        log.error({ err }, "Failed to emit user.onboarded sequence event"),
      );

      const posthog = getPostHogServer();
      posthog.identify({
        distinctId: user.id,
        properties: {
          $set: {
            goal: goal,
            whatsapp_opt_in: effectiveWhatsappOptIn ?? false,
            marketing_opt_in: marketingOptIn ?? false,
            timezone: timezone,
          },
        },
      });
      posthog.capture({
        distinctId: user.id,
        event: "user_onboarding_completed",
        properties: {
          goal: goal,
          whatsapp_opt_in: effectiveWhatsappOptIn ?? false,
        },
      });
      await posthog.flush();
    }

    revalidatePath("/app");

    if (phone !== undefined && updatedUser.phone) {
      syncPaidUserToSheet(updatedUser.id).catch((err) =>
        log.error({ err, userId: updatedUser.id }, "Failed to sync paid-user sheet"),
      );
    }

    return { user: updatedUser };
  },
});
