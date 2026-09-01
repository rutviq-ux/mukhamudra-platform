/**
 * Interakt WhatsApp Business API — raw client
 *
 * Interakt is a WhatsApp BSP (Business Service Provider) that sits in front
 * of Meta's Business API and adds CRM, automation, and analytics tooling.
 * Haripriya manages templates and automations on the Interakt dashboard side;
 * this file is the backend's side of that integration.
 *
 * Docs: https://developers.interakt.ai/
 *
 * Auth: `Authorization: Basic <INTERAKT_API_KEY>`
 *   The key value is provided as-is by Interakt (it is already base64 on
 *   their end — do NOT base64-encode it again yourself).
 *
 * ENV VARS REQUIRED:
 *   INTERAKT_API_KEY  — copy from Interakt dashboard → Settings → API keys
 *
 * FILE LOCATION:
 *   Place at packages/notifications/src/interakt.ts (alongside send-whatsapp.ts)
 *   or apps/web/src/lib/interakt.ts — NOT apps/web/lib/ (no src/).
 */

import { createLogger } from "@ru/config";

const BASE_URL = "https://api.interakt.ai/v1";
const log = createLogger("interakt");

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Traits (custom attributes) attached to an Interakt contact.
 * These appear in the Interakt CRM and can trigger automations
 * that Haripriya sets up in the Interakt dashboard.
 */
export interface InteraktContactTraits {
  name?: string;
  email?: string;
  /** Human-readable plan label e.g. "Face Yoga Annual" */
  plan?: string;
  /** Plan slug e.g. "face-annual" — useful for filtering in Interakt segments */
  planSlug?: string;
  /** Machine-readable subscription state */
  subscriptionStatus?: "active" | "cancelled" | "expired" | "pending";
  [key: string]: string | number | boolean | undefined;
}

export interface TemplateMessageParams {
  /**
   * LOCAL subscriber number — digits only, NO country-code prefix.
   * e.g. "9876543210"  (NOT "919876543210")
   *
   * Interakt splits phoneNumber (local) and countryCode ("+91") into two
   * separate fields. Sending the country-code prefix in phoneNumber too
   * would result in +91 919876543210 — wrong.
   *
   * Use formatPhone() to produce this from whatever is stored in the DB.
   */
  phoneNumber: string;
  /**
   * Country calling code WITH the leading +.
   * Interakt needs this as a separate field.
   * Defaults to "+91" (all Mukha Mudra users are Indian).
   */
  countryCode?: string;
  /** Template name exactly as registered in the Interakt dashboard */
  templateName: string;
  /**
   * ISO 639-1 language code — must match what was registered in Interakt.
   * Accepted values: "en", "en_IN", "en_US".
   * A mismatch here causes every template call to return 400.
   * Default: "en" — confirm this matches registration before first deploy.
   */
  languageCode?: string;
  /**
   * Ordered substitutions for {{1}}, {{2}}, {{3}} … in the template body.
   * Must match the number of variables in the approved template exactly.
   */
  bodyValues?: string[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  const key = process.env.INTERAKT_API_KEY;
  if (!key) {
    throw new Error(
      "[Interakt] INTERAKT_API_KEY env var is not set. " +
        "Add it to Vercel → Project → Environment Variables.",
    );
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${key}`,
  };
}

// ─── Phone formatting ─────────────────────────────────────────────────────────

/**
 * Normalise a phone number for use in Interakt API calls.
 *
 * Interakt splits the number into two separate fields:
 *   phoneNumber  = LOCAL subscriber digits only, no country-code prefix
 *   countryCode  = "+91" (separate)
 *
 * This function returns the LOCAL part only (e.g. "9876543210").
 * The caller passes countryCode separately — see upsertContact / sendTemplate.
 *
 * Rules applied here:
 *   • Strip all non-digit characters.
 *   • If the result starts with "91" and is ≥ 12 digits → strip the "91" prefix.
 *   • Return null for obviously invalid inputs (null, empty, "N/A", "0",
 *     or fewer than 7 digits after stripping).
 *
 * @example
 *   formatPhone("+91 98765 43210") → "9876543210"   ✓
 *   formatPhone("919876543210")    → "9876543210"   ✓ (DB-stored format)
 *   formatPhone("9876543210")      → "9876543210"   ✓
 *   formatPhone(null)              → null
 */
export function formatPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "N/A" || trimmed === "0") return null;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;

  // Strip the 91 country-code prefix → return the local subscriber number.
  // DB stores "+919876543210" (12 digits with prefix). Interakt needs only
  // the local part "9876543210" (10 digits) when countryCode is sent separately.
  if (digits.startsWith("91") && digits.length >= 12) {
    return digits.slice(2); // "919876543210" → "9876543210"
  }

  return digits;
}

// ─── API: contact sync ────────────────────────────────────────────────────────

/**
 * Create or update a contact in Interakt CRM.
 *
 * Interakt uses phoneNumber as the unique key. Calling this with the same
 * number updates the contact's traits. This is safe to call on every
 * subscription event — Interakt upsert is idempotent.
 *
 * Errors are logged but NOT re-thrown. A CRM-sync failure must never crash
 * the payment webhook that calls this function.
 *
 * ⚠ CALLERS: do NOT fire-and-forget this on Vercel. Await it inside a
 *   try/catch, or the runtime may freeze before the HTTP call completes.
 *   The inner try/catch here makes it safe to await without crashing callers.
 *
 * @param phone   LOCAL phone number from formatPhone() — digits only, NO 91 prefix
 * @param traits  Attributes to set on the contact (merged, not replaced)
 */
export async function upsertContact(
  phone: string,
  traits: InteraktContactTraits,
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/public/track/users/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        phoneNumber: phone,   // LOCAL only — e.g. "9876543210"
        countryCode: "+91",   // separate field as Interakt requires
        traits,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.error(
        { status: res.status, body },
        "[Interakt] upsertContact failed",
      );
      // Non-fatal — CRM sync failure should not block the calling webhook
    }
  } catch (err) {
    log.error({ err }, "[Interakt] upsertContact network error");
  }
}

// ─── API: template message ────────────────────────────────────────────────────

/**
 * Send a pre-approved WhatsApp template message via Interakt.
 *
 * Template names must be registered AND Meta-approved inside the Interakt
 * dashboard before this will work. A 400/403 from Interakt usually means
 * the template name doesn't match, hasn't been approved yet, or languageCode
 * doesn't match what was registered.
 *
 * Returns true on success, false on any error (errors are logged here).
 *
 * ⚠ CALLERS: do NOT fire-and-forget this on Vercel. Await it inside a
 *   try/catch — this function catches its own errors and never re-throws.
 *
 * @param params  See TemplateMessageParams — phoneNumber (LOCAL), templateName, bodyValues, …
 */
export async function sendTemplate(params: TemplateMessageParams): Promise<boolean> {
  const {
    phoneNumber,
    countryCode = "+91",
    templateName,
    languageCode = "en",
    bodyValues = [],
  } = params;

  const payload = {
    countryCode,
    phoneNumber,  // LOCAL digits only — e.g. "9876543210"
    type: "Template",
    template: {
      name: templateName,
      languageCode,
      ...(bodyValues.length > 0 && { bodyValues }),
    },
  };

  try {
    const res = await fetch(`${BASE_URL}/public/message/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.error(
        { templateName, status: res.status, body },
        `[Interakt] sendTemplate failed`,
      );
      return false;
    }
    return true;
  } catch (err) {
    log.error(
      { err, templateName },
      `[Interakt] sendTemplate network error`,
    );
    return false;
  }
}
