"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { planSchema, type PlanInput } from "@ru/config";

type PlanFormValues = z.input<typeof planSchema>;
import { createPlan, updatePlan, deletePlan } from "./actions";
import { toast } from "@/hooks/use-toast";
import { Button, Input, Label } from "@ru/ui";

interface PlanProduct {
  id: string;
  name: string;
  type: string;
}

interface Plan {
  id: string;
  productId: string;
  name: string;
  slug: string;
  type: "ONE_TIME" | "SUBSCRIPTION";
  amountPaise: number;
  durationDays: number | null;
  razorpayPlanId: string | null;
  description: string | null;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  interval: "MONTHLY" | "ANNUAL" | null;
  sortOrder: number;
  product: { name: string; type: string };
  _count: { orders: number; memberships: number };
}

interface PlanManagerProps {
  plans: Plan[];
  products: PlanProduct[];
}

export function PlanManager({ plans, products }: PlanManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [featuresText, setFeaturesText] = useState("");

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      productId: products[0]?.id || "",
      name: "",
      slug: "",
      type: "SUBSCRIPTION",
      amountPaise: 0,
      durationDays: 30,
      razorpayPlanId: null,
      description: null,
      features: [],
      isPopular: false,
      isActive: true,
      interval: "MONTHLY",
      sortOrder: 0,
    },
  });

  function startCreate() {
    form.reset({
      productId: products[0]?.id || "",
      name: "",
      slug: "",
      type: "SUBSCRIPTION",
      amountPaise: 0,
      durationDays: 30,
      razorpayPlanId: null,
      description: null,
      features: [],
      isPopular: false,
      isActive: true,
      interval: "MONTHLY",
      sortOrder: 0,
    });
    setFeaturesText("");
    setEditing("new");
  }

  function startEdit(plan: Plan) {
    form.reset({
      productId: plan.productId,
      name: plan.name,
      slug: plan.slug,
      type: plan.type,
      amountPaise: plan.amountPaise,
      durationDays: plan.durationDays,
      razorpayPlanId: plan.razorpayPlanId,
      description: plan.description,
      features: plan.features,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      interval: plan.interval,
      sortOrder: plan.sortOrder,
    });
    setFeaturesText(plan.features.join(", "));
    setEditing(plan.id);
  }

  function cancel() {
    setEditing(null);
  }

  function onSubmit(data: PlanFormValues) {
    const features = featuresText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    const payload = { ...data, features };

    startTransition(async () => {
      const result =
        editing === "new"
          ? await createPlan(payload)
          : await updatePlan({ id: editing!, ...payload });

      if (result.success) {
        toast({ title: editing === "new" ? "Plan created" : "Plan updated" });
        router.refresh();
        setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof PlanInput, { message: msgs[0] });
          }
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    setDeleting(id);
    startTransition(async () => {
      const result = await deletePlan({ id });

      if (result.success) {
        if (result.data.deactivated) {
          toast({
            title: "Plan deactivated",
            description:
              "Plan has orders/memberships and was deactivated instead.",
          });
        } else {
          toast({ title: "Plan deleted" });
        }
        router.refresh();
        if (editing === id) setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
      }

      setDeleting(null);
    });
  }

  if (editing) {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Name</Label>
            <Input
              id="plan-name"
              {...form.register("name")}
              placeholder="e.g. Monthly Subscription"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-slug">Slug</Label>
            <Input
              id="plan-slug"
              {...form.register("slug")}
              placeholder="e.g. monthly-subscription"
            />
            {form.formState.errors.slug && (
              <p className="text-xs text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plan-product">Product</Label>
            <select
              id="plan-product"
              value={form.watch("productId")}
              onChange={(e) => form.setValue("productId", e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {form.formState.errors.productId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.productId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-type">Type</Label>
            <select
              id="plan-type"
              value={form.watch("type")}
              onChange={(e) =>
                form.setValue(
                  "type",
                  e.target.value as "ONE_TIME" | "SUBSCRIPTION",
                )
              }
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="ONE_TIME">One-Time</option>
              <option value="SUBSCRIPTION">Subscription</option>
            </select>
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-interval">Interval</Label>
            <select
              id="plan-interval"
              value={form.watch("interval") || ""}
              onChange={(e) =>
                form.setValue(
                  "interval",
                  (e.target.value as "MONTHLY" | "ANNUAL") || null,
                )
              }
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">None</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </select>
            {form.formState.errors.interval && (
              <p className="text-xs text-destructive">
                {form.formState.errors.interval.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plan-amount">Amount (paise)</Label>
            <Input
              id="plan-amount"
              type="number"
              {...form.register("amountPaise", { valueAsNumber: true })}
              min={0}
            />
            {form.formState.errors.amountPaise && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amountPaise.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-duration">Duration (days)</Label>
            <Input
              id="plan-duration"
              type="number"
              value={form.watch("durationDays") ?? ""}
              onChange={(e) =>
                form.setValue(
                  "durationDays",
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              placeholder="Optional"
            />
            {form.formState.errors.durationDays && (
              <p className="text-xs text-destructive">
                {form.formState.errors.durationDays.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-razorpay">Razorpay Plan ID</Label>
            <Input
              id="plan-razorpay"
              value={form.watch("razorpayPlanId") || ""}
              onChange={(e) =>
                form.setValue("razorpayPlanId", e.target.value || null)
              }
              placeholder="plan_..."
            />
            {form.formState.errors.razorpayPlanId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.razorpayPlanId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-sort">Sort Order</Label>
            <Input
              id="plan-sort"
              type="number"
              {...form.register("sortOrder", { valueAsNumber: true })}
            />
            {form.formState.errors.sortOrder && (
              <p className="text-xs text-destructive">
                {form.formState.errors.sortOrder.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan-description">Description</Label>
          <Input
            id="plan-description"
            value={form.watch("description") || ""}
            onChange={(e) =>
              form.setValue("description", e.target.value || null)
            }
            placeholder="Optional description"
          />
          {form.formState.errors.description && (
            <p className="text-xs text-destructive">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan-features">Features (comma-separated)</Label>
          <Input
            id="plan-features"
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            placeholder="e.g. Live classes, Recording access, WhatsApp group"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="plan-active"
              {...form.register("isActive")}
              className="rounded"
            />
            <Label htmlFor="plan-active" className="text-sm font-normal">
              Active
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="plan-popular"
              {...form.register("isPopular")}
              className="rounded"
            />
            <Label htmlFor="plan-popular" className="text-sm font-normal">
              Popular
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : editing === "new"
                ? "Create Plan"
                : "Update Plan"}
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
          + New plan
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3 hidden md:table-cell">Product</th>
              <th className="text-left p-3 hidden md:table-cell">Type</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3 hidden lg:table-cell">Interval</th>
              <th className="text-left p-3 hidden lg:table-cell">
                Razorpay ID
              </th>
              <th className="text-left p-3 hidden md:table-cell">Sort</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr
                key={plan.id}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="p-3">
                  <div className="font-medium">{plan.name}</div>
                  {plan.isPopular && (
                    <span className="text-xs text-warning">Popular</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {plan.product.name}
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      plan.type === "SUBSCRIPTION"
                        ? "bg-primary/20 text-primary"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {plan.type}
                  </span>
                </td>
                <td className="p-3 font-medium">
                  {"\u20B9"}
                  {(plan.amountPaise / 100).toLocaleString("en-IN")}
                </td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell">
                  {plan.interval || "\u2014"}
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <code className="text-xs text-muted-foreground font-mono">
                    {plan.razorpayPlanId || "\u2014"}
                  </code>
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {plan.sortOrder}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      plan.isActive
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(plan)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(plan.id)}
                      disabled={deleting === plan.id}
                    >
                      {deleting === plan.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center text-muted-foreground"
                >
                  No plans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
