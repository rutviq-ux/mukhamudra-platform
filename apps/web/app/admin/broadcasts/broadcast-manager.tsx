"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { broadcastSchema, type BroadcastInput } from "@ru/config";

type BroadcastFormValues = z.input<typeof broadcastSchema>;

import {
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  previewBroadcast,
  sendBroadcast,
  cancelBroadcast,
} from "./actions";
import { toast } from "@/hooks/use-toast";
import { Button, Input, Label } from "@ru/ui";

interface Template {
  id: string;
  name: string;
  channel: string;
  body: string;
  variables: string[];
}

interface Segment {
  audience?: "users" | "leads" | "all";
  hasActiveMembership?: boolean;
  goal?: string[];
  onboardedBefore?: string;
  onboardedAfter?: string;
  lastAttendedBefore?: string;
  membershipStatus?: string[];
}

interface Broadcast {
  id: string;
  name: string;
  templateId: string;
  variables: Record<string, string>;
  segment: Segment;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  template: { id: string; name: string; channel: string };
  creator: { name: string | null; email: string | null };
  createdAt: string;
  updatedAt: string;
}

interface BroadcastManagerProps {
  broadcasts: Broadcast[];
  templates: Template[];
}

const GOALS = ["face_yoga", "pranayama", "both", "general_wellness"];

export function BroadcastManager({
  broadcasts,
  templates,
}: BroadcastManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  // Segment state is managed separately since it is a nested object
  // not easily handled by flat react-hook-form fields
  const [segment, setSegment] = useState<Segment>({ audience: "users" });
  // Template variables state (dynamic keys)
  const [variables, setVariables] = useState<Record<string, string>>({});

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      name: "",
      templateId: templates[0]?.id || "",
      variables: {},
      segment: { audience: "users" },
      scheduledFor: null,
    },
  });

  const templateId = form.watch("templateId");
  const selectedTemplate = templates.find((t) => t.id === templateId);

  function startCreate() {
    const defaultSegment: Segment = { audience: "users" };
    form.reset({
      name: "",
      templateId: templates[0]?.id || "",
      variables: {},
      segment: { audience: "users" },
      scheduledFor: null,
    });
    setSegment(defaultSegment);
    setVariables({});
    setEditing("new");
    setPreviewCount(null);
  }

  function startEdit(bc: Broadcast) {
    form.reset({
      name: bc.name,
      templateId: bc.templateId,
      variables: bc.variables,
      segment: bc.segment,
      scheduledFor: bc.scheduledFor ?? null,
    });
    setSegment(bc.segment);
    setVariables(bc.variables);
    setEditing(bc.id);
    setPreviewCount(null);
  }

  function cancel() {
    setEditing(null);
    setPreviewCount(null);
  }

  function onSubmit(data: BroadcastFormValues) {
    // Merge segment and variables into form data
    const payload = {
      ...data,
      segment,
      variables,
    };

    startTransition(async () => {
      const result =
        editing === "new"
          ? await createBroadcast(payload)
          : await updateBroadcast({ id: editing!, ...payload });

      if (result.success) {
        toast({
          title: editing === "new" ? "Broadcast created" : "Broadcast updated",
        });
        router.refresh();
        setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof BroadcastInput, {
              message: msgs[0],
            });
          }
        }
      }
    });
  }

  function handlePreview(id: string) {
    startTransition(async () => {
      const result = await previewBroadcast({ id });

      if (result.success) {
        setPreviewCount(result.data.recipientCount);
        toast({
          title: `${result.data.recipientCount} recipients`,
          description: `${result.data.userCount} users, ${result.data.leadCount} leads`,
        });
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    });
  }

  function handleSend(id: string) {
    if (!confirm("Send this broadcast now? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await sendBroadcast({ id });

      if (result.success) {
        toast({ title: "Broadcast scheduled for immediate send" });
        router.refresh();
        if (editing === id) cancel();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    });
  }

  function handleCancel(id: string) {
    if (!confirm("Cancel this broadcast?")) return;

    startTransition(async () => {
      const result = await cancelBroadcast({ id });

      if (result.success) {
        toast({ title: "Broadcast cancelled" });
        router.refresh();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this broadcast?")) return;

    setDeleting(id);
    startTransition(async () => {
      const result = await deleteBroadcast({ id });

      if (result.success) {
        toast({ title: "Broadcast deleted" });
        router.refresh();
        if (editing === id) setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
      }

      setDeleting(null);
    });
  }

  function statusColor(status: string) {
    switch (status) {
      case "COMPLETED":
        return "bg-success/20 text-success";
      case "SENDING":
        return "bg-primary/20 text-primary";
      case "CANCELLED":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  }

  // ── Edit form ──

  if (editing) {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bc-name">Name</Label>
            <Input
              id="bc-name"
              {...form.register("name")}
              placeholder="e.g. March Re-engagement"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-template">Template</Label>
            <select
              id="bc-template"
              value={templateId}
              onChange={(e) => form.setValue("templateId", e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel})
                </option>
              ))}
            </select>
            {form.formState.errors.templateId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.templateId.message}
              </p>
            )}
          </div>
        </div>

        {/* Template variables */}
        {selectedTemplate && selectedTemplate.variables.length > 0 && (
          <div className="space-y-2">
            <Label>Template Variables</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedTemplate.variables
                .filter((v) => v !== "name") // name is auto-filled per recipient
                .map((varName) => (
                  <div key={varName} className="space-y-1">
                    <Label className="text-xs">{`{{${varName}}}`}</Label>
                    <Input
                      value={variables[varName] || ""}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          [varName]: e.target.value,
                        }))
                      }
                      placeholder={varName}
                      className="h-9"
                    />
                  </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {`{{name}}`} is auto-filled per recipient.
            </p>
          </div>
        )}

        {/* Segment */}
        <div className="space-y-3 p-4 border border-border/50 rounded-xl">
          <Label className="text-sm font-medium">Segment Filter</Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Audience</Label>
              <select
                value={segment.audience || "users"}
                onChange={(e) =>
                  setSegment((prev) => ({
                    ...prev,
                    audience: e.target.value as "users" | "leads" | "all",
                  }))
                }
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="users">Users only</option>
                <option value="leads">Leads only</option>
                <option value="all">All (users + leads)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Active Membership</Label>
              <select
                value={
                  segment.hasActiveMembership === undefined
                    ? ""
                    : String(segment.hasActiveMembership)
                }
                onChange={(e) =>
                  setSegment((prev) => ({
                    ...prev,
                    hasActiveMembership:
                      e.target.value === ""
                        ? undefined
                        : e.target.value === "true",
                  }))
                }
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">Any</option>
                <option value="true">Has active membership</option>
                <option value="false">No active membership</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Goal</Label>
              <div className="flex flex-wrap gap-1">
                {GOALS.map((g) => (
                  <label
                    key={g}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={segment.goal?.includes(g) ?? false}
                      onChange={(e) => {
                        const current = segment.goal || [];
                        const goal = e.target.checked
                          ? [...current, g]
                          : current.filter((x) => x !== g);
                        setSegment((prev) => ({
                          ...prev,
                          goal: goal.length > 0 ? goal : undefined,
                        }));
                      }}
                      className="rounded"
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Onboarded After</Label>
              <Input
                type="date"
                value={segment.onboardedAfter || ""}
                onChange={(e) =>
                  setSegment((prev) => ({
                    ...prev,
                    onboardedAfter: e.target.value || undefined,
                  }))
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Onboarded Before</Label>
              <Input
                type="date"
                value={segment.onboardedBefore || ""}
                onChange={(e) =>
                  setSegment((prev) => ({
                    ...prev,
                    onboardedBefore: e.target.value || undefined,
                  }))
                }
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-2">
          <Label htmlFor="bc-schedule">Schedule (optional)</Label>
          <Input
            id="bc-schedule"
            type="datetime-local"
            value={
              form.watch("scheduledFor")
                ? new Date(form.watch("scheduledFor")!).toISOString().slice(0, 16)
                : ""
            }
            onChange={(e) =>
              form.setValue(
                "scheduledFor",
                e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to send manually. Set a time to auto-send.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : editing === "new"
                ? "Create Broadcast"
                : "Update Broadcast"}
          </Button>
          {editing !== "new" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePreview(editing)}
                disabled={isPending}
              >
                {isPending
                  ? "Counting..."
                  : previewCount !== null
                    ? `${previewCount} recipients`
                    : "Preview Recipients"}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => handleSend(editing)}
                disabled={isPending}
              >
                Send Now
              </Button>
            </>
          )}
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
          + New broadcast
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Template</th>
              <th className="text-left p-3 hidden md:table-cell">Status</th>
              <th className="text-left p-3 hidden md:table-cell">Progress</th>
              <th className="text-left p-3 hidden lg:table-cell">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {broadcasts.map((bc) => (
              <tr
                key={bc.id}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="p-3 font-medium">{bc.name}</td>
                <td className="p-3 text-xs">
                  {bc.template.name}
                  <span className="ml-1 text-muted-foreground">
                    ({bc.template.channel})
                  </span>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span
                    className={`px-2 py-1 rounded text-xs ${statusColor(bc.status)}`}
                  >
                    {bc.status}
                  </span>
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">
                  {bc.totalRecipients > 0
                    ? `${bc.sentCount}/${bc.totalRecipients}`
                    : "-"}
                  {bc.failedCount > 0 && (
                    <span className="text-destructive ml-1">
                      ({bc.failedCount} failed)
                    </span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell">
                  {new Date(bc.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {bc.status === "DRAFT" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(bc)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSend(bc.id)}
                          disabled={isPending}
                        >
                          Send
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(bc.id)}
                          disabled={deleting === bc.id}
                        >
                          {deleting === bc.id ? "..." : "Delete"}
                        </Button>
                      </>
                    )}
                    {bc.status === "SENDING" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancel(bc.id)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    )}
                    {(bc.status === "COMPLETED" ||
                      bc.status === "CANCELLED") && (
                      <span className="text-xs text-muted-foreground p-2">
                        {bc.status === "COMPLETED"
                          ? `Sent ${bc.sentCount}`
                          : "Cancelled"}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {broadcasts.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground"
                >
                  No broadcasts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
