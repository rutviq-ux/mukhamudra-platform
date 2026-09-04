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
* Place at packages/notifications/src/interakt.ts (alongside send-whatsapp.ts)
* or apps/web/src/lib/interakt.ts — NOT apps/web/lib/ (no src/).
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
   * e.g. "+91" for India, "+971" for UAE, "+41" for Switzerland.
   * Defaults to "+91" for backwards compatibility, but prefer passing
   * the value from ParsedPhone.countryCode explicitly.
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

/**
 * Result of parsing a raw phone number.
 * Interakt requires the local subscriber digits and country code as two
 * separate fields — this struct carries both.
 */
export interface ParsedPhone {
  /** Local subscriber digits only, no country-code prefix. e.g. "9876543210" */
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
 * Ordered list of [digits-only prefix, E.164 country code] pairs.
 *
 * Order matters: longer (more-specific) prefixes must come before shorter ones
 * that share the same leading digits (e.g. "971" before "9", "44" before "4").
 * "1" and "7" are listed last because they are single-digit prefixes.
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
  ["50", "+50"],  // Guatemala
  ["96", "+96"],  // Gulf fallback
  // ── 1-digit codes ────────────────────────────────────────────────────────
  ["7", "+7"],    // Russia / Kazakhstan
  ["1", "+1"],    // USA / Canada / Caribbean (NANP)
];

/**
 * Parse a raw phone number string into local digits + country code.
 *
 * Interakt requires two separate fields:
 *   phoneNumber = LOCAL subscriber digits only (no country-code prefix)
 *   countryCode = E.164 country code with leading "+" (e.g. "+971")
 *
 * This function handles numbers stored in any common format:
 *   "+91 98765 43210"  → { local: "9876543210",  countryCode: "+91"  }
 *   "919876543210"     → { local: "9876543210",  countryCode: "+91"  }
 *   "+971501291670"    → { local: "501291670",   countryCode: "+971" }
 *   "0041796123456"    → { local: "796123456",   countryCode: "+41"  }
 *   "+12025550123"     → { local: "2025550123",  countryCode: "+1"   }
 *
 * Falls back to "+91" (India) if no country-code prefix is recognised.
 *
 * Returns null for obviously invalid inputs: null, empty, "N/A", "0",
 * or fewer than 7 digits after stripping.
 */
export function formatPhone(raw: string | null | undefined): ParsedPhone | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "N/A" || trimmed === "0") return null;

  let digits = trimmed.replace(/^\+/, "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length < 7) return null;

  for (const [prefix, cc] of CC_PREFIXES) {
    if (digits.startsWith(prefix)) {
      const local = digits.slice(prefix.length);
      if (local.length >= 4) return { local, countryCode: cc };
    }
  }

  return { local: digits, countryCode: "+91" };
}

// ─── API: contact sync ────────────────────────────────────────────────────────

/**
 * Create or update a contact in Interakt CRM.
 *
 * @param phone Parsed phone from formatPhone() — carries local digits + country code
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
        phoneNumber: phone.local,
        countryCode: phone.countryCode,
        traits,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.error(
        { status: res.status, body },
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
 * Returns true on success, false on any error (errors are logged here).
 *
 * @param params See TemplateMessageParams — phoneNumber (LOCAL), templateName, bodyValues, …
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
