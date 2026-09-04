/**
 * Interakt CRM sync + transactional WhatsApp dispatch
 *
 * This file contains the business logic that decides WHAT to sync and WHEN
 * to send which template. It sits on top of the raw interakt.ts client.
 *
 * ─── Ship order (from Tejas's review) ────────────────────────────────────────
 *
 * PHASE 1 (now): Option B — CRM sync + Meet link only.
 * sendTemplate() calls inside onSubscriptionActivated and
 * onSubscriptionCancelled are commented out. Existing Meta sendEnroll*
 * functions continue to handle welcome WhatsApps.
 *
 * PHASE 2 (after templates approved in Interakt/Meta):
 * Uncomment the sendTemplate() blocks, AND remove sendEnroll* calls from
 * razorpay/webhook/route.ts to avoid duplicate welcome messages.
 * That is Option A — Interakt as the single WhatsApp sender.
 *
 * ─── Integration points (callers MUST await — no .catch() on Vercel) ─────────
 *
 * razorpay/webhook/route.ts → handlePaymentCaptured (payment.captured)
 *   await onPaymentCaptured(userId, membershipId);
 *
 * razorpay/webhook/route.ts → handleSubscriptionActivated
 *   await onSubscriptionActivated(userId, membership.id);
 *
 * razorpay/webhook/route.ts → handleSubscriptionCancelled
 *   await onSubscriptionCancelled(userId, membership.id);
 *
 * cron/sync-payments/route.ts → after marking membership ACTIVE
 *   await onSubscriptionActivated(userId, membership.id);
 *
 * cron/expire-memberships/route.ts → after marking membership EXPIRED
 *   await onMembershipExpired(userId, membership.id);
 *
 * cron/auto-generate-meet/route.ts → after syncSessionJoinUrlToSheet()
 *   await onMeetLinkGenerated(session.id, meetResult.meetLink);
 *
 * apps/web/src/app/api/admin/generate-session-meet/route.ts → same
 *   await onMeetLinkGenerated(sessionId, meetLink);
 *
 * apps/web/src/app/api/admin/cancel-membership/route.ts
 *   await onSubscriptionCancelled(userId, membershipId);
 *
 * ─── Templates Haripriya must create in Interakt (Phase 2) ───────────────────
 *
 * Template name                     Variables ({{1}}, {{2}}, …)
 * ───────────────────────────────── ──────────────────────────────────────
 * mukhamudra_welcome_face_yoga       {{1}}=first_name
 *                                    {{2}}=membership_valid_until
 *                                    {{3}}=class_time (e.g. "9 PM")
 *                                    {{4}}=dashboard_url
 *
 * mukhamudra_welcome_pranayama       {{1}}=first_name
 *                                    {{2}}=membership_valid_until
 *                                    {{3}}=class_time
 *                                    {{4}}=dashboard_url
 *
 * mukhamudra_welcome_bundle          {{1}}=first_name
 *                                    {{2}}=membership_valid_until
 *                                    {{3}}=pranayama_class_time
 *                                    {{4}}=faceyoga_class_time
 *                                    {{5}}=dashboard_url
 *
 * mukhamudra_subscription_cancelled  {{1}}=first_name
 *                                    {{2}}=plan_name
 *                                    {{3}}=last_access_date
 *
 * mukhamudra_meet_link_ready         {{1}}=first_name
 *                                    {{2}}=class_type (e.g. "Morning Pranayama")
 *                                    {{3}}=join_url (direct Google Meet link)
 *                                    NOTE: confirm Meta approves a dynamic URL
 *                                    as a body variable before submitting.
 */

import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { formatPhone, sendTemplate, upsertContact } from "./interakt";

const log = createLogger("interakt-sync");

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mukhamudra.com";

// ─── Template names ───────────────────────────────────────────────────────────
// Each value MUST match the name registered in the Interakt dashboard exactly.
// A mismatch causes Interakt to return 400 (logged, not thrown).

const TEMPLATES = {
  WELCOME_FACE_YOGA: "mukhamudra_welcome_face_yoga",
  WELCOME_PRANAYAMA: "mukhamudra_welcome_pranayama",
  WELCOME_BUNDLE: "mukhamudra_welcome_bundle",
  SUBSCRIPTION_CANCELLED: "mukhamudra_subscription_cancelled",
  MEET_LINK_READY: "mukhamudra_meet_link_ready",
} as const;

// DASHBOARD_URL is only used in Phase 2 sendTemplate() calls (currently commented out).
// Uncomment when Phase 2 goes live.
// const DASHBOARD_URL = `${APP_URL}/app`;

// ─── Meet-link dedup guard ────────────────────────────────────────────────────
// Prevents sending the same Meet link twice IF onMeetLinkGenerated is somehow
// called more than once within a single Vercel function invocation.
//
// ⚠ LIMITATION — Vercel serverless: each invocation starts with a fresh
// module, so this Set is always empty at the start of every cron/API call.
// It does NOT prevent duplicate sends across separate invocations.
// For true multi-invocation dedup, add an interaktMeetSentAt field to the
// Session model and check it before sending.
const meetLinkSentSessions = new Set<string>();

// ─── Concurrency ─────────────────────────────────────────────────────────────
// Max parallel Interakt HTTP calls per batch — keeps Vercel from timing out.
const CONCURRENCY = 10;

// ─── Private helpers ──────────────────────────────────────────────────────────

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "there";
  return fullName.split(" ")[0] ?? fullName;
}

// fmtDate and getBatchTime are used in Phase 2 sendTemplate() blocks below.
// Uncomment when Phase 2 goes live.
//
// function fmtDate(d: Date | null | undefined): string {
//   if (!d) return "N/A";
//   return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
// }
//
// function fmtBatchTime(startTime: string): string {
//   const [hStr] = startTime.split(":");
//   const h = parseInt(hStr ?? "0", 10);
//   const period = h >= 12 ? "PM" : "AM";
//   const h12 = h % 12 === 0 ? 12 : h % 12;
//   return `${h12} ${period}`;
// }
//
// async function getBatchTime(productType: string): Promise<string> {
//   const batch = await prisma.batch.findFirst({
//     where: { isActive: true, product: { type: productType as any } },
//     orderBy: { startTime: "asc" },
//     select: { startTime: true },
//   });
//   return batch ? fmtBatchTime(batch.startTime) : "your scheduled time";
// }

/** Run async tasks in chunks of `size` at most concurrently. */
async function runConcurrently<T>(
  tasks: (() => Promise<T>)[],
  size: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += size) {
    const chunk = tasks.slice(i, i + size);
    const chunkResults = await Promise.all(chunk.map((t) => t()));
    results.push(...chunkResults);
  }
  return results;
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Called when a one-time payment is captured (payment.captured webhook event).
 * Delegates to onSubscriptionActivated — CRM sync is the same either way.
 */
export async function onPaymentCaptured(
  userId: string,
  membershipId: string,
): Promise<void> {
  return onSubscriptionActivated(userId, membershipId);
}

/**
 * Called when a subscription (or one-time plan) is activated.
 *
 * Phase 1 (CURRENT): syncs the contact to Interakt CRM only.
 * Welcome WhatsApp is handled by sendEnroll* (Meta Cloud API) in the webhook.
 *
 * Phase 2: uncomment the sendTemplate() block AND remove sendEnroll* calls
 * from razorpay/webhook/route.ts to avoid duplicate welcome messages.
 */
export async function onSubscriptionActivated(
  userId: string,
  membershipId: string,
): Promise<void> {
  try {
    const [user, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          phone: true,
          whatsappOptIn: true,
        },
      }),
      prisma.membership.findUnique({
        where: { id: membershipId },
        include: { plan: { include: { product: true } } },
      }),
    ]);

    if (!user || !membership) {
      log.warn(
        { userId, membershipId },
        "[Interakt] onSubscriptionActivated: user or membership not found",
      );
      return;
    }

    const phone = formatPhone(user.phone);
    if (!phone) {
      log.info(
        { userId },
        "[Interakt] onSubscriptionActivated: no valid phone, skipping",
      );
      return;
    }

    const planSlug = membership.plan.slug;
    // const periodEnd = membership.periodEnd; // ← needed for Phase 2 welcome template

    // ── Step 1: Sync to Interakt CRM ─────────────────────────────────────────
    // Always run regardless of WhatsApp opt-in — Haripriya's CRM needs every
    // paying member so she can run segment campaigns from Interakt.
    await upsertContact(phone, {
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      plan: membership.plan.name,
      planSlug,
      subscriptionStatus: "active",
    });

    log.info(
      { userId, planSlug },
      "[Interakt] onSubscriptionActivated: CRM synced",
    );

    // ── Step 2: Send welcome WhatsApp (PHASE 2 ONLY) ─────────────────────────
    // ⚠ OPTION B — COMMENTED OUT: sendEnroll* in webhook/route.ts handles
    // welcome WhatsApps. Uncomment this block only after:
    // (a) Interakt templates are Meta-approved
    // (b) sendEnroll* calls are removed from razorpay/webhook/route.ts
    //
    // if (!user.whatsappOptIn) {
    //   log.info({ userId }, "[Interakt] WhatsApp opt-in false, skipping welcome");
    //   return;
    // }
    // const name = firstName(user.name);
    // const validUntil = fmtDate(periodEnd);      ← uncomment periodEnd above too
    // if (planSlug === "face-annual" || planSlug === "face-monthly") {
    //   const classTime = await getBatchTime("FACE_YOGA");
    //   await sendTemplate({ phoneNumber: phone.local, countryCode: phone.countryCode, templateName: TEMPLATES.WELCOME_FACE_YOGA, bodyValues: [name, validUntil, classTime, DASHBOARD_URL] });
    // } else if (planSlug === "pranayama-annual" || planSlug === "pranayama-monthly") {
    //   const classTime = await getBatchTime("PRANAYAMA");
    //   await sendTemplate({ phoneNumber: phone.local, countryCode: phone.countryCode, templateName: TEMPLATES.WELCOME_PRANAYAMA, bodyValues: [name, validUntil, classTime, DASHBOARD_URL] });
    // } else if (planSlug === "bundle-annual" || planSlug === "bundle-monthly") {
    //   const [pranayamaTime, faceYogaTime] = await Promise.all([getBatchTime("PRANAYAMA"), getBatchTime("FACE_YOGA")]);
    //   await sendTemplate({ phoneNumber: phone.local, countryCode: phone.countryCode, templateName: TEMPLATES.WELCOME_BUNDLE, bodyValues: [name, validUntil, pranayamaTime, faceYogaTime, DASHBOARD_URL] });
    // } else {
    //   log.info({ userId, planSlug }, "[Interakt] unrecognised plan slug, no welcome template");
    // }
  } catch (err) {
    // Never re-throw — must not crash the payment webhook
    log.error(
      { err, userId, membershipId },
      "[Interakt] onSubscriptionActivated threw unexpectedly",
    );
  }
}

/**
 * Called when a subscription is cancelled — by Razorpay webhook OR admin action.
 *
 * Phase 1 (CURRENT): updates the contact's CRM status to "cancelled" only.
 * Phase 2: uncomment the sendTemplate() block to send a cancellation WhatsApp.
 */
export async function onSubscriptionCancelled(
  userId: string,
  membershipId: string,
): Promise<void> {
  try {
    const [user, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          phone: true,
          whatsappOptIn: true,
        },
      }),
      prisma.membership.findUnique({
        where: { id: membershipId },
        include: { plan: true },
      }),
    ]);

    if (!user || !membership) {
      log.warn(
        { userId, membershipId },
        "[Interakt] onSubscriptionCancelled: user or membership not found",
      );
      return;
    }

    const phone = formatPhone(user.phone);
    if (!phone) {
      log.info(
        { userId },
        "[Interakt] onSubscriptionCancelled: no valid phone, skipping",
      );
      return;
    }

    // ── Step 1: Update CRM status ─────────────────────────────────────────────
    await upsertContact(phone, {
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      plan: membership.plan.name,
      planSlug: membership.plan.slug,
      subscriptionStatus: "cancelled",
    });

    log.info(
      { userId },
      "[Interakt] onSubscriptionCancelled: CRM updated to cancelled",
    );

    // ── Step 2: Send cancellation WhatsApp (PHASE 2 ONLY) ────────────────────
    // ⚠ OPTION B — COMMENTED OUT.
    // Uncomment after confirming no duplicate with existing Meta flows.
    //
    // if (user.whatsappOptIn) {
    //   await sendTemplate({ phoneNumber: phone.local, countryCode: phone.countryCode, templateName: TEMPLATES.SUBSCRIPTION_CANCELLED, bodyValues: [firstName(user.name), membership.plan.name, fmtDate(membership.periodEnd)] });
    // }
  } catch (err) {
    log.error(
      { err, userId, membershipId },
      "[Interakt] onSubscriptionCancelled threw unexpectedly",
    );
  }
}

/**
 * Called when a membership transitions from ACTIVE → EXPIRED.
 * Updates the Interakt CRM contact status to "expired" so Haripriya's
 * win-back automations and segments stay accurate.
 */
export async function onMembershipExpired(
  userId: string,
  membershipId: string,
): Promise<void> {
  try {
    const [user, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true },
      }),
      prisma.membership.findUnique({
        where: { id: membershipId },
        include: { plan: true },
      }),
    ]);

    if (!user || !membership) {
      log.warn(
        { userId, membershipId },
        "[Interakt] onMembershipExpired: user or membership not found",
      );
      return;
    }

    const phone = formatPhone(user.phone);
    if (!phone) return;

    await upsertContact(phone, {
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      plan: membership.plan.name,
      planSlug: membership.plan.slug,
      subscriptionStatus: "expired",
    });

    log.info(
      { userId, membershipId },
      "[Interakt] onMembershipExpired: CRM updated to expired",
    );
  } catch (err) {
    log.error(
      { err, userId, membershipId },
      "[Interakt] onMembershipExpired threw unexpectedly",
    );
  }
}

/**
 * Called when a Google Meet link is generated for an upcoming session.
 * Sends the DIRECT join URL to all active members of the session's product
 * type who have WhatsApp opted in.
 *
 * Callers:
 * - cron/auto-generate-meet/route.ts (T-25 min before class, automatic)
 * - admin/generate-session-meet/route.ts (manual early generation)
 *
 * @param sessionId Session.id for the upcoming class
 * @param joinUrl   The Google Meet URL just generated
 */
export async function onMeetLinkGenerated(
  sessionId: string,
  joinUrl: string,
): Promise<void> {
  // ── Dedup guard ─────────────────────────────────────────────────────────────
  // Prevents a double-send if this function is called twice in the same
  // Vercel invocation (e.g. a bug in the cron loop). Does NOT protect against
  // duplicate invocations — see meetLinkSentSessions comment at the top.
  if (meetLinkSentSessions.has(sessionId)) {
    log.info(
      { sessionId },
      "[Interakt] onMeetLinkGenerated: already notified in this invocation, skipping",
    );
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        product: { select: { type: true, name: true } },
        batch: { select: { name: true } },
        title: true,
      },
    });

    if (!session) {
      log.warn(
        { sessionId },
        "[Interakt] onMeetLinkGenerated: session not found",
      );
      return;
    }

    // Human-readable label for {{2}} in the template (e.g. "Morning Pranayama")
    const sessionLabel =
      session.batch?.name || session.title || session.product.name;

    // Face Yoga sessions → FACE_YOGA + BUNDLE members.
    // Pranayama sessions → PRANAYAMA + BUNDLE members.
    // BUNDLE sessions (if any) → BUNDLE members only.
    const productTypes: string[] =
      session.product.type === "BUNDLE"
        ? ["BUNDLE"]
        : [session.product.type, "BUNDLE"];

    const users = await prisma.user.findMany({
      where: {
        whatsappOptIn: true,
        phone: { not: null },
        memberships: {
          some: {
            status: "ACTIVE",
            plan: {
              product: { type: { in: productTypes as any } },
            },
          },
        },
      },
      select: { name: true, phone: true },
    });

    if (users.length === 0) {
      log.info(
        { sessionId },
        "[Interakt] onMeetLinkGenerated: no eligible users with WhatsApp opt-in",
      );
      meetLinkSentSessions.add(sessionId);
      return;
    }

    // ── Send with concurrency cap ─────────────────────────────────────────────
    const tasks = users.map((user) => async () => {
      const phone = formatPhone(user.phone);
      if (!phone) return null;

      const ok = await sendTemplate({
        phoneNumber: phone.local,
        countryCode: phone.countryCode,
        templateName: TEMPLATES.MEET_LINK_READY,
        bodyValues: [
          firstName(user.name), // {{1}} first name
          sessionLabel,          // {{2}} e.g. "Morning Pranayama"
          joinUrl,               // {{3}} direct Google Meet URL
        ],
      });
      return ok;
    });

    const results = await runConcurrently(tasks, CONCURRENCY);
    const sent    = results.filter((r) => r === true).length;
    const failed  = results.filter((r) => r === false).length;
    const skipped = results.filter((r) => r === null).length;

    // Mark sent BEFORE logging — if log.info somehow throws, we don't re-send.
    meetLinkSentSessions.add(sessionId);

    log.info(
      { sessionId, total: users.length, sent, failed, skipped },
      "[Interakt] onMeetLinkGenerated: complete",
    );
  } catch (err) {
    log.error(
      { err, sessionId },
      "[Interakt] onMeetLinkGenerated threw unexpectedly",
    );
  }
}
