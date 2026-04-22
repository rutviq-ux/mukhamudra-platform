"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ru/ui";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sendTestMessage } from "./actions";

interface TemplateOption {
  id: string;
  name: string;
  channel: "EMAIL" | "WHATSAPP" | "INSTAGRAM" | "PUSH";
  subject: string | null;
  body: string;
  variables: string[];
  isActive: boolean;
}

interface SendTestMessageProps {
  templates: TemplateOption[];
}

/** Extracts `{{variable}}` names from a string */
function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

/** Renders text with `{{variables}}` highlighted as gold pills */
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\{\{\w+\}\})/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\{\{\w+\}\}$/.test(part) ? (
          <span
            key={i}
            className="inline-block px-1.5 py-0.5 rounded bg-[var(--color-mm-gold)]/15 text-[var(--color-mm-gold)] text-xs font-medium mx-0.5"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function SendTestMessage({ templates }: SendTestMessageProps) {
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP" | "INSTAGRAM" | "PUSH">("EMAIL");
  const [templateId, setTemplateId] = useState<string>("");
  const [recipient, setRecipient] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );

  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel),
    [templates, channel]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const detectedVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    const fromSubject = selectedTemplate.subject
      ? extractVariables(selectedTemplate.subject)
      : [];
    const fromBody = extractVariables(selectedTemplate.body);
    return [...new Set([...fromSubject, ...fromBody])];
  }, [selectedTemplate]);

  // Auto-select first template when channel changes
  useEffect(() => {
    if (!filteredTemplates.length) {
      setTemplateId("");
      return;
    }
    if (!filteredTemplates.find((t) => t.id === templateId)) {
      setTemplateId(filteredTemplates[0]!.id);
    }
  }, [filteredTemplates, templateId]);

  // Reset variable values when template changes
  useEffect(() => {
    setVariableValues({});
  }, [templateId]);

  /** Interpolate variables client-side for live preview */
  function interpolatePreview(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
      variableValues[key] ? variableValues[key]! : match
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!templateId) {
      toast({
        title: "Select a template",
        description: "Choose a template before sending a test message.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await sendTestMessage({
        templateId,
        channel,
        testRecipient: recipient,
        variables:
          Object.keys(variableValues).length > 0
            ? variableValues
            : undefined,
      });

      if (result.success) {
        const status = result.data.status;
        toast({
          title: status === "QUEUED" ? "Message queued" : "Test message sent",
          description:
            status === "QUEUED"
              ? "Message queued — wa-bot will deliver shortly"
              : `Message delivered via ${channel.toLowerCase()}.`,
          variant: "success",
        });
        setRecipient("");
        setVariableValues({});
      } else {
        toast({
          title: "Send failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  const hasFilledAllVariables =
    detectedVariables.length === 0 ||
    detectedVariables.every((v) => variableValues[v]?.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Channel tabs */}
      <Tabs
        value={channel}
        onValueChange={(v) => setChannel(v as "EMAIL" | "WHATSAPP" | "INSTAGRAM" | "PUSH")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="EMAIL" className="flex-1">
            Email
          </TabsTrigger>
          <TabsTrigger value="WHATSAPP" className="flex-1">
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="PUSH" className="flex-1">
            Push
          </TabsTrigger>
        </TabsList>

        {/* All tabs share the same content below */}
        <TabsContent value="EMAIL" />
        <TabsContent value="WHATSAPP" />
        <TabsContent value="PUSH" />
      </Tabs>

      {/* Template select */}
      <div className="space-y-2">
        <Label>Template</Label>
        {filteredTemplates.length > 0 ? (
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {filteredTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.isActive ? "" : "(Inactive)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground">
            No templates available for this channel.
          </p>
        )}
      </div>

      {/* Template preview */}
      {selectedTemplate && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          {selectedTemplate.channel === "EMAIL" && selectedTemplate.subject && (
            <p className="text-sm font-medium">
              {Object.keys(variableValues).length > 0 ? (
                interpolatePreview(selectedTemplate.subject)
              ) : (
                <HighlightedText text={selectedTemplate.subject} />
              )}
            </p>
          )}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {Object.keys(variableValues).length > 0 ? (
              <HighlightedText
                text={interpolatePreview(selectedTemplate.body)}
              />
            ) : (
              <HighlightedText text={selectedTemplate.body} />
            )}
          </p>
        </div>
      )}

      {/* Variable inputs */}
      {detectedVariables.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Template variables
          </Label>
          <div className="grid gap-2">
            {detectedVariables.map((variable) => (
              <div key={variable} className="flex items-center gap-2">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--color-mm-gold)]/15 text-[var(--color-mm-gold)] text-xs font-medium">
                  {`{{${variable}}}`}
                </span>
                <Input
                  value={variableValues[variable] ?? ""}
                  onChange={(e) =>
                    setVariableValues((prev) => ({
                      ...prev,
                      [variable]: e.target.value,
                    }))
                  }
                  placeholder={`Value for ${variable}`}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipient */}
      <div className="space-y-2">
        <Label htmlFor="test-recipient">
          {channel === "EMAIL"
            ? "Recipient email"
            : channel === "PUSH"
              ? "Recipient user ID"
              : "Recipient phone"}
        </Label>
        <Input
          id="test-recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder={
            channel === "EMAIL"
              ? "name@example.com"
              : channel === "PUSH"
                ? "User CUID"
                : "+919000000000"
          }
          required
        />
        <p className="text-xs text-muted-foreground">
          {channel === "PUSH"
            ? "Enter the user ID to send a test push notification."
            : "Any valid email or phone — no registration required for test messages."}
        </p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending || !templateId || !hasFilledAllVariables}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send test message"
        )}
      </Button>
    </form>
  );
}
