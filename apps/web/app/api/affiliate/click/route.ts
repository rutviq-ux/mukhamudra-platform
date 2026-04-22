import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";

const log = createLogger("api:affiliate:click");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    await prisma.affiliateProduct.update({
      where: { id: productId },
      data: { clickCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error({ err: error }, "Failed to track affiliate click");
    return NextResponse.json({ ok: true }); // Silently succeed for the client
  }
}
