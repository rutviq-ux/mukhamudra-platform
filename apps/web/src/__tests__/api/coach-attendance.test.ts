import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "admin", role: "ADMIN" }),
}));

vi.mock("@/lib/audit-log", () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@ru/db", () => ({
  prisma: {
    attendance: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { POST } from "../../../app/api/coach/attendance/route";

describe("/api/coach/attendance", () => {
  it("marks attendance", async () => {
    const request = new NextRequest("http://localhost/api/coach/attendance", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "2b3c2a3d-3f3b-4d56-8bc6-8ab9e9c06f1d",
        userId: "7f56a06c-8b21-4a3e-8bf2-d8d85593f30b",
        attended: true,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
