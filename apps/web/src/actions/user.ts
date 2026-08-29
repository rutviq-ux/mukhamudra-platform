"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { userUpdateSchema, createLogger } from "@ru/config";
import { notifyWelcome, emitSequenceEvent } from "@ru/notifications";
import { createAuthAction } from "@/lib/actions/safe-action";
import { getPostHogServer } from "@/lib/posthog-server";
import { syncPaidUserToSheet } from "@/lib/sync-paid-user-sheet";
import {
  isPhoneUniqueViolation,
  isValidStoredPhone,
  normalizeStoredPhone,
} from "@/lib/user-phone";
import { findConflictingPhoneUserId } from "@/lib/user-phone-db";

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

    const nextPhone =
      phone !== undefined ? normalizeStoredPhone(phone) : undefined;
    if (nextPhone && !isValidStoredPhone(nextPhone)) {
      throw new Error("Invalid phone number format");
    }
    if (nextPhone) {
      const conflictId = await findConflictingPhoneUserId(nextPhone, user.id);
      if (conflictId) {
        throw new Error("This phone number is already in use");
      }
    }

    const effectivePhone = nextPhone !== undefined ? nextPhone : user.phone;
    const effectiveWhatsappOptIn =
      whatsappOptIn !== undefined
        ? !effectivePhone
          ? false
          : whatsappOptIn
        : undefined;

    const isOnboarding = goal !== undefined && !user.onboardedAt;

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name !== undefined ? name : undefined,
          phone: nextPhone !== undefined ? nextPhone : undefined,
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
      if (isPhoneUniqueViolation(error)) {
        throw new Error("This phone number is already in use");
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

    if (nextPhone && updatedUser.phone) {
      syncPaidUserToSheet(updatedUser.id).catch((err) =>
        log.error({ err, userId: updatedUser.id }, "Failed to sync paid-user sheet"),
      );
    }

    return { user: updatedUser };
  },
});
