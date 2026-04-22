import { describe, expect, it } from "vitest";
import type { Coupon } from "@ru/db";
import { calculateCouponDiscount } from "@/lib/coupons";

const baseCoupon: Coupon = {
  id: "coupon_1",
  code: "SAVE10",
  discountType: "PERCENTAGE",
  discountValue: 10,
  minOrderPaise: null,
  maxDiscountPaise: null,
  maxUses: null,
  usedCount: 0,
  validFrom: new Date("2026-01-01T00:00:00Z"),
  validUntil: null,
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("calculateCouponDiscount", () => {
  it("applies percentage discount", () => {
    const result = calculateCouponDiscount(10000, baseCoupon, new Date("2026-02-01T00:00:00Z"));
    expect(result.discountPaise).toBe(1000);
    expect(result.finalAmountPaise).toBe(9000);
    expect(result.applied).toBe(true);
  });

  it("respects max discount", () => {
    const coupon = { ...baseCoupon, maxDiscountPaise: 500 } as Coupon;
    const result = calculateCouponDiscount(10000, coupon, new Date("2026-02-01T00:00:00Z"));
    expect(result.discountPaise).toBe(500);
    expect(result.finalAmountPaise).toBe(9500);
  });

  it("applies fixed discount", () => {
    const coupon = { ...baseCoupon, discountType: "FIXED", discountValue: 1200 } as Coupon;
    const result = calculateCouponDiscount(5000, coupon, new Date("2026-02-01T00:00:00Z"));
    expect(result.discountPaise).toBe(1200);
    expect(result.finalAmountPaise).toBe(3800);
  });

  it("skips expired coupon", () => {
    const coupon = { ...baseCoupon, validUntil: new Date("2026-01-15T00:00:00Z") } as Coupon;
    const result = calculateCouponDiscount(5000, coupon, new Date("2026-02-01T00:00:00Z"));
    expect(result.applied).toBe(false);
    expect(result.discountPaise).toBe(0);
  });

  it("skips coupon when max uses reached", () => {
    const coupon = { ...baseCoupon, maxUses: 1, usedCount: 1 } as Coupon;
    const result = calculateCouponDiscount(5000, coupon, new Date("2026-02-01T00:00:00Z"));
    expect(result.applied).toBe(false);
  });
});
