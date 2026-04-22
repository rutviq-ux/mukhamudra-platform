/**
 * WhatsApp Bot Service using whatsapp-web.js
 *
 * IMPORTANT: This service is for OPT-IN messaging only.
 * - Only sends messages to users who have explicitly opted in (whatsappOptIn=true)
 * - Provides rate limiting to prevent abuse
 * - Maintains audit logs of all messages
 * - Uses LocalAuth for session persistence
 *
 * Usage:
 * 1. Run `pnpm dev` in services/wa-bot
 * 2. Scan the QR code that appears in the terminal
 * 3. The bot will start processing queued messages
 *
 * DO NOT use this for spam or unsolicited messages.
 */

import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import whatsapp from "whatsapp-web.js";
import type { Client as WhatsAppClient } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { prisma } from "@ru/db";
import { CONFIG, createLogger } from "@ru/config";
import { checkRateLimit, updateMessageStatus } from "@ru/notifications";

const log = createLogger("wa-bot");

const { Client, LocalAuth } = whatsapp;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;
const RATE_LIMIT_CACHE_TTL_MS = 60_000;
const RATE_LIMIT_SETTING_KEY = "whatsapp_rate_limit";

/** After this many consecutive failures, do a full reset cycle instead of exiting */
const RECONNECT_CYCLE_LIMIT = 5;
/** Long cooldown between full reset cycles (5 minutes) */
const FULL_RESET_COOLDOWN_MS = 5 * 60_000;
const BASE_RECONNECT_DELAY_MS = 2000; // doubles each attempt: 2s → 4s → 8s → 16s → 32s
/** Cap exponential backoff at 60s */
const MAX_RECONNECT_DELAY_MS = 60_000;

const READY_TIMEOUT_MS = 60_000; // if ready doesn't fire within 60s of auth, restart

const JITTER_MIN_MS = 1000;
const JITTER_MAX_MS = 3000;

/** Expire QUEUED messages older than this (prevents message flood after long outage) */
const STALE_MESSAGE_THRESHOLD_MS = 24 * 60 * 60_000; // 24 hours

const AUTH_DATA_PATH = "./.wwebjs_auth";
const WEB_VERSION_CACHE_PATH = "./.wwebjs_cache";
const INDEXED_DB_PATH = join(
  AUTH_DATA_PATH,
  "session",
  "Default",
  "IndexedDB"
);

const FATAL_ERROR_PATTERNS = [
  "Evaluation failed",
  "Session closed",
  "Protocol error",
  "detached Frame",
  "Target closed",
  "Execution context was destroyed",
] as const;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const bootTime = Date.now();
let reconnectAttempts = 0;
let totalResetCycles = 0;
let readyTimeoutStrikes = 0;
let lastErrorReason: string | null = null;
let isShuttingDown = false;
let isReconnecting = false;
let activePollingTimer: ReturnType<typeof setTimeout> | null = null;
let activeHeartbeatTimer: ReturnType<typeof setTimeout> | null = null;
let staleCleanupTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Rate limit config (DB-cached)
// ---------------------------------------------------------------------------

let rateLimitCache: {
  config: { perMinute: number; perDay: number };
  expiresAt: number;
} | null = null;

async function getRateLimitConfig() {
  const defaults = {
    perMinute: CONFIG.WHATSAPP_RATE_LIMIT_PER_MINUTE,
    perDay: CONFIG.WHATSAPP_RATE_LIMIT_PER_DAY,
  };

  if (rateLimitCache && Date.now() < rateLimitCache.expiresAt) {
    return rateLimitCache.config;
  }

  const setting = await prisma.setting.findUnique({
    where: { key: RATE_LIMIT_SETTING_KEY },
  });

  const value = setting?.value as
    | { perMinute?: number; perDay?: number }
    | null;
  const config = {
    perMinute:
      typeof value?.perMinute === "number"
        ? value.perMinute
        : defaults.perMinute,
    perDay:
      typeof value?.perDay === "number" ? value.perDay : defaults.perDay,
  };

  rateLimitCache = { config, expiresAt: Date.now() + RATE_LIMIT_CACHE_TTL_MS };
  return config;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFatalError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return FATAL_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function jitterDelay(): Promise<void> {
  const ms =
    Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) +
    JITTER_MIN_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markBotOffline(reason: string): Promise<void> {
  lastErrorReason = reason;
  try {
    await prisma.setting.upsert({
      where: { key: "wa_bot_status" },
      update: {
        value: {
          status: "offline",
          reason,
          lastHeartbeat: new Date().toISOString(),
          uptimeMs: Date.now() - bootTime,
          reconnectAttempts,
          totalResetCycles,
          lastError: reason,
        },
      },
      create: {
        key: "wa_bot_status",
        value: {
          status: "offline",
          reason,
          lastHeartbeat: new Date().toISOString(),
          uptimeMs: Date.now() - bootTime,
          reconnectAttempts,
          totalResetCycles,
          lastError: reason,
        },
      },
    });
  } catch (err) {
    log.error({ err }, "Failed to mark bot offline in DB");
  }
}

async function clearIndexedDB(): Promise<void> {
  if (existsSync(INDEXED_DB_PATH)) {
    try {
      await rm(INDEXED_DB_PATH, { recursive: true, force: true });
      log.info(
        { path: INDEXED_DB_PATH },
        "Cleared IndexedDB cache"
      );
    } catch (err) {
      log.error({ err }, "Failed to clear IndexedDB cache");
    }
  }

  // Also clear the WhatsApp Web version cache — stale versions cause
  // the stuck-at-loading-screen issue (auth succeeds but ready never fires)
  if (existsSync(WEB_VERSION_CACHE_PATH)) {
    try {
      await rm(WEB_VERSION_CACHE_PATH, { recursive: true, force: true });
      log.info(
        { path: WEB_VERSION_CACHE_PATH },
        "Cleared WhatsApp Web version cache"
      );
    } catch (err) {
      log.error({ err }, "Failed to clear web version cache");
    }
  }
}

/**
 * Send an admin alert email via DB-stored admin emails.
 * Uses direct Listmonk API call since this service has network access.
 * Falls back silently if Listmonk is unreachable (WA bot shouldn't crash over alerts).
 */
async function sendAdminAlert(subject: string, body: string): Promise<void> {
  try {
    // Read admin alert config from settings
    const setting = await prisma.setting.findUnique({
      where: { key: "admin_alert_config" },
    });

    const config = setting?.value as {
      emails?: string[];
      listmonkUrl?: string;
      listmonkUser?: string;
      listmonkPassword?: string;
    } | null;

    if (!config?.emails?.length || !config.listmonkUrl) {
      log.warn("No admin alert config found — skipping email alert");
      return;
    }

    const authHeader = `Basic ${Buffer.from(
      `${config.listmonkUser || "admin"}:${config.listmonkPassword || ""}`
    ).toString("base64")}`;

    for (const email of config.emails) {
      await fetch(`${config.listmonkUrl}/api/tx`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber_email: email,
          template_id: 1, // default transactional template
          data: {
            subject,
            body,
            timestamp: new Date().toISOString(),
          },
          content_type: "html",
        }),
        signal: AbortSignal.timeout(10_000),
      });
    }

    log.info({ emails: config.emails }, "Admin alert email sent");
  } catch (err) {
    // Alert failure should never crash the bot
    log.error({ err }, "Failed to send admin alert email");
  }
}

/**
 * Expire QUEUED WhatsApp messages older than the threshold.
 * Prevents a flood of stale messages being sent after a long outage.
 */
async function expireStaleMessages(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - STALE_MESSAGE_THRESHOLD_MS);

    const result = await prisma.messageLog.updateMany({
      where: {
        channel: "WHATSAPP",
        status: "QUEUED",
        createdAt: { lt: cutoff },
      },
      data: {
        status: "FAILED",
        error: "Message expired — queued for over 24 hours",
      },
    });

    if (result.count > 0) {
      log.warn(
        { expired: result.count, cutoff: cutoff.toISOString() },
        "Expired stale QUEUED messages"
      );
    }

    return result.count;
  } catch (err) {
    log.error({ err }, "Failed to expire stale messages");
    return 0;
  }
}

/** Periodically clean up stale messages (runs every hour) */
function startStaleMessageCleanup(): void {
  const CLEANUP_INTERVAL_MS = 60 * 60_000; // 1 hour

  const run = async () => {
    if (isShuttingDown) return;
    await expireStaleMessages();
    staleCleanupTimer = setTimeout(run, CLEANUP_INTERVAL_MS);
  };

  // Run immediately on startup, then hourly
  run();
}

/** Destroy the client and wait for the Puppeteer browser to fully exit */
async function destroyClient(client: WhatsAppClient): Promise<void> {
  try {
    await client.destroy();
  } catch (err) {
    log.error({ err }, "Error during client destroy");
  }
  // Give the browser process time to fully release file locks (Windows EPERM fix)
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

function createWhatsAppClient(): WhatsAppClient {
  return new Client({
    authStrategy: new LocalAuth({
      dataPath: AUTH_DATA_PATH,
    }),
    webVersionCache: {
      type: "local",
      path: WEB_VERSION_CACHE_PATH,
    },
        puppeteer: {
      headless: true,
      protocolTimeout: 120000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-features=site-per-process,Translate,BackForwardCache",
        "--window-size=1280,720",
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

async function bootClient(
  onReady: (client: WhatsAppClient) => void
): Promise<void> {
  const client = createWhatsAppClient();
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  let isReady = false;

  client.on("qr", async (qr: string) => {
    log.info("Scan QR code with WhatsApp");
    qrcode.generate(qr, { small: true });
    try {
      await prisma.setting.upsert({
        where: { key: "wa_bot_qr" },
        update: {
          value: {
            qr,
            generatedAt: new Date().toISOString(),
            status: "pending_scan",
          },
        },
        create: {
          key: "wa_bot_qr",
          value: {
            qr,
            generatedAt: new Date().toISOString(),
            status: "pending_scan",
          },
        },
      });
    } catch (err) {
      log.error({ err }, "Failed to store QR code in DB");
    }
  });

  client.on("authenticated", async () => {
    log.info("WhatsApp authenticated successfully");
    reconnectAttempts = 0;

    // Guard: only start one ready timeout (authenticated can fire multiple times)
    if (readyTimer) {
      log.debug("Ready timer already running, skipping duplicate");
      return;
    }

    // Start ready timeout — if ready doesn't fire within 60s, force restart
    readyTimer = setTimeout(async () => {
      if (isReady) return;
      readyTimeoutStrikes++;
      log.error(
        { strike: readyTimeoutStrikes },
        "Client stuck after authentication — ready event not received within timeout"
      );

      await destroyClient(client);

      // Clear all caches to fix the stuck-at-loading-screen issue.
      // This nukes both IndexedDB (stale session data) and .wwebjs_cache
      // (stale WhatsApp Web version HTML) — forces a fresh download.
      log.warn("Clearing caches before next attempt");
      await clearIndexedDB();

      await scheduleReconnect(onReady);
    }, READY_TIMEOUT_MS);

    try {
      await prisma.setting.upsert({
        where: { key: "wa_bot_qr" },
        update: {
          value: {
            qr: null,
            generatedAt: null,
            status: "authenticated",
          },
        },
        create: {
          key: "wa_bot_qr",
          value: {
            qr: null,
            generatedAt: null,
            status: "authenticated",
          },
        },
      });
    } catch (err) {
      log.error({ err }, "Failed to clear QR code from DB");
    }
  });

  client.on("auth_failure", (msg: string) => {
    log.error({ msg }, "WhatsApp authentication failed");
  });

  client.on("ready", () => {
    log.info("WhatsApp client ready");
    isReady = true;
    if (readyTimer) clearTimeout(readyTimer);
    reconnectAttempts = 0;
    readyTimeoutStrikes = 0;
    lastErrorReason = null;
    onReady(client);
  });

  client.on("disconnected", async (reason: string) => {
    log.warn({ reason }, "WhatsApp disconnected");

    // Cancel all timers before destroying
    if (readyTimer) clearTimeout(readyTimer);
    if (activePollingTimer) clearTimeout(activePollingTimer);
    if (activeHeartbeatTimer) clearTimeout(activeHeartbeatTimer);

    await destroyClient(client);
    await scheduleReconnect(onReady);
  });

  log.info(
    { attempt: reconnectAttempts || "initial" },
    "Initializing WhatsApp client"
  );

  try {
    await client.initialize();
  } catch (err) {
    log.error({ err }, "client.initialize() failed");

    // Clean up the failed client before reconnecting
    if (readyTimer) clearTimeout(readyTimer);
    await destroyClient(client);
    await scheduleReconnect(onReady);
  }
}

async function scheduleReconnect(
  onReady: (client: WhatsAppClient) => void
): Promise<void> {
  // Prevent concurrent reconnection attempts (e.g. multiple authenticated events)
  if (isReconnecting) {
    log.debug("Reconnect already in progress, skipping duplicate call");
    return;
  }

  if (isShuttingDown) {
    log.info("Shutdown in progress, skipping reconnect");
    return;
  }

  isReconnecting = true;

  if (reconnectAttempts >= RECONNECT_CYCLE_LIMIT) {
    // Full reset cycle: clear everything and try again after a long cooldown.
    // The bot should NEVER permanently exit — Docker restart: always is the last resort.
    totalResetCycles++;
    const reason = `Full reset cycle #${totalResetCycles} after ${reconnectAttempts} failed attempts`;
    lastErrorReason = reason;

    log.error({ cycle: totalResetCycles, attempts: reconnectAttempts }, reason);
    await markBotOffline("reconnect_reset_cycle");

    // Alert admins (email, since WA is down)
    await sendAdminAlert(
      "WhatsApp Bot — Connection Reset",
      `<p>The WhatsApp bot has failed to connect after <strong>${reconnectAttempts}</strong> attempts.</p>
       <p>Reset cycle: <strong>#${totalResetCycles}</strong></p>
       <p>The bot will clear all caches, wait <strong>5 minutes</strong>, and try again.</p>
       <p>If this repeats, check:</p>
       <ul>
         <li>WhatsApp Web may be down globally</li>
         <li>The linked phone may have lost internet</li>
         <li>The session may have been logged out from the phone</li>
         <li>Server may need more memory for Puppeteer</li>
       </ul>`
    );

    // Expire stale messages before coming back online
    await expireStaleMessages();

    // Clear all caches for a fresh start
    log.warn("Clearing all caches before full reset");
    await clearIndexedDB();

    // Reset counter and wait a long time before trying again
    reconnectAttempts = 0;

    log.info(
      { cooldownMs: FULL_RESET_COOLDOWN_MS },
      "Waiting for full reset cooldown"
    );
    await new Promise((resolve) => setTimeout(resolve, FULL_RESET_COOLDOWN_MS));
    isReconnecting = false;
    await bootClient(onReady);
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(
    BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1),
    MAX_RECONNECT_DELAY_MS
  );
  lastErrorReason = `reconnect attempt ${reconnectAttempts}`;

  log.warn(
    { attempt: reconnectAttempts, delayMs: delay },
    "Scheduling reconnect with backoff"
  );

  await new Promise((resolve) => setTimeout(resolve, delay));
  isReconnecting = false;
  await bootClient(onReady);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function setupShutdownHandlers(): void {
  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    log.info({ signal }, "Shutdown signal received, stopping bot");

    if (activePollingTimer) clearTimeout(activePollingTimer);
    if (activeHeartbeatTimer) clearTimeout(activeHeartbeatTimer);
    if (staleCleanupTimer) clearTimeout(staleCleanupTimer);

    await markBotOffline("graceful_shutdown");

    try {
      await prisma.$disconnect();
    } catch (err) {
      log.error({ err }, "Error disconnecting Prisma");
    }

    log.info("Bot shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// ---------------------------------------------------------------------------
// WhatsApp Group Management
// ---------------------------------------------------------------------------

const GROUP_ACTIONS_KEY = "pending_group_actions";
const GROUP_IDS_KEY = "whatsapp_groups";

interface GroupAction {
  id: string;
  type: "add" | "remove";
  phone: string;
  batchSlug: string;
  createdAt: string;
}

async function getGroupIds(): Promise<Record<string, string>> {
  const setting = await prisma.setting.findUnique({
    where: { key: GROUP_IDS_KEY },
  });
  return (setting?.value as Record<string, string>) || {};
}

async function processGroupActions(client: WhatsAppClient): Promise<void> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: GROUP_ACTIONS_KEY },
    });

    const actions = (setting?.value as GroupAction[] | null) || [];
    if (actions.length === 0) return;

    const groupIds = await getGroupIds();
    const remaining: GroupAction[] = [];

    for (const action of actions) {
      const groupId = groupIds[action.batchSlug];
      if (!groupId) {
        log.warn(
          { batchSlug: action.batchSlug },
          "No WhatsApp group ID configured for batch — skipping"
        );
        remaining.push(action);
        continue;
      }

      try {
        const phone = action.phone.replace(/[^0-9]/g, "");
        const participantId = `${phone}@c.us`;
        const chat = await client.getChatById(groupId);

        if (!("addParticipants" in chat)) {
          log.warn({ groupId }, "Chat is not a group — skipping");
          continue;
        }

        const groupChat = chat as any; // GroupChat type

        if (action.type === "add") {
          await groupChat.addParticipants([participantId]);
          log.info(
            { phone, batchSlug: action.batchSlug },
            "Added user to WhatsApp group"
          );
        } else {
          await groupChat.removeParticipants([participantId]);
          log.info(
            { phone, batchSlug: action.batchSlug },
            "Removed user from WhatsApp group"
          );
        }
      } catch (err) {
        log.error(
          { err, action },
          "Failed to process group action — will send invite link as fallback"
        );

        // Fallback: send the group invite link directly to the user
        if (action.type === "add") {
          try {
            const chat = await client.getChatById(groupId);
            const groupChat = chat as any;
            const inviteCode = await groupChat.getInviteCode();
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            const phone = action.phone.replace(/[^0-9]/g, "");
            await client.sendMessage(
              `${phone}@c.us`,
              `Welcome to Mukha Mudra! 🙏\n\nJoin your batch's WhatsApp group here:\n${inviteLink}`
            );
            log.info({ phone }, "Sent group invite link as fallback");
          } catch (fallbackErr) {
            log.error({ err: fallbackErr }, "Fallback invite link also failed");
          }
        }
      }
    }

    // Update setting with any remaining (failed) actions
    await prisma.setting.upsert({
      where: { key: GROUP_ACTIONS_KEY },
      update: { value: remaining as any },
      create: { key: GROUP_ACTIONS_KEY, value: remaining as any },
    });
  } catch (err) {
    log.error({ err }, "Error processing group actions");
  }
}

/**
 * Queue a group action (called from webhook handlers via DB).
 * This is a static helper — the wa-bot reads these from the DB.
 */
export async function queueGroupAction(
  type: "add" | "remove",
  phone: string,
  batchSlug: string
): Promise<void> {
  const setting = await prisma.setting.findUnique({
    where: { key: GROUP_ACTIONS_KEY },
  });

  const actions = (setting?.value as GroupAction[] | null) || [];
  actions.push({
    id: crypto.randomUUID(),
    type,
    phone,
    batchSlug,
    createdAt: new Date().toISOString(),
  });

  await prisma.setting.upsert({
    where: { key: GROUP_ACTIONS_KEY },
    update: { value: actions as any },
    create: { key: GROUP_ACTIONS_KEY, value: actions as any },
  });
}

// ---------------------------------------------------------------------------
// Message processor (polling loop)
// ---------------------------------------------------------------------------

function startMessageProcessor(client: WhatsAppClient): void {
  let clientDead = false;

  const processQueue = async (): Promise<void> => {
    if (isShuttingDown || clientDead) return;

    try {
      const rateLimitConfig = await getRateLimitConfig();

      const queuedMessages = await prisma.messageLog.findMany({
        where: { channel: "WHATSAPP", status: "QUEUED" },
        include: {
          user: { select: { whatsappOptIn: true } },
        },
        take: 10,
        orderBy: { createdAt: "asc" },
      });

      for (const msg of queuedMessages) {
        if (isShuttingDown || clientDead) break;

        // Opt-in guard (skip if user exists but hasn't opted in)
        if (msg.user && !msg.user.whatsappOptIn) {
          log.warn({ to: msg.to }, "Skipping message — user not opted in");
          await updateMessageStatus(msg.id, "FAILED", {
            error: "User has not opted in to WhatsApp messages",
          });
          continue;
        }

        // Rate limit check
        const rlKey = `whatsapp:${msg.to}`;
        const { allowed } = await checkRateLimit(rlKey, rateLimitConfig);
        if (!allowed) {
          log.debug({ to: msg.to }, "Rate limited, skipping this cycle");
          continue;
        }

        try {
          const phone = msg.to.replace(/[^0-9]/g, "");
          if (phone.length < 7 || phone.length > 15) {
            await updateMessageStatus(msg.id, "FAILED", {
              error: `Invalid phone number after stripping: "${msg.to}" → "${phone}"`,
            });
            log.warn({ to: msg.to, msgId: msg.id }, "Skipping message — invalid phone number");
            continue;
          }
          const chatId = `${phone}@c.us`;

          const sentMsg = await client.sendMessage(chatId, msg.body);

          await updateMessageStatus(msg.id, "SENT", {
            providerMessageId: sentMsg.id.id,
          });

          log.info({ to: msg.to, msgId: msg.id }, "Message sent");

          // Inter-message jitter (skip after last message in batch)
          if (msg !== queuedMessages[queuedMessages.length - 1]) {
            await jitterDelay();
          }
        } catch (err) {
          log.error(
            { err, to: msg.to, msgId: msg.id },
            "Failed to send message"
          );

          // Fatal error = client is dead, stop polling and reconnect
          if (isFatalError(err)) {
            log.error(
              { err },
              "Fatal client error detected, triggering reconnect"
            );
            clientDead = true;

            await updateMessageStatus(msg.id, "FAILED", {
              error:
                err instanceof Error ? err.message : "Fatal client error",
            });

            await destroyClient(client);
            await scheduleReconnect(startMessageProcessor);
            return;
          }

          // Non-fatal: mark message failed, continue with next
          await updateMessageStatus(msg.id, "FAILED", {
            error:
              err instanceof Error ? err.message : "Unknown send error",
          });
        }
      }
    } catch (err) {
      log.error({ err }, "Error processing message queue");
    }

    // Process pending group actions (add/remove from WhatsApp groups)
    if (!isShuttingDown && !clientDead) {
      await processGroupActions(client);
    }

    // Schedule next poll (only if client is still alive and not shutting down)
    if (!isShuttingDown && !clientDead) {
      activePollingTimer = setTimeout(processQueue, POLL_INTERVAL_MS);
    }
  };

  // Start polling
  processQueue();

  // Active heartbeat — verifies client is actually connected
  const updateHeartbeat = async (): Promise<void> => {
    if (isShuttingDown || clientDead) return;

    let waState: string | null = null;
    try {
      waState = await client.getState();
    } catch (err) {
      // getState() failing means Puppeteer context is dead
      log.error({ err }, "Failed to get client state — session may be dead");
      waState = null;
    }

    const isConnected = waState === "CONNECTED";

    if (!isConnected && waState !== null) {
      log.warn(
        { waState },
        "Client state is not CONNECTED — session may have been logged out"
      );
    }

    // If state is null (dead) or not connected for this check, trigger reconnect
    if (waState === null) {
      log.error("Client state is null — triggering reconnect");
      clientDead = true;
      if (activePollingTimer) clearTimeout(activePollingTimer);

      await destroyClient(client);
      await scheduleReconnect(startMessageProcessor);
      return;
    }

    // Count pending messages for queue depth reporting
    let queueDepth = 0;
    try {
      queueDepth = await prisma.messageLog.count({
        where: { channel: "WHATSAPP", status: "QUEUED" },
      });
    } catch {
      // Non-critical — just report 0
    }

    const heartbeatData = {
      status: isConnected ? "connected" : waState?.toLowerCase(),
      lastHeartbeat: new Date().toISOString(),
      uptimeMs: Date.now() - bootTime,
      queueDepth,
      reconnectAttempts,
      totalResetCycles,
      lastError: lastErrorReason,
    };

    try {
      await prisma.setting.upsert({
        where: { key: "wa_bot_status" },
        update: { value: heartbeatData },
        create: { key: "wa_bot_status", value: heartbeatData },
      });
    } catch (err) {
      log.error({ err }, "Failed to update heartbeat");
    }

    if (!isShuttingDown && !clientDead) {
      activeHeartbeatTimer = setTimeout(
        updateHeartbeat,
        HEARTBEAT_INTERVAL_MS
      );
    }
  };
  updateHeartbeat();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log.info("WhatsApp Bot Service starting");
  log.info("This bot only sends messages to OPT-IN users");

  setupShutdownHandlers();

  // Expire stale messages from previous outages before reconnecting
  const expired = await expireStaleMessages();
  if (expired > 0) {
    log.info({ expired }, "Cleaned up stale messages from previous outage");
  }

  // Start periodic stale message cleanup (every hour)
  startStaleMessageCleanup();

  await bootClient(startMessageProcessor);
}

main().catch((err) => log.fatal({ err }, "WhatsApp bot crashed"));
