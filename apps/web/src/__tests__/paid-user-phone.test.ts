import { describe, expect, it } from "vitest";
import { parsePhoneForSheet } from "@ru/google-workspace";

describe("parsePhoneForSheet", () => {
  it("parses +91 E.164 numbers", () => {
    expect(parsePhoneForSheet("+919876543210")).toEqual({
      countryCode: "91",
      nationalNumber: "9876543210",
    });
  });

  it("parses 91 prefix without plus", () => {
    expect(parsePhoneForSheet("919876543210")).toEqual({
      countryCode: "91",
      nationalNumber: "9876543210",
    });
  });

  it("parses 10-digit Indian local numbers", () => {
    expect(parsePhoneForSheet("9876543210")).toEqual({
      countryCode: "91",
      nationalNumber: "9876543210",
    });
  });

  it("returns null for invalid numbers", () => {
    expect(parsePhoneForSheet("")).toBeNull();
    expect(parsePhoneForSheet("abc")).toBeNull();
    expect(parsePhoneForSheet("+1")).toBeNull();
  });
});
