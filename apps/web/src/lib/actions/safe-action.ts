import { z } from "zod";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit-log";
import { createLogger } from "@ru/config";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Audit config uses `any` for result to avoid generic inference conflicts.
// The result type is still fully typed at the ActionResult<TResult> level.
interface AuditConfig<TData> {
  action: string;
  targetType: string;
  getTargetId?: (data: TData, result: any) => string;
  getMetadata?: (data: TData, result: any) => Record<string, unknown>;
}

interface AdminActionOptions<TSchema extends z.ZodType, TResult> {
  schema: TSchema;
  allowedRoles?: string[];
  audit?: AuditConfig<z.infer<TSchema>>;
  handler: (params: {
    data: z.infer<TSchema>;
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  }) => Promise<TResult>;
}

// --- Authenticated user action (any logged-in user) ---

type UserType = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

interface AuthActionOptions<TSchema extends z.ZodType, TResult> {
  schema: TSchema;
  handler: (params: { data: z.infer<TSchema>; user: UserType }) => Promise<TResult>;
}

export function createAuthAction<TSchema extends z.ZodType, TResult>(
  name: string,
  options: AuthActionOptions<TSchema, TResult>,
) {
  const log = createLogger(`action:${name}`);

  return async (input: z.input<TSchema>): Promise<ActionResult<TResult>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: "Please sign in" };
      }

      const parsed = options.schema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".");
          (fieldErrors[key] ??= []).push(issue.message);
        }
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
          fieldErrors,
        };
      }

      const result = await options.handler({ data: parsed.data, user });
      return { success: true, data: result };
    } catch (error) {
      log.error({ err: error }, `Action ${name} failed`);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Something went wrong",
      };
    }
  };
}

// --- Public action (no auth required) ---

interface PublicActionOptions<TSchema extends z.ZodType, TResult> {
  schema: TSchema;
  handler: (params: { data: z.infer<TSchema> }) => Promise<TResult>;
}

export function createPublicAction<TSchema extends z.ZodType, TResult>(
  name: string,
  options: PublicActionOptions<TSchema, TResult>,
) {
  const log = createLogger(`action:${name}`);

  return async (input: z.input<TSchema>): Promise<ActionResult<TResult>> => {
    try {
      const parsed = options.schema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".");
          (fieldErrors[key] ??= []).push(issue.message);
        }
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
          fieldErrors,
        };
      }

      const result = await options.handler({ data: parsed.data });
      return { success: true, data: result };
    } catch (error) {
      log.error({ err: error }, `Action ${name} failed`);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Something went wrong",
      };
    }
  };
}

// --- Admin action (role-restricted + audit logging) ---

export function createAdminAction<TSchema extends z.ZodType, TResult>(
  name: string,
  options: AdminActionOptions<TSchema, TResult>,
) {
  const log = createLogger(`action:${name}`);

  return async (input: z.input<TSchema>): Promise<ActionResult<TResult>> => {
    try {
      const user = await getCurrentUser();
      const roles = options.allowedRoles ?? ["ADMIN"];
      if (!user || !roles.includes(user.role)) {
        return { success: false, error: "Unauthorized" };
      }

      const parsed = options.schema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".");
          (fieldErrors[key] ??= []).push(issue.message);
        }
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
          fieldErrors,
        };
      }

      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
      const userAgent = headerStore.get("user-agent") ?? undefined;

      const result = await options.handler({ data: parsed.data, user });

      if (options.audit) {
        logAdminAction({
          actor: user,
          action: options.audit.action,
          targetType: options.audit.targetType,
          targetId: options.audit.getTargetId?.(parsed.data, result),
          metadata: options.audit.getMetadata?.(parsed.data, result),
          ip,
          userAgent,
        }).catch((err) => log.error({ err }, "Audit log failed"));
      }

      return { success: true, data: result };
    } catch (error) {
      log.error({ err: error }, `Action ${name} failed`);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Something went wrong",
      };
    }
  };
}
