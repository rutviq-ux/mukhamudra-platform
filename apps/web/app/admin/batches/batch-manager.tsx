"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { batchSchema, MODALITIES, type BatchInput } from "@ru/config";
import { createBatch, updateBatch, deleteBatch, regenerateBatchSessions } from "./actions";
import { toast } from "@/hooks/use-toast";
import { Button, Input, Label } from "@ru/ui";

// Types ---------------------------------------------------------------

type BatchFormValues = z.input<typeof batchSchema>;
type DayModalities = Record<string, string[]>;

interface RegenerateState {
  batchId: string;
  batchName: string;
  effectiveDate: string;
}

interface Batch {
  id: string;
  productId: string;
  name: string;
  slug: string;
  description: string | null;
  daysOfWeek: number[];
  daysOfWeekLabels: string;
  startTime: string;
  durationMin: number;
  timezone: string;
  capacity: number;
  modalities: string[];
  dayModalities: DayModalities | null;
  endsAt: string | null;
  isActive: boolean;
  product: { id: string; name: string };
  productType: string;
  _count: { sessions: number };
}

interface Product {
  id: string;
  name: string;
  type: string;
}

interface BatchManagerProps {
  batches: Batch[];
  products: Product[];
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

// Helpers -------------------------------------------------------------

function getProductType(products: Product[], productId: string): string {
  return products.find((p) => p.id === productId)?.type || "";
}

function getAvailableModalities(
  products: Product[],
  productId: string,
): readonly string[] {
  const type = getProductType(products, productId);
  if (type === "FACE_YOGA") return MODALITIES.FACE_YOGA;
  if (type === "PRANAYAMA") return MODALITIES.PRANAYAMA;
  return [];
}

/** Compute the flat modalities superset from dayModalities */
function computeFlatModalities(dayMods: DayModalities): string[] {
  const set = new Set<string>();
  for (const mods of Object.values(dayMods)) {
    for (const m of mods) set.add(m);
  }
  return Array.from(set);
}

function defaultFormValues(products: Product[]): BatchFormValues {
  return {
    productId: products[0]?.id || "",
    name: "",
    slug: "",
    description: null,
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    startTime: "06:00",
    durationMin: 45,
    timezone: "Asia/Kolkata",
    capacity: 50,
    modalities: [],
    dayModalities: null,
    endsAt: null,
    isActive: true,
  };
}

// Component -----------------------------------------------------------

export function BatchManager({ batches, products }: BatchManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [regenerate, setRegenerate] = useState<RegenerateState | null>(null);

  // RHF-managed form fields (name, slug, description, productId, startTime,
  // durationMin, capacity, timezone, endsAt, isActive).
  // daysOfWeek, modalities, and dayModalities use local state because they
  // are driven by toggle buttons and a matrix UI, which is easier to manage
  // outside of RHF. We sync them into the form via hidden fields / setValue.
  const [localDays, setLocalDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [localDayMods, setLocalDayMods] = useState<DayModalities>({});
  const [localModalities, setLocalModalities] = useState<string[]>([]);

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: defaultFormValues(products),
  });

  // --- Day toggle ---
  function toggleDay(day: number) {
    setLocalDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort();

      // Clean up dayModalities for removed days
      setLocalDayMods((prevMods) => {
        const updated = { ...prevMods };
        if (!next.includes(day)) {
          delete updated[String(day)];
        }
        const flat = computeFlatModalities(updated);
        setLocalModalities(flat);
        return updated;
      });

      return next;
    });
  }

  // --- Per-day modality toggle ---
  function toggleDayModality(day: number, modality: string) {
    setLocalDayMods((prev) => {
      const key = String(day);
      const current = prev[key] ?? [];
      const updated = {
        ...prev,
        [key]: current.includes(modality)
          ? current.filter((m) => m !== modality)
          : [...current, modality],
      };
      setLocalModalities(computeFlatModalities(updated));
      return updated;
    });
  }

  // --- Actions ---
  function startCreate() {
    const defaults = defaultFormValues(products);
    form.reset(defaults);
    setLocalDays(defaults.daysOfWeek);
    setLocalDayMods({});
    setLocalModalities([]);
    setEditing("new");
  }

  function startEdit(batch: Batch) {
    form.reset({
      productId: batch.productId,
      name: batch.name,
      slug: batch.slug,
      description: batch.description,
      daysOfWeek: batch.daysOfWeek,
      startTime: batch.startTime,
      durationMin: batch.durationMin,
      timezone: batch.timezone,
      capacity: batch.capacity,
      modalities: batch.modalities,
      dayModalities: batch.dayModalities,
      endsAt: (batch.endsAt ?? null) as unknown as Date | null,
      isActive: batch.isActive,
    });
    setLocalDays(batch.daysOfWeek);
    setLocalDayMods(batch.dayModalities ?? {});
    setLocalModalities(batch.modalities);
    setEditing(batch.id);
  }

  function cancel() {
    setEditing(null);
  }

  function onSubmit(formData: BatchFormValues) {
    // Merge locally-managed toggle fields into the submission
    const data: BatchFormValues = {
      ...formData,
      daysOfWeek: localDays,
      modalities: localModalities,
      dayModalities: Object.keys(localDayMods).length > 0 ? localDayMods : null,
    };

    startTransition(async () => {
      const result =
        editing === "new"
          ? await createBatch(data)
          : await updateBatch({ id: editing!, ...data });

      if (result.success) {
        toast({
          title: editing === "new" ? "Batch created" : "Batch updated",
        });
        router.refresh();
        setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof BatchInput, { message: msgs[0] });
          }
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    setDeleting(id);
    startTransition(async () => {
      const result = await deleteBatch({ id });

      if (result.success) {
        if (result.data.deactivated) {
          toast({
            title: "Batch deactivated",
            description:
              "Batch has sessions and was deactivated instead of deleted.",
          });
        } else {
          toast({ title: "Batch deleted" });
        }
        router.refresh();
        if (editing === id) setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
      }

      setDeleting(null);
    });
  }

  // --- Regenerate ---
  function startRegenerate(batch: Batch) {
    const today = new Date().toISOString().split("T")[0]!;
    setRegenerate({
      batchId: batch.id,
      batchName: batch.name,
      effectiveDate: today,
    });
  }

  function handleRegenerate() {
    if (!regenerate) return;

    if (
      !confirm(
        `This will delete unbooked sessions and cancel booked sessions from ${regenerate.effectiveDate} onwards for "${regenerate.batchName}", then regenerate with the current batch settings. Continue?`,
      )
    )
      return;

    startTransition(async () => {
      const result = await regenerateBatchSessions({
        id: regenerate.batchId,
        effectiveDate: regenerate.effectiveDate,
      });

      if (result.success) {
        toast({
          title: "Sessions regenerated",
          description: `Deleted ${result.data.deleted}, cancelled ${result.data.cancelled}, generated ${result.data.generated} sessions.`,
        });
        setRegenerate(null);
        router.refresh();
      } else {
        toast({
          title: "Regeneration failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  // ===================================================================
  // RENDER: Regenerate view
  // ===================================================================

  if (regenerate) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          Regenerate Sessions — {regenerate.batchName}
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose a date from which to apply the updated batch settings. Sessions
          on or after this date will be cleared and regenerated.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>
            Unbooked future sessions from the chosen date will be{" "}
            <strong className="text-foreground">deleted</strong>.
          </li>
          <li>
            Sessions with existing bookings will be{" "}
            <strong className="text-foreground">cancelled</strong> (records
            preserved).
          </li>
          <li>
            New sessions will be generated using the current batch schedule
            (up to 30 days or until batch end date).
          </li>
        </ul>

        <div className="space-y-2 max-w-xs">
          <Label htmlFor="regen-date">Effective from</Label>
          <Input
            id="regen-date"
            type="date"
            value={regenerate.effectiveDate}
            onChange={(e) =>
              setRegenerate({ ...regenerate, effectiveDate: e.target.value })
            }
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleRegenerate}
            disabled={isPending}
            variant="destructive"
          >
            {isPending ? "Regenerating..." : "Regenerate Sessions"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setRegenerate(null)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ===================================================================
  // RENDER: Edit / Create form
  // ===================================================================

  if (editing) {
    const productId = form.watch("productId");
    const availableMods = getAvailableModalities(products, productId);
    const hasMods = availableMods.length > 0;
    const selectedDays = DAYS.filter((d) => localDays.includes(d.value));

    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: Name + Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batch-name">Name</Label>
            <Input
              id="batch-name"
              {...form.register("name")}
              placeholder="e.g. Morning Batch"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-slug">Slug</Label>
            <Input
              id="batch-slug"
              {...form.register("slug")}
              placeholder="e.g. morning"
              disabled={editing !== "new"}
            />
            {form.formState.errors.slug && (
              <p className="text-xs text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Product + Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batch-product">Product</Label>
            <select
              id="batch-product"
              value={productId}
              onChange={(e) => {
                form.setValue("productId", e.target.value);
                setLocalDayMods({});
                setLocalModalities([]);
              }}
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
            <Label>Description</Label>
            <Input
              {...form.register("description")}
              placeholder="Optional description"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
        </div>

        {/* Days of week */}
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="flex gap-2">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  localDays.includes(day.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {form.formState.errors.daysOfWeek && (
            <p className="text-xs text-destructive">
              {form.formState.errors.daysOfWeek.message}
            </p>
          )}
        </div>

        {/* Per-day modality matrix */}
        {hasMods && selectedDays.length > 0 && (
          <div className="space-y-3">
            <Label>
              Modalities per day{" "}
              <span className="text-muted-foreground font-normal">
                (
                {getProductType(products, productId) === "FACE_YOGA"
                  ? "Face Yoga techniques"
                  : "Pranayama techniques"}
                )
              </span>
            </Label>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-2 pl-3 font-medium w-20">
                      Day
                    </th>
                    <th className="text-left p-2 font-medium">Techniques</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDays.map((day) => {
                    const currentMods = localDayMods[String(day.value)] ?? [];
                    return (
                      <tr
                        key={day.value}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="p-2 pl-3 font-medium text-muted-foreground">
                          {day.label}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1.5">
                            {availableMods.map((mod) => (
                              <button
                                key={mod}
                                type="button"
                                onClick={() =>
                                  toggleDayModality(day.value, mod)
                                }
                                className={`px-2 py-1 rounded text-xs border transition-colors ${
                                  currentMods.includes(mod)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:bg-muted"
                                }`}
                              >
                                {mod}
                              </button>
                            ))}
                          </div>
                          {currentMods.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              → {currentMods.join(" + ")}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Time / Duration / Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batch-time">Start Time</Label>
            <Input
              id="batch-time"
              type="time"
              {...form.register("startTime")}
            />
            {form.formState.errors.startTime && (
              <p className="text-xs text-destructive">
                {form.formState.errors.startTime.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-duration">Duration (min)</Label>
            <Input
              id="batch-duration"
              type="number"
              {...form.register("durationMin", { valueAsNumber: true })}
              min={5}
              max={480}
            />
            {form.formState.errors.durationMin && (
              <p className="text-xs text-destructive">
                {form.formState.errors.durationMin.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-capacity">Capacity</Label>
            <Input
              id="batch-capacity"
              type="number"
              {...form.register("capacity", { valueAsNumber: true })}
              min={1}
            />
            {form.formState.errors.capacity && (
              <p className="text-xs text-destructive">
                {form.formState.errors.capacity.message}
              </p>
            )}
          </div>
        </div>

        {/* End date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batch-ends">
              End Date{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="batch-ends"
                type="date"
                {...form.register("endsAt")}
                min={new Date().toISOString().split("T")[0]}
              />
              {form.watch("endsAt") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue("endsAt", null)}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              No sessions will be generated after this date. Leave empty for
              indefinite.
            </p>
          </div>
        </div>

        {/* Active checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="batch-active"
            {...form.register("isActive")}
            className="rounded"
          />
          <Label htmlFor="batch-active" className="text-sm font-normal">
            Active (generates sessions via cron)
          </Label>
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : editing === "new"
                ? "Create Batch"
                : "Update Batch"}
          </Button>
          <Button type="button" variant="outline" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // ===================================================================
  // RENDER: Batch list table
  // ===================================================================

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={startCreate}>
          + New batch
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3 hidden md:table-cell">Product</th>
              <th className="text-left p-3">Schedule</th>
              <th className="text-left p-3 hidden md:table-cell">Time</th>
              <th className="text-left p-3 hidden md:table-cell">Ends</th>
              <th className="text-left p-3 hidden md:table-cell">Modalities</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3 hidden lg:table-cell">Sessions</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr
                key={batch.id}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="p-3 font-medium">{batch.name}</td>
                <td className="p-3 hidden md:table-cell">{batch.product.name}</td>
                <td className="p-3 text-xs">{batch.daysOfWeekLabels}</td>
                <td className="p-3 hidden md:table-cell">
                  {batch.startTime}
                  <span className="text-muted-foreground ml-1">
                    ({batch.durationMin}m)
                  </span>
                </td>
                <td className="p-3 text-xs hidden md:table-cell">
                  {batch.endsAt ? (
                    new Date(batch.endsAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-xs max-w-48 hidden md:table-cell">
                  {batch.modalities.length > 0 ? (
                    batch.modalities.join(", ")
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      batch.isActive
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {batch.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 hidden lg:table-cell">{batch._count.sessions}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(batch)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startRegenerate(batch)}
                    >
                      Regen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(batch.id)}
                      disabled={deleting === batch.id}
                    >
                      {deleting === batch.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center text-muted-foreground"
                >
                  No batches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
