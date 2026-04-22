"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { sequenceSchema, sequenceStepSchema } from "@ru/config";

type SequenceFormValues = z.input<typeof sequenceSchema>;
type StepFormValues = z.input<typeof sequenceStepSchema>;

import {
  createSequence,
  updateSequence,
  deleteSequence,
  createStep,
  updateStep,
  deleteStep,
} from "./actions";
import { toast } from "@/hooks/use-toast";
import { Button, Input, Label } from "@ru/ui";

interface Template {
  id: string;
  name: string;
  channel: string;
}

interface Step {
  id: string;
  templateId: string;
  stepOrder: number;
  delayMinutes: number;
  isActive: boolean;
  template: Template;
  createdAt: string;
  updatedAt: string;
}

interface Sequence {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  triggerEvent: string;
  cancelEvents: string[];
  isActive: boolean;
  steps: Step[];
  _count: { enrollments: number };
  createdAt: string;
  updatedAt: string;
}

interface SequenceManagerProps {
  sequences: Sequence[];
  templates: Template[];
}

const KNOWN_EVENTS = [
  "lead.created",
  "user.onboarded",
  "subscription.activated",
  "subscription.cancelled",
  "booking.first",
  "user.inactive_3d",
];

export function SequenceManager({
  sequences,
  templates,
}: SequenceManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null); // "new" | sequenceId | null
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Step editing state
  const [editingStepFor, setEditingStepFor] = useState<string | null>(null); // sequenceId
  const [editingStepId, setEditingStepId] = useState<string | null>(null); // "new" | stepId | null

  // ── Sequence form ──

  const seqForm = useForm<SequenceFormValues>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: null,
      triggerEvent: "",
      cancelEvents: [],
      isActive: true,
    },
  });

  // ── Step form ──

  const stepForm = useForm<StepFormValues>({
    resolver: zodResolver(sequenceStepSchema),
    defaultValues: {
      templateId: templates[0]?.id || "",
      stepOrder: 1,
      delayMinutes: 0,
      isActive: true,
    },
  });

  // ── Sequence handlers ──

  function startCreate() {
    seqForm.reset({
      name: "",
      slug: "",
      description: null,
      triggerEvent: "",
      cancelEvents: [],
      isActive: true,
    });
    setEditing("new");
  }

  function startEdit(seq: Sequence) {
    seqForm.reset({
      name: seq.name,
      slug: seq.slug,
      description: seq.description,
      triggerEvent: seq.triggerEvent,
      cancelEvents: seq.cancelEvents,
      isActive: seq.isActive,
    });
    setEditing(seq.id);
  }

  function cancel() {
    setEditing(null);
  }

  function onSubmitSequence(data: SequenceFormValues) {
    startTransition(async () => {
      const result =
        editing === "new"
          ? await createSequence(data)
          : await updateSequence({ id: editing!, ...data });

      if (result.success) {
        toast({
          title: editing === "new" ? "Sequence created" : "Sequence updated",
        });
        router.refresh();
        setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            seqForm.setError(field as keyof SequenceFormValues, {
              message: msgs[0],
            });
          }
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this sequence?")) return;

    setDeleting(id);
    startTransition(async () => {
      const result = await deleteSequence({ id });

      if (result.success) {
        if (result.data.deactivated) {
          toast({
            title: "Sequence deactivated",
            description: "Has enrollments, so it was deactivated instead.",
          });
        } else {
          toast({ title: "Sequence deleted" });
        }
        router.refresh();
        if (editing === id) setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
      }

      setDeleting(null);
    });
  }

  // ── Step handlers ──

  function startAddStep(sequenceId: string) {
    const seq = sequences.find((s) => s.id === sequenceId);
    const nextOrder = seq
      ? Math.max(0, ...seq.steps.map((s) => s.stepOrder)) + 1
      : 1;
    stepForm.reset({
      templateId: templates[0]?.id || "",
      stepOrder: nextOrder,
      delayMinutes: 0,
      isActive: true,
    });
    setEditingStepFor(sequenceId);
    setEditingStepId("new");
    setExpandedId(sequenceId);
  }

  function startEditStep(step: Step, sequenceId: string) {
    stepForm.reset({
      templateId: step.templateId,
      stepOrder: step.stepOrder,
      delayMinutes: step.delayMinutes,
      isActive: step.isActive,
    });
    setEditingStepFor(sequenceId);
    setEditingStepId(step.id);
  }

  function cancelStep() {
    setEditingStepFor(null);
    setEditingStepId(null);
  }

  function onSubmitStep(data: StepFormValues) {
    if (!editingStepFor) return;
    const sequenceId = editingStepFor;

    startTransition(async () => {
      const result =
        editingStepId === "new"
          ? await createStep({ ...data, sequenceId })
          : await updateStep({ ...data, id: editingStepId!, sequenceId });

      if (result.success) {
        toast({
          title: editingStepId === "new" ? "Step added" : "Step updated",
        });
        router.refresh();
        setEditingStepFor(null);
        setEditingStepId(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            stepForm.setError(field as keyof StepFormValues, {
              message: msgs[0],
            });
          }
        }
      }
    });
  }

  function handleDeleteStep(sequenceId: string, stepId: string) {
    if (!confirm("Delete this step?")) return;

    startTransition(async () => {
      const result = await deleteStep({ id: stepId, sequenceId });

      if (result.success) {
        toast({ title: "Step deleted" });
        router.refresh();
        if (editingStepId === stepId) cancelStep();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    });
  }

  // ── Helpers ──

  function formatDelay(minutes: number) {
    if (minutes === 0) return "Immediately";
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  }

  const watchedTrigger = seqForm.watch("triggerEvent");
  const watchedCancelEvents = seqForm.watch("cancelEvents");

  // ── Sequence edit form ──

  if (editing) {
    return (
      <form
        onSubmit={seqForm.handleSubmit(onSubmitSequence)}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seq-name">Name</Label>
            <Input
              id="seq-name"
              {...seqForm.register("name")}
              placeholder="e.g. Lead Nurture Drip"
            />
            {seqForm.formState.errors.name && (
              <p className="text-xs text-destructive">
                {seqForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="seq-slug">Slug</Label>
            <Input
              id="seq-slug"
              {...seqForm.register("slug", {
                onChange: (e) => {
                  const value = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-");
                  seqForm.setValue("slug", value);
                },
              })}
              placeholder="e.g. lead-nurture"
            />
            {seqForm.formState.errors.slug && (
              <p className="text-xs text-destructive">
                {seqForm.formState.errors.slug.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seq-desc">Description</Label>
          <Input
            id="seq-desc"
            {...seqForm.register("description")}
            placeholder="Optional description"
          />
          {seqForm.formState.errors.description && (
            <p className="text-xs text-destructive">
              {seqForm.formState.errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seq-trigger">Trigger Event</Label>
            <select
              id="seq-trigger"
              value={watchedTrigger}
              onChange={(e) => seqForm.setValue("triggerEvent", e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Select event...</option>
              {KNOWN_EVENTS.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
            {seqForm.formState.errors.triggerEvent && (
              <p className="text-xs text-destructive">
                {seqForm.formState.errors.triggerEvent.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Cancel Events</Label>
            <div className="flex flex-wrap gap-2">
              {KNOWN_EVENTS.filter((ev) => ev !== watchedTrigger).map((ev) => (
                <label
                  key={ev}
                  className="flex items-center gap-1 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(watchedCancelEvents ?? []).includes(ev)}
                    onChange={(e) => {
                      const current = watchedCancelEvents ?? [];
                      const cancelEvents = e.target.checked
                        ? [...current, ev]
                        : current.filter((ce: string) => ce !== ev);
                      seqForm.setValue("cancelEvents", cancelEvents);
                    }}
                    className="rounded"
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="seq-active"
            {...seqForm.register("isActive")}
            className="rounded"
          />
          <Label htmlFor="seq-active" className="text-sm font-normal">
            Active
          </Label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : editing === "new"
                ? "Create Sequence"
                : "Update Sequence"}
          </Button>
          <Button type="button" variant="outline" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // ── List view ──

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={startCreate}>
          + New sequence
        </Button>
      </div>

      <div className="space-y-4">
        {sequences.map((seq) => (
          <div
            key={seq.id}
            className="border border-border/50 rounded-xl overflow-hidden"
          >
            {/* Sequence header row */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30">
              <div
                className="flex-1 cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === seq.id ? null : seq.id)
                }
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{seq.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      seq.isActive
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {seq.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                  <span>Trigger: {seq.triggerEvent}</span>
                  <span>{seq.steps.length} steps</span>
                  <span>{seq._count.enrollments} enrollments</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(seq)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(seq.id)}
                  disabled={deleting === seq.id}
                >
                  {deleting === seq.id ? "..." : "Delete"}
                </Button>
              </div>
            </div>

            {/* Expanded: steps */}
            {expandedId === seq.id && (
              <div className="border-t border-border/50 bg-muted/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Steps</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startAddStep(seq.id)}
                  >
                    + Add step
                  </Button>
                </div>

                {/* Step edit form */}
                {editingStepFor === seq.id && editingStepId && (
                  <form
                    onSubmit={stepForm.handleSubmit(onSubmitStep)}
                    className="mb-4 p-3 border border-border/50 rounded-lg space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Template</Label>
                        <select
                          value={stepForm.watch("templateId")}
                          onChange={(e) =>
                            stepForm.setValue("templateId", e.target.value)
                          }
                          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                        >
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.channel})
                            </option>
                          ))}
                        </select>
                        {stepForm.formState.errors.templateId && (
                          <p className="text-xs text-destructive">
                            {stepForm.formState.errors.templateId.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Step Order</Label>
                        <Input
                          type="number"
                          {...stepForm.register("stepOrder", {
                            valueAsNumber: true,
                          })}
                          min={1}
                          className="h-9"
                        />
                        {stepForm.formState.errors.stepOrder && (
                          <p className="text-xs text-destructive">
                            {stepForm.formState.errors.stepOrder.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Delay (minutes from enrollment)
                        </Label>
                        <Input
                          type="number"
                          {...stepForm.register("delayMinutes", {
                            valueAsNumber: true,
                          })}
                          min={0}
                          className="h-9"
                        />
                        {stepForm.formState.errors.delayMinutes && (
                          <p className="text-xs text-destructive">
                            {stepForm.formState.errors.delayMinutes.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isPending}>
                        {isPending
                          ? "Saving..."
                          : editingStepId === "new"
                            ? "Add Step"
                            : "Update Step"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelStep}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {/* Steps table */}
                {seq.steps.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-2 text-xs">#</th>
                        <th className="text-left p-2 text-xs">Template</th>
                        <th className="text-left p-2 text-xs">Channel</th>
                        <th className="text-left p-2 text-xs">Delay</th>
                        <th className="text-left p-2 text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seq.steps.map((step) => (
                        <tr
                          key={step.id}
                          className="border-b border-border/30 hover:bg-muted/20"
                        >
                          <td className="p-2">{step.stepOrder}</td>
                          <td className="p-2 font-mono text-xs">
                            {step.template.name}
                          </td>
                          <td className="p-2">{step.template.channel}</td>
                          <td className="p-2">
                            {formatDelay(step.delayMinutes)}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => startEditStep(step, seq.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDeleteStep(seq.id, step.id)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No steps yet. Add one to get started.
                  </p>
                )}

                {seq.cancelEvents.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Cancel events:{" "}
                    {seq.cancelEvents.map((ev) => (
                      <span
                        key={ev}
                        className="inline-block bg-muted px-1.5 py-0.5 rounded mr-1"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sequences.length === 0 && (
          <p className="p-8 text-center text-muted-foreground">
            No sequences yet.
          </p>
        )}
      </div>
    </div>
  );
}
