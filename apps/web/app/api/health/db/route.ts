import { NextResponse } from "next/server";
import { prisma } from "@ru/db";

export async function GET() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", error: "Database unreachable" },
      { status: 503 },
    );
  }
}
