"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { messageTemplateSchema, type MessageTemplateInput } from "@ru/config";

type TemplateFormValues = z.input<typeof messageTemplateSchema>;
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";
import { toast } from "@/hooks/use-toast";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@ru/ui";

interface Template {
  id: string;
  name: string;
  channel: "EMAIL" | "WHATSAPP" | "INSTAGRAM" | "PUSH";
  subject: string | null;
  body: string;
  variables: string[];
  isActive: boolean;
  _count?: { messageLogs: number };
}

interface TemplateEditorProps {
  templates: Template[];
}

export function TemplateEditor({ templates }: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null); // "new" or template id
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(messageTemplateSchema),
    defaultValues: {
      name: "",
      channel: "EMAIL",
      subject: "",
      body: "",
      variables: [],
      isActive: true,
    },
  });

  const channelValue = form.watch("channel");
  const bodyValue = form.watch("body");
  const subjectValue = form.watch("subject");
  const isActiveValue = form.watch("isActive");
  const variablesValue = form.watch("variables");

  function extractVariables(body: string): string[] {
    const matches = body.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  }

  function startCreate() {
    form.reset({
      name: "",
      channel: "EMAIL",
      subject: "",
      body: "",
      variables: [],
      isActive: true,
    });
    setEditing("new");
  }

  function startEdit(template: Template) {
    form.reset({
      name: template.name,
      channel: template.channel,
      subject: template.subject || "",
      body: template.body,
      variables: template.variables,
      isActive: template.isActive,
    });
    setEditing(template.id);
  }

  function cancel() {
    setEditing(null);
  }

  function onSubmit(data: TemplateFormValues) {
    startTransition(async () => {
      const result =
        editing === "new"
          ? await createTemplate(data)
          : await updateTemplate({ id: editing!, ...data });

      if (result.success) {
        toast({
          title: editing === "new" ? "Template created" : "Template updated",
        });
        router.refresh();
        setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof MessageTemplateInput, {
              message: msgs[0],
            });
          }
        }
      }
    });
  }

  function handleDelete(id: string) {
    setDeleteConfirmId(null);
    setDeleting(id);
    startTransition(async () => {
      const result = await deleteTemplate({ id });
      if (result.success) {
        if (result.data.deactivated) {
          toast({
            title: "Template deactivated",
            description:
              "Template has message logs and was deactivated instead of deleted.",
          });
        } else {
          toast({ title: "Template deleted" });
        }
        router.refresh();
        if (editing === id) setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
      setDeleting(null);
    });
  }

  const isNew = editing === "new";
  const deleteTemplateName =
    deleteConfirmId &&
    templates.find((t) => t.id === deleteConfirmId)?.name;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Templates ({templates.length})</h3>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startCreate}>
            + New template
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                {...form.register("name")}
                placeholder="e.g. booking_confirmed_wa"
                disabled={!isNew}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Lowercase with underscores, cannot be changed after creation.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={channelValue}
                onValueChange={(v) =>
                  form.setValue(
                    "channel",
                    v as "EMAIL" | "WHATSAPP" | "INSTAGRAM" | "PUSH",
                  )
                }
                disabled={!isNew}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="PUSH">Push</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.channel && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.channel.message}
                </p>
              )}
            </div>
          </div>

          {channelValue === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input
                id="tpl-subject"
                {...form.register("subject")}
                placeholder="Email subject line (supports {{variables}})"
              />
              {form.formState.errors.subject && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subject.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tpl-body">Body</Label>
            <textarea
              id="tpl-body"
              {...form.register("body", {
                onChange: (e) => {
                  form.setValue(
                    "variables",
                    extractVariables(e.target.value),
                  );
                },
              })}
              placeholder="Message body - use {{variable_name}} for dynamic content"
              rows={6}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y min-h-[120px]"
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </p>
            )}
          </div>

          {variablesValue && variablesValue.length > 0 && (
            <div className="space-y-1">
              <Label>Detected variables</Label>
              <div className="flex flex-wrap gap-1.5">
                {variablesValue.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 rounded bg-[var(--color-mm-gold)]/15 text-[var(--color-mm-gold)] text-xs font-medium"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="tpl-active"
              checked={isActiveValue}
              onCheckedChange={(checked) =>
                form.setValue("isActive", checked)
              }
            />
            <Label htmlFor="tpl-active" className="text-sm font-normal">
              Active
            </Label>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium mb-2 text-muted-foreground">
              Preview
            </p>
            {channelValue === "EMAIL" && subjectValue && (
              <p className="text-sm font-medium mb-1">{subjectValue}</p>
            )}
            <p className="text-sm whitespace-pre-wrap">{bodyValue}</p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isNew ? "Create" : "Update"}
            </Button>
            <Button type="button" variant="outline" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-3 rounded-lg bg-muted/50 flex items-center justify-between group"
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{template.name}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      template.channel === "EMAIL"
                        ? "bg-info/20 text-info"
                        : template.channel === "PUSH"
                          ? "bg-warning/20 text-warning"
                          : "bg-success/20 text-success"
                    }`}
                  >
                    {template.channel}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      template.isActive
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {template.body.slice(0, 80)}
                  {template.body.length > 80 ? "..." : ""}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(template)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmId(template.id)}
                  disabled={deleting === template.id}
                >
                  {deleting === template.id ? "..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No templates yet. Create one to get started.
            </p>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTemplateName}
              </span>
              ? If this template has message logs it will be deactivated instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
