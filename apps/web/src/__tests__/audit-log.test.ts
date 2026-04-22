import { describe, expect, it, vi } from "vitest";

vi.mock("@ru/db", () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "log_1" }),
    },
  },
}));

import { logAdminAction } from "@/lib/audit-log";
import { prisma } from "@ru/db";

describe("logAdminAction", () => {
  it("writes an audit log entry", async () => {
    await logAdminAction({
      actor: { id: "user_1", role: "ADMIN" },
      action: "settings.update",
      targetType: "Setting",
      targetId: "setting_1",
      metadata: { perMinute: 10 },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "user_1",
          action: "settings.update",
          targetType: "Setting",
          targetId: "setting_1",
        }),
      })
    );
  });
});
