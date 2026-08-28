import { describe, expect, it } from "vitest";
import {
  buildPaidUserSheetRow,
  isClassMembership,
  deriveSheetStatus,
  deriveBatchLabels,
  deriveCustomerType,
  formatBatchTime,
  formatSheetDate,
  monthlyOverlapsAnnual,
  selectMembershipsForSheet,
} from "@/lib/build-paid-user-row";

const faceAnnual = {
  status: "ACTIVE" as const,
  periodStart: new Date("2026-01-01T00:00:00.000Z"),
  periodEnd: new Date("2027-01-01T00:00:00.000Z"),
  plan: {
    slug: "face-annual",
    name: "Face Yoga Annual",
    interval: "ANNUAL" as const,
    product: { type: "FACE_YOGA" as const },
  },
};

describe("isClassMembership", () => {
  it("excludes recording add-on", () => {
    expect(isClassMembership("recording-addon")).toBe(false);
    expect(isClassMembership("face-annual")).toBe(true);
  });
});

describe("buildPaidUserSheetRow", () => {
  it("returns null when phone is missing or invalid", () => {
    expect(
      buildPaidUserSheetRow({
        userId: "user_1",
        name: "Asha",
        email: "asha@example.com",
        phone: "",
        memberships: [faceAnnual],
        paidAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBeNull();
  });

  it("builds an active row when phone and active membership exist", () => {
    const row = buildPaidUserSheetRow({
      userId: "user_1",
      name: "Asha",
      email: "asha@example.com",
      phone: "+919876543210",
      memberships: [faceAnnual],
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(row).toMatchObject({
      name: "Asha",
      email: "asha@example.com",
      countryCode: "91",
      phone: "9876543210",
      product: "face yoga",
      interval: "annual",
      batch: "",
      timezone: "Asia/Kolkata",
      status: "ACTIVE",
      userId: "user_1",
      periodEnd: "2027-01-01",
    });
    expect(row?.plan).toContain("face-annual");
    expect(row?.customerType).toBe("new");
  });

  it("skips recording-addon-only purchases", () => {
    const row = buildPaidUserSheetRow({
      userId: "user_2",
      name: "Ravi",
      email: "ravi@example.com",
      phone: "+919876543211",
      memberships: [
        {
          status: "ACTIVE",
          periodStart: new Date("2026-01-01T00:00:00.000Z"),
          periodEnd: new Date("2027-01-01T00:00:00.000Z"),
          plan: {
            slug: "recording-addon",
            name: "Recording Access",
            interval: null,
            product: { type: "FACE_YOGA" },
          },
        },
      ],
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(row).toBeNull();
  });

  it("updates period end fields for renewals without changing identity keys", () => {
    const renewed = {
      ...faceAnnual,
      periodEnd: new Date("2028-01-01T00:00:00.000Z"),
    };

    const row = buildPaidUserSheetRow({
      userId: "user_1",
      name: "Asha",
      email: "asha@example.com",
      phone: "+919876543210",
      memberships: [renewed],
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(row?.periodEnd).toBe("2028-01-01");
    expect(row?.phone).toBe("9876543210");
    expect(row?.userId).toBe("user_1");
  });

  it("derives cancelled status for inactive memberships", () => {
    const row = buildPaidUserSheetRow({
      userId: "user_3",
      name: "Meera",
      email: "meera@example.com",
      phone: "+919876543212",
      memberships: [{ ...faceAnnual, status: "CANCELLED" }],
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(row?.status).toBe("CANCELLED");
  });

  it("writes inferred batch labels and the user timezone", () => {
    const row = buildPaidUserSheetRow({
      userId: "user_1",
      name: "Asha",
      email: "asha@example.com",
      phone: "+919876543210",
      timezone: "America/New_York",
      batches: [
        { name: "Evening Batch", startTime: "21:00" },
        { name: "Morning Batch", startTime: "08:00" },
        { name: "Evening Batch", startTime: "21:00" },
      ],
      memberships: [faceAnnual],
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(row?.batch).toBe("Morning Batch (8 AM), Evening Batch (9 PM)");
    expect(row?.timezone).toBe("America/New_York");
  });
});

describe("formatBatchTime / deriveBatchLabels", () => {
  it("formats 24h start times for Interakt", () => {
    expect(formatBatchTime("08:00")).toBe("8 AM");
    expect(formatBatchTime("21:00")).toBe("9 PM");
  });

  it("dedupes and sorts batches by start time", () => {
    expect(
      deriveBatchLabels([
        { name: "Evening Batch", startTime: "21:00" },
        { name: "Morning Batch", startTime: "08:00" },
        { name: "Evening Batch", startTime: "21:00" },
      ]),
    ).toBe("Morning Batch (8 AM), Evening Batch (9 PM)");
  });
});

describe("formatSheetDate", () => {
  it("formats calendar dates in the given timezone", () => {
    const utcMidnight = new Date("2027-01-01T00:00:00.000Z");
    expect(formatSheetDate(utcMidnight, "Asia/Kolkata")).toBe("2027-01-01");
    expect(formatSheetDate(utcMidnight, "America/Los_Angeles")).toBe(
      "2026-12-31",
    );
  });
});

describe("deriveSheetStatus", () => {
  it("prefers ACTIVE over cancelled history", () => {
    expect(
      deriveSheetStatus([
        { ...faceAnnual, status: "CANCELLED" },
        {
          ...faceAnnual,
          plan: { ...faceAnnual.plan, slug: "pranayama-monthly" },
          status: "ACTIVE",
        },
      ]),
    ).toBe("ACTIVE");
  });
});

const faceMonthly = {
  status: "ACTIVE" as const,
  periodStart: new Date("2026-01-01T00:00:00.000Z"),
  periodEnd: new Date("2026-02-01T00:00:00.000Z"),
  plan: {
    slug: "face-monthly",
    name: "Face Yoga Monthly",
    interval: "MONTHLY" as const,
    product: { type: "FACE_YOGA" as const },
  },
};

describe("selectMembershipsForSheet", () => {
  it("drops monthly when annual is active for the same product", () => {
    const selected = selectMembershipsForSheet([faceMonthly, faceAnnual]);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.plan.interval).toBe("ANNUAL");
  });
});

describe("buildPaidUserSheetRow overlapping plans", () => {
  it("prefers annual interval when monthly and annual are both active", () => {
    const row = buildPaidUserSheetRow({
      userId: "user_1",
      name: "Asha",
      email: "asha@example.com",
      phone: "+919876543210",
      memberships: [faceMonthly, faceAnnual],
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
      paidClassOrderCount: 2,
    });

    expect(row?.interval).toBe("annual");
    expect(row?.plan).toContain("face-annual");
    expect(row?.plan).not.toContain("face-monthly");
    expect(row?.customerType).toBe("repeat");
  });
});

describe("deriveCustomerType", () => {
  it("marks a first paid membership as new", () => {
    expect(
      deriveCustomerType({ memberships: [faceAnnual], paidClassOrderCount: 1 }),
    ).toBe("new");
  });

  it("marks prior cancelled memberships as repeat", () => {
    expect(
      deriveCustomerType({
        memberships: [
          { ...faceMonthly, status: "CANCELLED" },
          faceAnnual,
        ],
        paidClassOrderCount: 1,
      }),
    ).toBe("repeat");
  });

  it("marks multiple paid class orders as repeat", () => {
    expect(
      deriveCustomerType({ memberships: [faceAnnual], paidClassOrderCount: 2 }),
    ).toBe("repeat");
  });
});

describe("monthlyOverlapsAnnual", () => {
  it("cancels monthly for the same product or a bundle annual", () => {
    expect(monthlyOverlapsAnnual("FACE_YOGA", "FACE_YOGA")).toBe(true);
    expect(monthlyOverlapsAnnual("PRANAYAMA", "FACE_YOGA")).toBe(false);
    expect(monthlyOverlapsAnnual("FACE_YOGA", "BUNDLE")).toBe(true);
  });
});
