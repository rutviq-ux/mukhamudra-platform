import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ru/db";
import { getRecordingAccessInfo } from "@/lib/recording-access";
import { google } from "googleapis";

const ALLOWED_FOLDER_IDS = new Set([
  "1PUQOmctCCNwDZtP1EbVSOhxW0NWpixel", // Pranayama
  "113XeriQOlOdr2SbJNytEOQzrJq0oR5vy", // Face Yoga
]);

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

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  // 1. Auth check
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 2. Recording access check
  const accessInfo = await getRecordingAccessInfo(user.id);
  if (!accessInfo.hasAccess) {
    return NextResponse.json({ error: "No recording access" }, { status: 403 });
  }

  const { fileId } = params;

  // 3. Validate the fileId belongs to one of our allowed folders
  //    (prevents using this endpoint to proxy arbitrary Drive files)
  const drive = await getDriveClient();
  const fileMeta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, parents, size",
  });

  const parents = fileMeta.data.parents ?? [];
  const isAllowed = parents.some((p) => ALLOWED_FOLDER_IDS.has(p));
  if (!isAllowed) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // 4. Also check the user's membership covers this folder
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { plan: { include: { product: true } } },
  });

  const allowedFolders = new Set<string>();
  for (const m of memberships) {
    if (m.plan.product.type === "BUNDLE") {
      allowedFolders.add("1PUQOmctCCNwDZtP1EbVSOhxW0NWpixel");
      allowedFolders.add("113XeriQOlOdr2SbJNytEOQzrJq0oR5vy");
    } else if (m.plan.product.type === "FACE_YOGA") {
      allowedFolders.add("113XeriQOlOdr2SbJNytEOQzrJq0oR5vy");
    } else if (m.plan.product.type === "PRANAYAMA") {
      allowedFolders.add("1PUQOmctCCNwDZtP1EbVSOhxW0NWpixel");
    }
  }

  const userCanAccessFile = parents.some((p) => allowedFolders.has(p));
  if (!userCanAccessFile) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // 5. Stream the file through our server
  const mimeType = fileMeta.data.mimeType ?? "video/mp4";
  const fileSize = Number(fileMeta.data.size ?? 0);

  // Handle range requests for video seeking
  const rangeHeader = req.headers.get("range");
  let start = 0;
  let end = fileSize - 1;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      start = parseInt(match[1], 10);
      end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    }
  }

  const chunkSize = end - start + 1;

  const driveResponse = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    {
      responseType: "stream",
      headers: rangeHeader
        ? { Range: `bytes=${start}-${end}` }
        : undefined,
    }
  );

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Disposition": `inline; filename="${fileMeta.data.name ?? "recording"}"`,
  };

  if (fileSize > 0) {
    headers["Content-Length"] = String(chunkSize);
    if (rangeHeader) {
      headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
    }
  }

  const status = rangeHeader ? 206 : 200;

  // Pipe the Drive stream into a ReadableStream for Next.js
  const readable = new ReadableStream({
    start(controller) {
      const stream = driveResponse.data as NodeJS.ReadableStream;
      stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(readable, { status, headers });
}
