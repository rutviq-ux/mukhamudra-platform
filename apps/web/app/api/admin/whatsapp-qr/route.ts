import { NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: "wa_bot_qr" },
    });

    if (!setting) {
      return NextResponse.json({
        qr: null,
        status: "no_data",
        message: "WhatsApp bot has not generated a QR code yet. Start the bot service first.",
      });
    }

    const value = setting.value as {
      qr: string | null;
      generatedAt: string | null;
      status: string;
    };

    return NextResponse.json({
      qr: value.qr,
      status: value.status,
      generatedAt: value.generatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch QR code" },
      { status: 500 }
    );
  }
}
