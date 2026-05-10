import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ru/db";
import { getRecordingAccessInfo } from "@/lib/recording-access";
import { google } from "googleapis";

// Google Drive folder IDs
const FOLDER_IDS = {
  PRANAYAMA: "1PUQOmctCCNwDZtP1EbVSOhxW0NWpixel",
  FACE_YOGA: "113XeriQOlOdr2SbJNytEOQzrJq0oR5vy",
};

async function getDriveClient() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!keyBase64) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 not set");

  const key = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf-8"));

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

async function getFilesFromFolder(drive: any, folderId: string, label: string) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
    fields: "files(id, name, createdTime, size, webViewLink, thumbnailLink)",
    orderBy: "createdTime desc",
    pageSize: 100,
  });

  return (res.data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    createdAt: file.createdTime,
    size: file.size,
    url: `https://drive.google.com/file/d/${file.id}/view`,
    embedUrl: `https://drive.google.com/file/d/${file.id}/preview`,
    thumbnail: file.thumbnailLink,
    program: label,
  }));
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check recording access
  const accessInfo = await getRecordingAccessInfo(user.id);
  if (!accessInfo.hasAccess) {
    return NextResponse.json({ error: "No recording access" }, { status: 403 });
  }

  // Determine which folders to fetch based on membership
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { plan: { include: { product: true } } },
  });

  const productTypes = new Set<string>();
  for (const m of memberships) {
    if (m.plan.product.type === "BUNDLE") {
      productTypes.add("FACE_YOGA");
      productTypes.add("PRANAYAMA");
    } else {
      productTypes.add(m.plan.product.type);
    }
  }

  try {
    const drive = await getDriveClient();
    const allRecordings: any[] = [];

    if (productTypes.has("FACE_YOGA")) {
      const files = await getFilesFromFolder(drive, FOLDER_IDS.FACE_YOGA, "Face Yoga");
      allRecordings.push(...files);
    }

    if (productTypes.has("PRANAYAMA")) {
      const files = await getFilesFromFolder(drive, FOLDER_IDS.PRANAYAMA, "Pranayama");
      allRecordings.push(...files);
    }

    // Sort by date descending
    allRecordings.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      recordings: allRecordings,
      accessInfo: {
        source: accessInfo.source,
        expiresAt: accessInfo.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("Drive API error:", error?.message ?? error);
    const msg = error?.message ?? "Unknown error";
    if (msg.includes("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64")) {
      return NextResponse.json({ error: "Google credentials not configured" }, { status: 500 });
    }
    if (msg.includes("403") || msg.includes("forbidden") || msg.includes("permission")) {
      return NextResponse.json({ error: "Drive folder not shared with service account" }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
