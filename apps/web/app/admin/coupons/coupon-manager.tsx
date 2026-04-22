"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { couponSchema, type CouponInput } from "@ru/config";

type CouponFormValues = z.input<typeof couponSchema>;
import { createCoupon, updateCoupon, deleteCoupon } from "./actions";
import { toast } from "@/hooks/use-toast";
import { Button, Input, Label } from "@ru/ui";

interface Coupon {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderPaise: number | null;
  maxDiscountPaise: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  _count: { orders: number };
}

interface CouponManagerProps {
  coupons: Coupon[];
}

export function CouponManager({ coupons }: CouponManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderPaise: null,
      maxDiscountPaise: null,
      maxUses: null,
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: null,
      isActive: true,
    },
  });

  function startCreate() {
    form.reset({
      code: "",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderPaise: null,
      maxDiscountPaise: null,
      maxUses: null,
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: null,
      isActive: true,
    });
    setEditing("new");
  }

  function startEdit(coupon: Coupon) {
    form.reset({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderPaise: coupon.minOrderPaise,
      maxDiscountPaise: coupon.maxDiscountPaise,
      maxUses: coupon.maxUses,
      validFrom: new Date(coupon.validFrom).toISOString().split("T")[0],
      validUntil: coupon.validUntil
        ? new Date(coupon.validUntil).toISOString().split("T")[0]
        : null,
      isActive: coupon.isActive,
    });
    setEditing(coupon.id);
  }

  function cancel() {
    setEditing(null);
  }

  function onSubmit(data: CouponFormValues) {
    startTransition(async () => {
      const result =
        editing === "new"
          ? await createCoupon(data)
          : await updateCoupon({ id: editing!, ...data });

      if (result.success) {
        toast({ title: editing === "new" ? "Coupon created" : "Coupon updated" });
        router.refresh();
        setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof CouponInput, { message: msgs[0] });
          }
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    setDeleting(id);
    startTransition(async () => {
      const result = await deleteCoupon({ id });

      if (result.success) {
        if (result.data.deactivated) {
          toast({
            title: "Coupon deactivated",
            description: "Coupon has been used and was deactivated instead.",
          });
        } else {
          toast({ title: "Coupon deleted" });
        }
        router.refresh();
        if (editing === id) setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
      }

      setDeleting(null);
    });
  }

  function formatDiscount(coupon: Coupon) {
    if (coupon.discountType === "PERCENTAGE") {
      return `${coupon.discountValue}%`;
    }
    return `\u20B9${(coupon.discountValue / 100).toLocaleString("en-IN")}`;
  }

  const discountType = form.watch("discountType");

  if (editing) {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="coupon-code">Code</Label>
            <Input
              id="coupon-code"
              {...form.register("code")}
              placeholder="e.g. WELCOME10"
            />
            {form.formState.errors.code && (
              <p className="text-xs text-destructive">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-type">Discount Type</Label>
            <select
              id="coupon-type"
              value={discountType}
              onChange={(e) =>
                form.setValue("discountType", e.target.value as "PERCENTAGE" | "FIXED")
              }
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed (paise)</option>
            </select>
            {form.formState.errors.discountType && (
              <p className="text-xs text-destructive">
                {form.formState.errors.discountType.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="coupon-value">
              {discountType === "PERCENTAGE"
                ? "Discount %"
                : "Discount (paise)"}
            </Label>
            <Input
              id="coupon-value"
              type="number"
              {...form.register("discountValue", { valueAsNumber: true })}
              min={1}
              max={discountType === "PERCENTAGE" ? 100 : undefined}
            />
            {form.formState.errors.discountValue && (
              <p className="text-xs text-destructive">
                {form.formState.errors.discountValue.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-min">Min Order (paise)</Label>
            <Input
              id="coupon-min"
              type="number"
              {...form.register("minOrderPaise", { valueAsNumber: true })}
              placeholder="Optional"
            />
            {form.formState.errors.minOrderPaise && (
              <p className="text-xs text-destructive">
                {form.formState.errors.minOrderPaise.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-max-discount">Max Discount (paise)</Label>
            <Input
              id="coupon-max-discount"
              type="number"
              {...form.register("maxDiscountPaise", { valueAsNumber: true })}
              placeholder="Optional"
            />
            {form.formState.errors.maxDiscountPaise && (
              <p className="text-xs text-destructive">
                {form.formState.errors.maxDiscountPaise.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="coupon-max-uses">Max Uses</Label>
            <Input
              id="coupon-max-uses"
              type="number"
              {...form.register("maxUses", { valueAsNumber: true })}
              placeholder="Unlimited"
              min={1}
            />
            {form.formState.errors.maxUses && (
              <p className="text-xs text-destructive">
                {form.formState.errors.maxUses.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-from">Valid From</Label>
            <Input
              id="coupon-from"
              type="date"
              {...form.register("validFrom")}
            />
            {form.formState.errors.validFrom && (
              <p className="text-xs text-destructive">
                {form.formState.errors.validFrom.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-until">Valid Until</Label>
            <Input
              id="coupon-until"
              type="date"
              {...form.register("validUntil")}
            />
            {form.formState.errors.validUntil && (
              <p className="text-xs text-destructive">
                {form.formState.errors.validUntil.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="coupon-active"
            {...form.register("isActive")}
            className="rounded"
          />
          <Label htmlFor="coupon-active" className="text-sm font-normal">
            Active
          </Label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : editing === "new"
                ? "Create Coupon"
                : "Update Coupon"}
          </Button>
          <Button type="button" variant="outline" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={startCreate}>
          + New coupon
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Discount</th>
              <th className="text-left p-3 hidden md:table-cell">Uses</th>
              <th className="text-left p-3 hidden md:table-cell">Valid Until</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr
                key={coupon.id}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="p-3 font-mono font-medium">{coupon.code}</td>
                <td className="p-3">{formatDiscount(coupon)}</td>
                <td className="p-3 hidden md:table-cell">
                  {coupon.usedCount}
                  {coupon.maxUses ? `/${coupon.maxUses}` : ""}
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {coupon.validUntil
                    ? new Date(coupon.validUntil).toLocaleDateString("en-IN")
                    : "No expiry"}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      coupon.isActive
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(coupon)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(coupon.id)}
                      disabled={deleting === coupon.id}
                    >
                      {deleting === coupon.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground"
                >
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
