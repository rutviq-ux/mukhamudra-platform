export function parsePhoneForSheet(
  phone: string,
): { countryCode: string; nationalNumber: string } | null {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (!cleaned) return null;

  const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return { countryCode: "91", nationalNumber: digits.slice(2) };
  }

  if (/^1\d{10}$/.test(digits)) {
    return { countryCode: "1", nationalNumber: digits.slice(1) };
  }

  if (cleaned.startsWith("+")) {
    const match = digits.match(/^(\d{2,3})(\d{4,14})$/);
    const countryCode = match?.[1];
    const nationalNumber = match?.[2];
    if (!countryCode || !nationalNumber) return null;
    return { countryCode, nationalNumber };
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return { countryCode: "91", nationalNumber: digits };
  }

  return null;
}
