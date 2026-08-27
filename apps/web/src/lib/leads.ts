import { parsePhoneForSheet } from "@ru/google-workspace";

export interface LeadRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  createdAt: Date;
}

export interface GroupedLead {
  key: string;
  latestId: string;
  name: string;
  email: string | null;
  phone: string;
  sources: string[];
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

export function leadPhoneKey(phone: string): string {
  const parsed = parsePhoneForSheet(phone);
  if (parsed) {
    return `${parsed.countryCode}${parsed.nationalNumber}`;
  }
  return phone.replace(/\D/g, "") || phone.trim();
}

export function leadPhoneVariants(phone: string): string[] {
  const variants = new Set<string>();
  const trimmed = phone.trim();
  if (trimmed) variants.add(trimmed);

  const digits = trimmed.replace(/\D/g, "");
  if (digits) variants.add(digits);

  const parsed = parsePhoneForSheet(phone);
  if (parsed) {
    variants.add(`+${parsed.countryCode}${parsed.nationalNumber}`);
    variants.add(`${parsed.countryCode}${parsed.nationalNumber}`);
    variants.add(parsed.nationalNumber);
  }

  return [...variants];
}

export function normalizeLeadPhone(phone: string): string {
  const parsed = parsePhoneForSheet(phone);
  if (parsed) {
    return `+${parsed.countryCode}${parsed.nationalNumber}`;
  }
  const trimmed = phone.trim();
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/\D/g, "")}`;
}

export function groupLeadsByPhone(leads: LeadRecord[]): GroupedLead[] {
  const buckets = new Map<string, LeadRecord[]>();

  for (const lead of leads) {
    const key = leadPhoneKey(lead.phone) || lead.id;
    const list = buckets.get(key);
    if (list) {
      list.push(lead);
    } else {
      buckets.set(key, [lead]);
    }
  }

  return [...buckets.values()]
    .map((rows) => {
      const sorted = [...rows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const latest = sorted[0]!;
      const oldest = sorted[sorted.length - 1]!;
      const email =
        sorted.find((row) => row.email && row.email.trim())?.email ?? null;

      return {
        key: leadPhoneKey(latest.phone) || latest.id,
        latestId: latest.id,
        name: latest.name,
        email,
        phone: latest.phone,
        sources: [...new Set(rows.map((row) => row.source))],
        count: rows.length,
        firstSeen: oldest.createdAt,
        lastSeen: latest.createdAt,
      };
    })
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
}

export function phonesOverlap(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  const leftKey = leadPhoneKey(left);
  const rightKey = leadPhoneKey(right);
  return leftKey.length > 0 && leftKey === rightKey;
}
