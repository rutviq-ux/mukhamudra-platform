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
 * The key value is provided as-is by Interakt (it is already base64 on
 * their end — do NOT base64-encode it again yourself).
 *
 * ENV VARS REQUIRED:
 * INTERAKT_API_KEY — copy from Interakt dashboard → Settings → API keys
 *
 * FILE LOCATION:
 * packages/notifications/src/interakt.ts (alongside send-whatsapp.ts)
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
   * e.g. "9876543210" for India, "501291670" for UAE (+971)
   *
   * Interakt splits phoneNumber (local) and countryCode into two separate
   * fields. Use formatPhone() to produce this safely from any raw DB value.
   */
  phoneNumber: string;
  /**
   * Country calling code WITH the leading +.
   * e.g. "+91" India, "+971" UAE, "+41" Switzerland.
   * Defaults to "+91" — always prefer passing phone.countryCode explicitly.
   */
  countryCode?: string;
  /** Template name exactly as registered in the Interakt dashboard */
  templateName: string;
  /**
   * ISO 639-1 language code — must match what was registered in Interakt.
   * Accepted values: "en", "en_IN", "en_US".
   * Default: "en"
   */
  languageCode?: string;
  /**
   * Ordered substitutions for {{1}}, {{2}}, {{3}} … in the template body.
   * Must match the number of variables in the approved template exactly.
   */
  bodyValues?: string[];
}

/**
 * Result of parsing a raw phone number.
 * Interakt requires local digits and country code as two separate API fields.
 */
export interface ParsedPhone {
  /** Local subscriber digits only — no country-code prefix. e.g. "9876543210" */
  local: string;
  /** E.164 country code WITH leading +. e.g. "+91", "+971", "+41" */
  countryCode: string;
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
 * Ordered list of [digit-prefix, E.164-code] pairs used to detect which
 * country code is embedded in a stored phone number.
 *
 * Rules:
 * • 3-digit codes are listed before 2-digit codes, and 2-digit before 1-digit.
 *   This ensures the longest (most-specific) match wins when prefixes overlap
 *   (e.g. "971" UAE matches before "9" would, "44" UK before "4").
 * • Invalid or ambiguous 2-digit codes (e.g. "+50", "+96") are NOT included —
 *   all Gulf states are already covered by precise 3-digit codes.
 */
const CC_PREFIXES: Array<[string, string]> = [
  // ── 3-digit codes ────────────────────────────────────────────────────────
  ["971", "+971"], // UAE
  ["972", "+972"], // Israel
  ["973", "+973"], // Bahrain
  ["974", "+974"], // Qatar
  ["975", "+975"], // Bhutan
  ["976", "+976"], // Mongolia
  ["977", "+977"], // Nepal
  ["966", "+966"], // Saudi Arabia
  ["965", "+965"], // Kuwait
  ["968", "+968"], // Oman
  ["962", "+962"], // Jordan
  ["961", "+961"], // Lebanon
  ["963", "+963"], // Syria
  ["964", "+964"], // Iraq
  ["967", "+967"], // Yemen
  ["420", "+420"], // Czech Republic
  ["353", "+353"], // Ireland
  ["358", "+358"], // Finland
  ["370", "+370"], // Lithuania
  ["371", "+371"], // Latvia
  ["372", "+372"], // Estonia
  ["380", "+380"], // Ukraine
  ["852", "+852"], // Hong Kong
  ["853", "+853"], // Macau
  ["855", "+855"], // Cambodia
  ["856", "+856"], // Laos
  ["880", "+880"], // Bangladesh
  ["886", "+886"], // Taiwan
  ["960", "+960"], // Maldives
  ["992", "+992"], // Tajikistan
  ["993", "+993"], // Turkmenistan
  ["994", "+994"], // Azerbaijan
  ["995", "+995"], // Georgia
  ["996", "+996"], // Kyrgyzstan
  ["998", "+998"], // Uzbekistan
  // ── 2-digit codes ────────────────────────────────────────────────────────
  ["91", "+91"],  // India
  ["44", "+44"],  // UK
  ["49", "+49"],  // Germany
  ["61", "+61"],  // Australia
  ["81", "+81"],  // Japan
  ["82", "+82"],  // South Korea
  ["86", "+86"],  // China
  ["33", "+33"],  // France
  ["34", "+34"],  // Spain
  ["39", "+39"],  // Italy
  ["41", "+41"],  // Switzerland
  ["43", "+43"],  // Austria
  ["45", "+45"],  // Denmark
  ["46", "+46"],  // Sweden
  ["47", "+47"],  // Norway
  ["48", "+48"],  // Poland
  ["51", "+51"],  // Peru
  ["52", "+52"],  // Mexico
  ["53", "+53"],  // Cuba
  ["54", "+54"],  // Argentina
  ["55", "+55"],  // Brazil
  ["56", "+56"],  // Chile
  ["57", "+57"],  // Colombia
  ["58", "+58"],  // Venezuela
  ["60", "+60"],  // Malaysia
  ["62", "+62"],  // Indonesia
  ["63", "+63"],  // Philippines
  ["64", "+64"],  // New Zealand
  ["65", "+65"],  // Singapore
  ["66", "+66"],  // Thailand
  ["84", "+84"],  // Vietnam
  ["90", "+90"],  // Turkey
  ["92", "+92"],  // Pakistan
  ["93", "+93"],  // Afghanistan
  ["94", "+94"],  // Sri Lanka
  ["95", "+95"],  // Myanmar
  ["98", "+98"],  // Iran
  ["20", "+20"],  // Egypt
  ["27", "+27"],  // South Africa
  ["30", "+30"],  // Greece
  ["31", "+31"],  // Netherlands
  ["32", "+32"],  // Belgium
  ["36", "+36"],  // Hungary
  ["40", "+40"],  // Romania
  // ── 1-digit codes ────────────────────────────────────────────────────────
  ["7", "+7"],    // Russia / Kazakhstan
  ["1", "+1"],    // USA / Canada / Caribbean (NANP)
];

/**
 * Parse a raw phone number into { local, countryCode } for Interakt.
 *
 * Interakt requires two separate API fields:
 *   phoneNumber = local subscriber digits only (no country-code prefix)
 *   countryCode = E.164 code with leading "+" (e.g. "+971")
 *
 * Handles any common storage format:
 *   "+91 98765 43210"  → { local: "9876543210",  countryCode: "+91"  }
 *   "919876543210"     → { local: "9876543210",  countryCode: "+91"  }
 *   "+971501291670"    → { local: "501291670",   countryCode: "+971" }
 *   "0041796123456"    → { local: "796123456",   countryCode: "+41"  }
 *   "+12025550123"     → { local: "2025550123",  countryCode: "+1"   }
 *   "9876543210"       → { local: "9876543210",  countryCode: "+91"  } ← India fallback
 *
 * ⚠ COUNTRY-CODE DETECTION GUARD:
 * CC_PREFIXES lookup is only attempted on numbers with 11+ digits.
 * Indian local numbers are exactly 10 digits — without this guard, "9876543210"
 * would incorrectly match "+98" (Iran), "9012345678" would match "+90" (Turkey),
 * etc. Any number with a real country-code prefix is always ≥ 11 digits
 * (+41 + 9-digit local = 11, +1 + 10-digit local = 11, +91 + 10-digit local = 12).
 *
 * Falls back to "+91" (India) if no prefix is detected — correct for Indian
 * members who stored a plain 10-digit number.
 *
 * Returns null for invalid inputs: null, empty, "N/A", "0", or < 7 digits.
 */
export function formatPhone(raw: string | null | undefined): ParsedPhone | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "N/A" || trimmed === "0") return null;

  // Strip leading "+" and all non-digits.
  // Handle "00" international trunk prefix (e.g. "0041..." → "41...").
  let digits = trimmed.replace(/^\+/, "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length < 7) return null;

  // Only try CC prefix matching if the number is long enough to include a country code.
  // 10-digit numbers are almost certainly plain Indian local numbers — skip the lookup
  // to avoid mismatching them against "+98" (Iran), "+90" (Turkey), "+92" (Pakistan), etc.
  if (digits.length >= 11) {
    for (const [prefix, cc] of CC_PREFIXES) {
      if (digits.startsWith(prefix)) {
        const local = digits.slice(prefix.length);
        if (local.length >= 4) return { local, countryCode: cc };
      }
    }
  }

  // Fallback: assume India (+91).
  // Correctly handles plain 10-digit Indian numbers stored without a prefix.
  return { local: digits, countryCode: "+91" };
}

// ─── API: contact sync ────────────────────────────────────────────────────────

/**
 * Create or update a contact in Interakt CRM.
 *
 * Interakt uses phoneNumber as the unique key — calling this with the same
 * number updates the contact's traits (idempotent).
 *
 * Errors are logged but NOT re-thrown. A CRM-sync failure must never crash
 * the payment webhook that calls this function.
 *
 * ⚠ CALLERS: always await this on Vercel — never fire-and-forget.
 * The inner try/catch makes it safe to await without crashing callers.
 *
 * @param phone  Result of formatPhone() — carries local digits + country code
 * @param traits Attributes to set on the contact (merged, not replaced)
 */
export async function upsertContact(
  phone: ParsedPhone,
  traits: InteraktContactTraits,
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/public/track/users/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        phoneNumber: phone.local,        // local digits only — e.g. "9876543210"
        countryCode: phone.countryCode,  // e.g. "+91", "+971", "+41"
        traits,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.error(
        { status: res.status, body, phone: phone.countryCode + phone.local },
        "[Interakt] upsertContact failed",
      );
    }
  } catch (err) {
    log.error({ err }, "[Interakt] upsertContact network error");
  }
}

// ─── API: template message ────────────────────────────────────────────────────

/**
 * Send a pre-approved WhatsApp template message via Interakt.
 *
 * Template names must be registered AND Meta-approved in the Interakt
 * dashboard. A 400/403 usually means template name mismatch, not yet
 * approved, or languageCode doesn't match registration.
 *
 * Returns true on success, false on any error (errors are logged, not thrown).
 *
 * ⚠ CALLERS: always await on Vercel — never fire-and-forget.
 *
 * @param params See TemplateMessageParams
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
    phoneNumber,
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
        "[Interakt] sendTemplate failed",
      );
      return false;
    }
    return true;
  } catch (err) {
    log.error({ err, templateName }, "[Interakt] sendTemplate network error");
    return false;
  }
}
