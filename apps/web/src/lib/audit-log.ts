import type { NextRequest } from "next/server";
import { prisma } from "@ru/db";
import type { User, UserRole } from "@ru/db";
import { createLogger } from "@ru/config";

const log = createLogger("audit-log");

type AuditActor = Pick<User, "id" | "role">;

interface AuditLogInput {
  actor?: AuditActor | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
  ip?: string;
  userAgent?: string;
}

function getRequestIp(request?: NextRequest) {
  if (!request) return undefined;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return undefined;
}

export async function logAdminAction({
  actor,
  action,
  targetType,
  targetId,
  metadata,
  request,
  ip,
  userAgent,
}: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id,
        actorRole: actor?.role as UserRole | undefined,
        action,
        targetType,
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ip: getRequestIp(request) ?? ip,
        userAgent: request?.headers.get("user-agent") ?? userAgent,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Audit log write failed");
  }
}
