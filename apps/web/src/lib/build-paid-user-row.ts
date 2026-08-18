import type {
  PaidUserSheetRow,
  PaidUserSheetStatus,
} from "@ru/google-workspace";
import { parsePhoneForSheet } from "@ru/google-workspace";

export const RECORDING_ADDON_SLUG = "recording-addon";

type PlanInterval = "MONTHLY" | "ANNUAL";
type ProductType = "FACE_YOGA" | "PRANAYAMA" | "BUNDLE";

type MembershipWithPlan = {
  status: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  plan: {
    slug: string;
    name: string;
    interval: PlanInterval | null;
    product: { type: ProductType };
  };
};

export function isClassMembership(planSlug: string): boolean {
  return planSlug !== RECORDING_ADDON_SLUG;
}

export function formatProductLabel(type: ProductType): string {
  switch (type) {
    case "FACE_YOGA":
      return "face yoga";
    case "PRANAYAMA":
      return "pranayama";
    case "BUNDLE":
      return "bundle";
  }
}

export function formatIntervalLabel(interval: PlanInterval | null): string {
  if (!interval) return "";
  return interval === "ANNUAL" ? "annual" : "monthly";
}

export const DEFAULT_SHEET_TIMEZONE = "Asia/Kolkata";

export function formatSheetDate(
  date: Date | null | undefined,
  timeZone = DEFAULT_SHEET_TIMEZONE,
): string {
  if (!date) return "";
  return date.toLocaleDateString("en-CA", { timeZone });
}

export type BatchForSheet = {
  name: string;
  startTime: string;
};

/** Format batch startTime "21:00" → "9 PM" */
export function formatBatchTime(startTime: string): string {
  const [hStr] = startTime.split(":");
  const hour = Number.parseInt(hStr ?? "0", 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}

export function formatBatchLabel(batch: BatchForSheet): string {
  return `${batch.name} (${formatBatchTime(batch.startTime)})`;
}

export function deriveBatchLabels(batches: BatchForSheet[]): string {
  const unique = new Map<string, BatchForSheet>();
  for (const batch of batches) {
    unique.set(`${batch.name}|${batch.startTime}`, batch);
  }

  return [...unique.values()]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(formatBatchLabel)
    .join(", ");
}

export function deriveSheetStatus(
  memberships: MembershipWithPlan[],
): PaidUserSheetStatus | null {
  const classMemberships = memberships.filter((m) =>
    isClassMembership(m.plan.slug),
  );
  if (classMemberships.length === 0) return null;

  if (classMemberships.some((m) => m.status === "ACTIVE")) return "ACTIVE";
  if (classMemberships.some((m) => m.status === "CANCELLED")) {
    return "CANCELLED";
  }
  if (classMemberships.some((m) => m.status === "EXPIRED")) return "EXPIRED";
  return null;
}

export function buildPaidUserSheetRow(input: {
  userId: string;
  name: string | null;
  email: string;
  phone: string;
  timezone?: string | null;
  batches?: BatchForSheet[];
  memberships: MembershipWithPlan[];
  paidAt: Date | null;
}): PaidUserSheetRow | null {
  const parsedPhone = parsePhoneForSheet(input.phone);
  if (!parsedPhone) return null;

  const timezone = input.timezone?.trim() || DEFAULT_SHEET_TIMEZONE;
  const batch = deriveBatchLabels(input.batches ?? []);

  const activeClassMemberships = input.memberships.filter(
    (m) => m.status === "ACTIVE" && isClassMembership(m.plan.slug),
  );

  const sheetStatus = deriveSheetStatus(input.memberships);
  if (!sheetStatus) return null;

  if (activeClassMemberships.length === 0 && sheetStatus !== "ACTIVE") {
    const latestMembership = input.memberships
      .filter((m) => isClassMembership(m.plan.slug))
      .sort((a, b) => {
        const aTime = a.periodEnd?.getTime() ?? 0;
        const bTime = b.periodEnd?.getTime() ?? 0;
        return bTime - aTime;
      })[0];

    if (!latestMembership) return null;

    return {
      name: input.name ?? "",
      email: input.email,
      countryCode: parsedPhone.countryCode,
      phone: parsedPhone.nationalNumber,
      plan: `${latestMembership.plan.slug} (${latestMembership.plan.name})`,
      product: formatProductLabel(latestMembership.plan.product.type),
      interval: formatIntervalLabel(latestMembership.plan.interval),
      batch,
      timezone,
      paidAt: formatSheetDate(
        input.paidAt ?? latestMembership.periodStart ?? null,
        timezone,
      ),
      periodEnd: formatSheetDate(latestMembership.periodEnd, timezone),
      status: sheetStatus,
      userId: input.userId,
    };
  }

  if (activeClassMemberships.length === 0) return null;

  const plans = activeClassMemberships.map(
    (m) => `${m.plan.slug} (${m.plan.name})`,
  );
  const products = [
    ...new Set(
      activeClassMemberships.map((m) =>
        formatProductLabel(m.plan.product.type),
      ),
    ),
  ];
  const intervals = [
    ...new Set(
      activeClassMemberships
        .map((m) => formatIntervalLabel(m.plan.interval))
        .filter(Boolean),
    ),
  ];
  const periodEnds = activeClassMemberships
    .map((m) => m.periodEnd)
    .filter((d): d is Date => d instanceof Date);
  const periodStartFallback = activeClassMemberships
    .map((m) => m.periodStart)
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const latestPeriodEnd =
    periodEnds.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    name: input.name ?? "",
    email: input.email,
    countryCode: parsedPhone.countryCode,
    phone: parsedPhone.nationalNumber,
    plan: plans.join(", "),
    product: products.join(", "),
    interval: intervals.join(", "),
    batch,
    timezone,
    paidAt: formatSheetDate(input.paidAt ?? periodStartFallback ?? null, timezone),
    periodEnd: formatSheetDate(latestPeriodEnd, timezone),
    status: "ACTIVE",
    userId: input.userId,
  };
}
