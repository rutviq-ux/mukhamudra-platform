import { describe, expect, it } from "vitest";
import { LEAD_SHEET_HEADERS, PAID_USER_SHEET_HEADERS } from "@ru/google-workspace";

describe("PAID_USER_SHEET_HEADERS", () => {
  it("defines the Babish-facing columns plus internal status keys", () => {
    expect(PAID_USER_SHEET_HEADERS).toEqual([
      "Name",
      "Email",
      "Country Code",
      "Phone",
      "Plan",
      "Product",
      "Interval",
      "Batch",
      "Timezone",
      "Paid At",
      "Period End",
      "Status",
      "User Id",
    ]);
  });
});

describe("LEAD_SHEET_HEADERS", () => {
  it("defines enquiry columns for the Leads tab", () => {
    expect(LEAD_SHEET_HEADERS).toEqual([
      "Name",
      "Email",
      "Country Code",
      "Phone",
      "Source",
      "Created At",
      "Lead Id",
    ]);
  });
});
