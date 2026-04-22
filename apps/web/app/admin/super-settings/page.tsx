import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { CONFIG, MODALITIES } from "@ru/config";
import { SettingsTabs } from "./settings-tabs";

/** Mask a secret value, showing first 4 and last 3 chars */
function mask(val: string | undefined): string {
  if (!val) return "MISSING";
  if (val.length <= 10) return "SET";
  return `${val.slice(0, 4)}..${val.slice(-3)}`;
}

/** Check presence — returns "SET" or "MISSING" */
function presence(val: string | undefined): "SET" | "MISSING" {
  return val ? "SET" : "MISSING";
}

export default async function SuperSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const liveConfig = await getConfig();

  const globalConfig = {
    JOIN_WINDOW_BEFORE_MIN: { value: liveConfig.JOIN_WINDOW_BEFORE_MIN, default: CONFIG.JOIN_WINDOW_BEFORE_MIN },
    JOIN_WINDOW_AFTER_MIN: { value: liveConfig.JOIN_WINDOW_AFTER_MIN, default: CONFIG.JOIN_WINDOW_AFTER_MIN },
    SESSION_GENERATION_DAYS: { value: liveConfig.SESSION_GENERATION_DAYS, default: CONFIG.SESSION_GENERATION_DAYS },
    WHATSAPP_RATE_LIMIT_PER_MINUTE: { value: liveConfig.WHATSAPP_RATE_LIMIT_PER_MINUTE, default: CONFIG.WHATSAPP_RATE_LIMIT_PER_MINUTE },
    WHATSAPP_RATE_LIMIT_PER_DAY: { value: liveConfig.WHATSAPP_RATE_LIMIT_PER_DAY, default: CONFIG.WHATSAPP_RATE_LIMIT_PER_DAY },
    CURRENCY: { value: liveConfig.CURRENCY, default: CONFIG.CURRENCY },
    CURRENCY_SUBUNIT: { value: liveConfig.CURRENCY_SUBUNIT, default: CONFIG.CURRENCY_SUBUNIT },
    DEFAULT_TIMEZONE: { value: liveConfig.DEFAULT_TIMEZONE, default: CONFIG.DEFAULT_TIMEZONE },
    RECORDING_ADDON_PAISE: { value: liveConfig.RECORDING_ADDON_PAISE, default: CONFIG.RECORDING_ADDON_PAISE },
    RECORDING_ACCESS_DAYS: { value: liveConfig.RECORDING_ACCESS_DAYS, default: CONFIG.RECORDING_ACCESS_DAYS },
    DEFAULT_COACH_EMAIL: { value: liveConfig.DEFAULT_COACH_EMAIL, default: CONFIG.DEFAULT_COACH_EMAIL },
  };

  const modalities = {
    FACE_YOGA: [...MODALITIES.FACE_YOGA],
    PRANAYAMA: [...MODALITIES.PRANAYAMA],
  };

  const serverEnv: Record<string, string> = {
    DATABASE_URL: mask(process.env.DATABASE_URL),
    NODE_ENV: process.env.NODE_ENV ?? "MISSING",
    CLERK_SECRET_KEY: mask(process.env.CLERK_SECRET_KEY),
    CLERK_WEBHOOK_SECRET: presence(process.env.CLERK_WEBHOOK_SECRET),
    RAZORPAY_KEY_ID: mask(process.env.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: mask(process.env.RAZORPAY_KEY_SECRET),
    RAZORPAY_WEBHOOK_SECRET: presence(process.env.RAZORPAY_WEBHOOK_SECRET),
    GHOST_URL: process.env.GHOST_URL ?? "MISSING",
    GHOST_CONTENT_API_KEY: mask(process.env.GHOST_CONTENT_API_KEY),
    GHOST_ADMIN_API_KEY: presence(process.env.GHOST_ADMIN_API_KEY),
    LISTMONK_URL: process.env.LISTMONK_URL ?? "MISSING",
    LISTMONK_API_USER: presence(process.env.LISTMONK_API_USER),
    LISTMONK_API_PASSWORD: presence(process.env.LISTMONK_API_PASSWORD),
    WA_BOT_ENABLED: process.env.WA_BOT_ENABLED ?? "false",
    WA_BOT_SESSION_PATH: process.env.WA_BOT_SESSION_PATH ?? "./wa-session",
    GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: presence(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64),
    GOOGLE_IMPERSONATE_EMAIL: process.env.GOOGLE_IMPERSONATE_EMAIL ?? "MISSING",
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID ?? "primary",
    INSTAGRAM_ACCESS_TOKEN: presence(process.env.INSTAGRAM_ACCESS_TOKEN),
    INSTAGRAM_PAGE_ID: presence(process.env.INSTAGRAM_PAGE_ID),
    INSTAGRAM_VERIFY_TOKEN: presence(process.env.INSTAGRAM_VERIFY_TOKEN),
    INSTAGRAM_APP_SECRET: presence(process.env.INSTAGRAM_APP_SECRET),
    CRON_SECRET: presence(process.env.CRON_SECRET),
    QSTASH_TOKEN: presence(process.env.QSTASH_TOKEN),
    QSTASH_URL: process.env.QSTASH_URL ?? "MISSING",
    QSTASH_CURRENT_SIGNING_KEY: presence(process.env.QSTASH_CURRENT_SIGNING_KEY),
    QSTASH_NEXT_SIGNING_KEY: presence(process.env.QSTASH_NEXT_SIGNING_KEY),
    VAPID_PUBLIC_KEY: presence(process.env.VAPID_PUBLIC_KEY),
    VAPID_PRIVATE_KEY: presence(process.env.VAPID_PRIVATE_KEY),
    VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? "MISSING",
  };

  const clientEnv: Record<string, string> = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: mask(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/auth/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/auth/sign-up",
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/app",
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ?? "/onboarding",
    NEXT_PUBLIC_RAZORPAY_KEY_ID: mask(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: presence(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    NEXT_PUBLIC_POSTHOG_KEY: presence(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light">Super Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform configuration, environment variables, and system constants
          </p>
        </div>
      </div>

      <SettingsTabs
        initialData={{ globalConfig, modalities, serverEnv, clientEnv }}
      />
    </div>
  );
}
