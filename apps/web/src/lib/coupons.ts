import type { Coupon } from "@ru/db";

interface DiscountResult {
  applied: boolean;
  discountPaise: number;
  finalAmountPaise: number;
}

export function calculateCouponDiscount(
  amountPaise: number,
  coupon: Coupon | null,
  now: Date = new Date()
): DiscountResult {
  if (!coupon) {
    return { applied: false, discountPaise: 0, finalAmountPaise: amountPaise };
  }

  if (!coupon.isActive) {
    return { applied: false, discountPaise: 0, finalAmountPaise: amountPaise };
  }

  if (coupon.validFrom && coupon.validFrom > now) {
    return { applied: false, discountPaise: 0, finalAmountPaise: amountPaise };
  }

  if (coupon.validUntil && coupon.validUntil <= now) {
    return { applied: false, discountPaise: 0, finalAmountPaise: amountPaise };
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { applied: false, discountPaise: 0, finalAmountPaise: amountPaise };
  }

  if (coupon.minOrderPaise && amountPaise < coupon.minOrderPaise) {
    return { applied: false, discountPaise: 0, finalAmountPaise: amountPaise };
  }

  let discountPaise = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discountPaise = Math.floor((amountPaise * coupon.discountValue) / 100);
    if (coupon.maxDiscountPaise) {
      discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
    }
  } else {
    discountPaise = coupon.discountValue;
  }

  discountPaise = Math.min(discountPaise, amountPaise);
  return {
    applied: discountPaise > 0,
    discountPaise,
    finalAmountPaise: amountPaise - discountPaise,
  };
}
