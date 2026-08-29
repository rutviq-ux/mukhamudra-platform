import { parsePhoneForSheet, type LeadSheetRow } from "@ru/google-workspace";
import { DEFAULT_SHEET_TIMEZONE, formatSheetDate } from "@/lib/build-paid-user-row";

export function buildLeadSheetRow(input: {
  leadId: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  createdAt: Date;
  timezone?: string | null;
}): LeadSheetRow | null {
  const parsedPhone = parsePhoneForSheet(input.phone);
  if (!parsedPhone) return null;

  const timezone = input.timezone?.trim() || DEFAULT_SHEET_TIMEZONE;

  return {
    name: input.name,
    email: input.email ?? "",
    countryCode: parsedPhone.countryCode,
    phone: parsedPhone.nationalNumber,
    source: input.source,
    createdAt: formatSheetDate(input.createdAt, timezone),
    leadId: input.leadId,
  };
}
