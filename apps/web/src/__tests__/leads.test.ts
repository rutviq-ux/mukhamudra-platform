import { describe, expect, it } from "vitest";
import {
  groupLeadsByPhone,
  leadPhoneKey,
  leadPhoneVariants,
  normalizeLeadPhone,
  phonesOverlap,
  type LeadRecord,
} from "@/lib/leads";

function lead(
  overrides: Partial<LeadRecord> & Pick<LeadRecord, "id" | "phone">,
): LeadRecord {
  return {
    name: "Asha",
    email: null,
    source: "popup",
    createdAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

describe("leadPhoneKey", () => {
  it("collapses Indian number formats", () => {
    expect(leadPhoneKey("+919876543210")).toBe("919876543210");
    expect(leadPhoneKey("919876543210")).toBe("919876543210");
    expect(leadPhoneKey("9876543210")).toBe("919876543210");
  });
});

describe("leadPhoneVariants", () => {
  it("includes plus, country, and national forms", () => {
    const variants = leadPhoneVariants("+919876543210");
    expect(variants).toEqual(
      expect.arrayContaining([
        "+919876543210",
        "919876543210",
        "9876543210",
      ]),
    );
  });
});

describe("normalizeLeadPhone", () => {
  it("stores E.164", () => {
    expect(normalizeLeadPhone("9876543210")).toBe("+919876543210");
    expect(normalizeLeadPhone("+919876543210")).toBe("+919876543210");
  });
});

describe("phonesOverlap", () => {
  it("matches equivalent numbers", () => {
    expect(phonesOverlap("+919876543210", "9876543210")).toBe(true);
    expect(phonesOverlap("+919876543210", "+918888888888")).toBe(false);
    expect(phonesOverlap(null, "9876543210")).toBe(false);
  });
});

describe("groupLeadsByPhone", () => {
  it("merges the same person across days and formats", () => {
    const grouped = groupLeadsByPhone([
      lead({
        id: "1",
        phone: "+919876543210",
        createdAt: new Date("2026-08-01T10:00:00Z"),
      }),
      lead({
        id: "2",
        name: "Asha K",
        phone: "9876543210",
        source: "trial",
        createdAt: new Date("2026-08-20T10:00:00Z"),
      }),
      lead({
        id: "3",
        name: "Ravi",
        phone: "+918888888888",
        createdAt: new Date("2026-08-21T10:00:00Z"),
      }),
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.phone).toBe("+918888888888");
    expect(grouped[1]?.count).toBe(2);
    expect(grouped[1]?.name).toBe("Asha K");
    expect(grouped[1]?.sources).toEqual(["popup", "trial"]);
  });
});
