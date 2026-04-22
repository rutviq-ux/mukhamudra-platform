"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Label,
  Button,
} from "@ru/ui";
import { Check, X, Info, Save, RotateCcw, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateGlobalConfig } from "./actions";

/* ── Types ── */

interface ConfigEntry {
  value: string | number;
  default: string | number;
}

interface SuperSettingsData {
  globalConfig: Record<string, ConfigEntry>;
  modalities: Record<string, string[]>;
  serverEnv: Record<string, string>;
  clientEnv: Record<string, string>;
}

/* ── Small components ── */

function StatusBadge({ value }: { value: string }) {
  if (value === "MISSING") {
    return (
      <Badge variant="destructive" className="gap-1 font-mono text-xs">
        <X className="h-3 w-3" />
        MISSING
      </Badge>
    );
  }
  if (value === "SET") {
    return (
      <Badge variant="secondary" className="gap-1 font-mono text-xs bg-success/20 text-success border-success/30">
        <Check className="h-3 w-3" />
        SET
      </Badge>
    );
  }
  return null;
}

function EnvRow({ label, value }: { label: string; value: string }) {
  const isStatus = value === "SET" || value === "MISSING";
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <code className="text-sm font-medium text-foreground">{label}</code>
      <div className="ml-4 shrink-0">
        {isStatus ? (
          <StatusBadge value={value} />
        ) : (
          <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
            {value}
          </code>
        )}
      </div>
    </div>
  );
}

function EnvSection({
  title,
  description,
  entries,
}: {
  title: string;
  description?: string;
  entries: [string, string][];
}) {
  const missingCount = entries.filter(([, v]) => v === "MISSING").length;
  return (
    <Card glass className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {missingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {missingCount} missing
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {entries.map(([key, value]) => (
          <EnvRow key={key} label={key} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

/* ── Metadata ── */

const CONFIG_META: Record<string, { label: string; description: string; type: "number" | "string"; unit?: string }> = {
  JOIN_WINDOW_BEFORE_MIN: {
    label: "Join Window Before",
    description: "Minutes before session start users can join",
    type: "number",
    unit: "min",
  },
  JOIN_WINDOW_AFTER_MIN: {
    label: "Join Window After",
    description: "Minutes after session end users can still join",
    type: "number",
    unit: "min",
  },
  SESSION_GENERATION_DAYS: {
    label: "Session Generation Days",
    description: "How many days ahead the cron generates sessions",
    type: "number",
    unit: "days",
  },
  WHATSAPP_RATE_LIMIT_PER_MINUTE: {
    label: "WA Rate Limit / min",
    description: "Max WhatsApp messages per user per minute",
    type: "number",
    unit: "msg",
  },
  WHATSAPP_RATE_LIMIT_PER_DAY: {
    label: "WA Rate Limit / day",
    description: "Max WhatsApp messages per user per day",
    type: "number",
    unit: "msg",
  },
  CURRENCY: {
    label: "Currency",
    description: "ISO 4217 currency code for payments",
    type: "string",
  },
  CURRENCY_SUBUNIT: {
    label: "Currency Subunit",
    description: "Subunit multiplier (100 for paise/cents)",
    type: "number",
  },
  DEFAULT_TIMEZONE: {
    label: "Default Timezone",
    description: "IANA timezone used as platform default",
    type: "string",
  },
  RECORDING_ADDON_PAISE: {
    label: "Recording Add-on Price",
    description: "Price of recording add-on in paise",
    type: "number",
    unit: "paise",
  },
  RECORDING_ACCESS_DAYS: {
    label: "Recording Access Duration",
    description: "Days a purchased recording remains accessible",
    type: "number",
    unit: "days",
  },
  DEFAULT_COACH_EMAIL: {
    label: "Default Coach Email",
    description: "Email of the coach auto-assigned to generated sessions",
    type: "string",
  },
};

const SERVER_ENV_GROUPS: Record<string, { title: string; description: string; keys: string[] }> = {
  core: {
    title: "Core",
    description: "Database and runtime",
    keys: ["DATABASE_URL", "NODE_ENV"],
  },
  clerk: {
    title: "Clerk Auth",
    description: "Authentication & user management",
    keys: ["CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET"],
  },
  razorpay: {
    title: "Razorpay",
    description: "Payment gateway",
    keys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  },
  ghost: {
    title: "Ghost CMS",
    description: "Blog & content management",
    keys: ["GHOST_URL", "GHOST_CONTENT_API_KEY", "GHOST_ADMIN_API_KEY"],
  },
  listmonk: {
    title: "Listmonk",
    description: "Email campaigns & transactional",
    keys: ["LISTMONK_URL", "LISTMONK_API_USER", "LISTMONK_API_PASSWORD"],
  },
  whatsapp: {
    title: "WhatsApp Bot",
    description: "whatsapp-web.js messaging",
    keys: ["WA_BOT_ENABLED", "WA_BOT_SESSION_PATH"],
  },
  google: {
    title: "Google Workspace",
    description: "Calendar & Drive integration",
    keys: ["GOOGLE_SERVICE_ACCOUNT_KEY_BASE64", "GOOGLE_IMPERSONATE_EMAIL", "GOOGLE_CALENDAR_ID"],
  },
  instagram: {
    title: "Instagram",
    description: "Meta Graph API messaging",
    keys: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_PAGE_ID", "INSTAGRAM_VERIFY_TOKEN", "INSTAGRAM_APP_SECRET"],
  },
  cron: {
    title: "Cron / QStash",
    description: "Scheduled job execution",
    keys: ["CRON_SECRET", "QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"],
  },
};

/* ── Main component ── */

interface SettingsTabsProps {
  initialData: SuperSettingsData;
}

export function SettingsTabs({ initialData }: SettingsTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const data = initialData;

  // Editable form state for global config
  const [formValues, setFormValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    for (const [key, entry] of Object.entries(data.globalConfig)) {
      initial[key] = entry.value;
    }
    return initial;
  });

  const hasChanges = Object.entries(formValues).some(
    ([key, val]) => data.globalConfig[key] && val !== data.globalConfig[key].value,
  );

  const overriddenKeys = new Set(
    Object.entries(data.globalConfig)
      .filter(([, entry]) => entry.value !== entry.default)
      .map(([key]) => key),
  );

  function updateField(key: string, raw: string) {
    const meta = CONFIG_META[key];
    if (meta?.type === "number") {
      const num = raw === "" ? 0 : Number(raw);
      setFormValues((prev) => ({ ...prev, [key]: isNaN(num) ? (prev[key] ?? 0) : num }));
    } else {
      setFormValues((prev) => ({ ...prev, [key]: raw }));
    }
  }

  function resetField(key: string) {
    const entry = data.globalConfig[key];
    if (entry) {
      setFormValues((prev) => ({ ...prev, [key]: entry.default }));
    }
  }

  function resetAll() {
    const reset: Record<string, string | number> = {};
    for (const [key, entry] of Object.entries(data.globalConfig)) {
      reset[key] = entry.default;
    }
    setFormValues(reset);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateGlobalConfig(formValues);

      if (result.success) {
        toast({ title: "Config saved", description: "Changes are live immediately." });
        router.refresh();
      } else {
        toast({
          title: "Save failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  const totalServerMissing = Object.values(data.serverEnv).filter((v) => v === "MISSING").length;
  const totalClientMissing = Object.values(data.clientEnv).filter((v) => v === "MISSING").length;

  return (
    <Tabs defaultValue="config">
      <TabsList className="border-b border-border mb-6 bg-transparent gap-4">
        <TabsTrigger value="config" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
          Global Config
        </TabsTrigger>
        <TabsTrigger value="server-env" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2">
          Server Env
          {totalServerMissing > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              {totalServerMissing}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="client-env" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2">
          Client Env
          {totalClientMissing > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              {totalClientMissing}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="modalities" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
          Modalities
        </TabsTrigger>
      </TabsList>

      {/* ─── Global Config (Editable) ─── */}
      <TabsContent value="config">
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            These values are stored in the database and take effect immediately.
            The code default is shown below each field. Overridden values are highlighted.
          </span>
        </div>

        <Card glass>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Platform Config</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={!hasChanges && overriddenKeys.size === 0}
                onClick={resetAll}
              >
                <RotateCcw className="h-3 w-3" />
                Reset All to Defaults
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={!hasChanges || isPending}
                onClick={handleSave}
              >
                {isPending ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5">
              {Object.entries(data.globalConfig).map(([key, entry]) => {
                const meta = CONFIG_META[key];
                if (!meta) return null;

                const currentVal = formValues[key];
                const isOverridden = currentVal !== entry.default;
                const isDirty = currentVal !== entry.value;

                return (
                  <div
                    key={key}
                    className={`grid gap-1.5 p-3 rounded-lg transition-colors ${
                      isOverridden ? "bg-primary/5 border border-primary/20" : "border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                        {meta.label}
                        {isOverridden && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary/40">
                            overridden
                          </Badge>
                        )}
                        {isDirty && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-warning/20 text-warning">
                            unsaved
                          </Badge>
                        )}
                      </Label>
                      {isOverridden && (
                        <button
                          type="button"
                          onClick={() => resetField(key)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          reset
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        id={key}
                        type={meta.type === "number" ? "number" : "text"}
                        min={meta.type === "number" ? 0 : undefined}
                        value={currentVal ?? ""}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="max-w-xs h-9 font-mono text-sm"
                      />
                      {meta.unit && (
                        <span className="text-xs text-muted-foreground">{meta.unit}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">
                      Default: <code className="font-mono">{String(entry.default)}</code>
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Server Env ─── */}
      <TabsContent value="server-env">
        <div className="flex items-start justify-between gap-4 mb-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Server-side environment variables. Secrets are masked — only the first 4 and last 3 characters are shown.
              Optional variables showing MISSING may be intentionally unset.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 shrink-0"
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/admin/super-settings/env-example";
              a.download = ".env.example";
              a.click();
            }}
          >
            <Download className="h-3 w-3" />
            Export .env.example
          </Button>
        </div>
        {Object.entries(SERVER_ENV_GROUPS).map(([groupKey, group]) => (
          <EnvSection
            key={groupKey}
            title={group.title}
            description={group.description}
            entries={group.keys
              .filter((k) => k in data.serverEnv)
              .map((k) => [k, data.serverEnv[k]!])}
          />
        ))}
      </TabsContent>

      {/* ─── Client Env ─── */}
      <TabsContent value="client-env">
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Client-side (<code className="text-foreground">NEXT_PUBLIC_</code>) environment variables.
            These are bundled into the frontend at build time.
          </span>
        </div>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Client Environment</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(data.clientEnv).map(([key, value]) => (
              <EnvRow key={key} label={key} value={value} />
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Modalities ─── */}
      <TabsContent value="modalities">
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Available technique modalities per product type. Used for batch scheduling and session titles.
          </span>
        </div>
        {Object.entries(data.modalities).map(([product, mods]) => (
          <Card glass key={product} className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">{product.replace("_", " ")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mods.map((mod) => (
                  <Badge key={mod} variant="secondary" className="font-normal">
                    {mod}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}
