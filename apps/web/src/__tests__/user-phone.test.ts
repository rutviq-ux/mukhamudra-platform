import { describe, expect, it } from "vitest";
import {
  isBlankPhone,
  isPhoneUniqueViolation,
  isValidStoredPhone,
  normalizeStoredPhone,
} from "@/lib/user-phone";

describe("isBlankPhone", () => {
  it("treats null, empty, and placeholder values as blank", () => {
    expect(isBlankPhone(null)).toBe(true);
    expect(isBlankPhone(undefined)).toBe(true);
    expect(isBlankPhone("")).toBe(true);
    expect(isBlankPhone("   ")).toBe(true);
    expect(isBlankPhone("null")).toBe(true);
    expect(isBlankPhone("NULL")).toBe(true);
    expect(isBlankPhone("n/a")).toBe(true);
    expect(isBlankPhone("-")).toBe(true);
  });

  it("keeps real numbers", () => {
    expect(isBlankPhone("+919876543210")).toBe(false);
    expect(isBlankPhone("9876543210")).toBe(false);
  });
});

describe("normalizeStoredPhone", () => {
  it("stores blank and placeholder values as null", () => {
    expect(normalizeStoredPhone(null)).toBeNull();
    expect(normalizeStoredPhone("")).toBeNull();
    expect(normalizeStoredPhone(" null ")).toBeNull();
    expect(normalizeStoredPhone("undefined")).toBeNull();
  });

  it("normalizes Indian numbers to E.164", () => {
    expect(normalizeStoredPhone("9876543210")).toBe("+919876543210");
    expect(normalizeStoredPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeStoredPhone("919876543210")).toBe("+919876543210");
  });
});

describe("isValidStoredPhone", () => {
  it("accepts E.164-shaped numbers", () => {
    expect(isValidStoredPhone("+919876543210")).toBe(true);
    expect(isValidStoredPhone("+91")).toBe(false);
  });
});

describe("isPhoneUniqueViolation", () => {
  it("detects phone unique conflicts from Prisma target shapes", () => {
    expect(
      isPhoneUniqueViolation({ code: "P2002", meta: { target: ["phone"] } }),
    ).toBe(true);
    expect(
      isPhoneUniqueViolation({
        code: "P2002",
        meta: { target: "User_phone_key" },
      }),
    ).toBe(true);
    expect(
      isPhoneUniqueViolation({ code: "P2002", meta: { target: ["email"] } }),
    ).toBe(false);
    expect(isPhoneUniqueViolation(new Error("nope"))).toBe(false);
  });
});
