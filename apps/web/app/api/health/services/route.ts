import { NextResponse } from "next/server";
import { prisma } from "@ru/db";

interface ServiceStatus {
  status: "ok" | "error" | "unknown";
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export async function GET() {
  const services: Record<string, ServiceStatus> = {};

  // Check WhatsApp bot heartbeat
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "wa_bot_status" },
    });
    if (setting) {
      const value = setting.value as {
        status?: string;
        lastHeartbeat?: string;
        uptimeMs?: number;
        queueDepth?: number;
        reconnectAttempts?: number;
        totalResetCycles?: number;
        lastError?: string;
      };
      const lastHeartbeat = value?.lastHeartbeat
        ? new Date(value.lastHeartbeat).getTime()
        : 0;
      const isRecent = Date.now() - lastHeartbeat < 120_000; // 2 min threshold
      services.whatsapp = {
        status: isRecent && value?.status === "connected" ? "ok" : "error",
        error: !isRecent
          ? "Heartbeat stale"
          : value?.status !== "connected"
            ? `State: ${value?.status || "unknown"}`
            : undefined,
        latencyMs: isRecent ? Date.now() - lastHeartbeat : undefined,
        details: {
          uptimeMs: value?.uptimeMs,
          queueDepth: value?.queueDepth,
          reconnectAttempts: value?.reconnectAttempts,
          totalResetCycles: value?.totalResetCycles,
          lastError: value?.lastError,
        },
      };
    } else {
      services.whatsapp = { status: "unknown", error: "No heartbeat found" };
    }
  } catch {
    services.whatsapp = { status: "error", error: "Failed to check" };
  }

  // Check Ghost CMS
  try {
    const ghostUrl = process.env.GHOST_URL;
    if (ghostUrl) {
      const start = Date.now();
      const res = await fetch(`${ghostUrl}/ghost/api/content/settings/`, {
        signal: AbortSignal.timeout(5000),
        headers: { "Accept-Version": "v5" },
      });
      services.ghost = {
        status: res.ok ? "ok" : "error",
        latencyMs: Date.now() - start,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } else {
      services.ghost = { status: "unknown", error: "Not configured" };
    }
  } catch {
    services.ghost = { status: "error", error: "Unreachable" };
  }

  // Check Listmonk
  try {
    const listmonkUrl = process.env.LISTMONK_URL;
    if (listmonkUrl) {
      const start = Date.now();
      const res = await fetch(`${listmonkUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      services.listmonk = {
        status: res.ok ? "ok" : "error",
        latencyMs: Date.now() - start,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } else {
      services.listmonk = { status: "unknown", error: "Not configured" };
    }
  } catch {
    services.listmonk = { status: "error", error: "Unreachable" };
  }

  const allOk = Object.values(services).every((s) => s.status === "ok");

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      services,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
