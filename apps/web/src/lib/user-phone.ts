import { parsePhoneForSheet } from "@ru/google-workspace/phone";

const PLACEHOLDER_PHONE = /^(null|undefined|n\/a|na|-)$/i;
const E164_PHONE = /^\+?[1-9]\d{6,14}$/;

export function isBlankPhone(phone: string | null | undefined): boolean {
  if (phone == null) return true;
  const compact = phone.replace(/[\s\-()]/g, "").trim();
  return !compact || PLACEHOLDER_PHONE.test(compact);
}

export function normalizeStoredPhone(
  phone: string | null | undefined,
): string | null {
  if (isBlankPhone(phone)) return null;
  const compact = String(phone).replace(/[\s\-()]/g, "").trim();
  const parsed = parsePhoneForSheet(compact);
  if (parsed) {
    return `+${parsed.countryCode}${parsed.nationalNumber}`;
  }
  const digits = compact.startsWith("+")
    ? compact
    : `+${compact.replace(/\D/g, "")}`;
  return digits === "+" ? null : digits;
}

export function isValidStoredPhone(phone: string): boolean {
  return E164_PHONE.test(phone);
}

export function isPhoneUniqueViolation(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    (error as { code: unknown }).code !== "P2002"
  ) {
    return false;
  }
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const parts = Array.isArray(target) ? target : [target];
  return parts.some((part) =>
    String(part ?? "").toLowerCase().includes("phone"),
  );
}
