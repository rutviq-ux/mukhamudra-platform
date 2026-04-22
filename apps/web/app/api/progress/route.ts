import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { progressUploadSchema, validateRequest, createLogger } from "@ru/config";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

const log = createLogger("api:progress");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.progressMedia.findMany({
    where: { userId: user.id },
    orderBy: { capturedAt: "desc" },
    take: 60,
  });

  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type");
    const notes = formData.get("notes");
    const weekNumber = formData.get("weekNumber");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    const validation = validateRequest(progressUploadSchema, {
      type,
      notes: typeof notes === "string" && notes.length ? notes : undefined,
      weekNumber:
        typeof weekNumber === "string" && weekNumber.length
          ? Number(weekNumber)
          : undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const fileName = `${validation.data.type.toLowerCase()}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "progress", user.id);
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/progress/${user.id}/${fileName}`;

    const entry = await prisma.progressMedia.create({
      data: {
        userId: user.id,
        type: validation.data.type,
        url,
        notes: validation.data.notes,
        weekNumber: validation.data.weekNumber,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    log.error({ err: error }, "Failed to upload progress");
    return NextResponse.json(
      { error: "Failed to upload progress" },
      { status: 500 }
    );
  }
}
