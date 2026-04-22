import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { WhatsAppRateLimitForm } from "./whatsapp-rate-limit-form";
import { WhatsAppQrDisplay } from "./whatsapp-qr-display";
import { getConfig } from "@/lib/config";

const SETTING_KEY = "whatsapp_rate_limit";

function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default async function AdminSettingsPage() {
  const [setting, botStatus, config] = await Promise.all([
    prisma.setting.findUnique({ where: { key: SETTING_KEY } }),
    prisma.setting.findUnique({ where: { key: "wa_bot_status" } }),
    getConfig(),
  ]);

  const defaults = {
    perMinute: config.WHATSAPP_RATE_LIMIT_PER_MINUTE,
    perDay: config.WHATSAPP_RATE_LIMIT_PER_DAY,
  };

  const value = setting?.value as { perMinute?: number; perDay?: number } | null;
  const initial = {
    perMinute: value?.perMinute ?? defaults.perMinute,
    perDay: value?.perDay ?? defaults.perDay,
  };

  const bot = botStatus?.value as {
    status?: string;
    lastHeartbeat?: string;
    uptimeMs?: number;
    queueDepth?: number;
    reconnectAttempts?: number;
    totalResetCycles?: number;
    lastError?: string;
    reason?: string;
  } | null;

  const lastHeartbeat = bot?.lastHeartbeat
    ? new Date(bot.lastHeartbeat).getTime()
    : 0;
  const isRecent = Date.now() - lastHeartbeat < 120_000;
  const isConnected = isRecent && bot?.status === "connected";

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Settings</h1>

      {/* Bot Status Panel */}
      <Card glass className="max-w-2xl mb-6">
        <CardHeader>
          <CardTitle>WhatsApp Bot Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Status</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  isConnected
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected ? "bg-success" : "bg-destructive"
                  }`}
                />
                {isConnected ? "Connected" : bot?.status || "Unknown"}
              </span>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Uptime</p>
              <p className="font-medium">
                {bot?.uptimeMs ? formatUptime(bot.uptimeMs) : "--"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Queue</p>
              <p className="font-medium">
                {bot?.queueDepth != null ? `${bot.queueDepth} pending` : "--"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Reconnects</p>
              <p className="font-medium">
                {bot?.reconnectAttempts != null ? bot.reconnectAttempts : "--"}
                {(bot?.totalResetCycles ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({bot!.totalResetCycles} resets)
                  </span>
                )}
              </p>
            </div>
          </div>
          {bot?.lastError && !isConnected && (
            <p className="text-xs text-destructive mt-3">
              Last error: {bot.lastError}
            </p>
          )}
          {bot?.lastHeartbeat && (
            <p className="text-xs text-muted-foreground mt-2">
              Last heartbeat: {new Date(bot.lastHeartbeat).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card glass className="max-w-2xl mb-6">
        <CardHeader>
          <CardTitle>WhatsApp QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            When the WhatsApp bot service starts without a saved session, a QR code
            will appear here for scanning.
          </p>
          <WhatsAppQrDisplay />
        </CardContent>
      </Card>

      <Card glass className="max-w-2xl">
        <CardHeader>
          <CardTitle>WhatsApp Rate Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Configure per-user rate limits for WhatsApp messages. Changes apply within a minute
            on the bot service.
          </p>
          <WhatsAppRateLimitForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
