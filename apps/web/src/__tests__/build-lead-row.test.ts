import { describe, expect, it } from "vitest";
import { buildLeadSheetRow } from "@/lib/build-lead-row";

describe("buildLeadSheetRow", () => {
  it("splits an Indian mobile into country code and national number", () => {
    const row = buildLeadSheetRow({
      leadId: "lead_1",
      name: "Asha",
      email: "asha@example.com",
      phone: "+919876543210",
      source: "popup",
      createdAt: new Date("2026-08-20T10:00:00.000Z"),
    });

    expect(row).toEqual({
      name: "Asha",
      email: "asha@example.com",
      countryCode: "91",
      phone: "9876543210",
      source: "popup",
      createdAt: "2026-08-20",
      leadId: "lead_1",
    });
  });

  it("skips rows without a parseable phone", () => {
    expect(
      buildLeadSheetRow({
        leadId: "lead_2",
        name: "Asha",
        email: null,
        phone: "not-a-phone",
        source: "trial",
        createdAt: new Date("2026-08-20T10:00:00.000Z"),
      }),
    ).toBeNull();
  });
});
