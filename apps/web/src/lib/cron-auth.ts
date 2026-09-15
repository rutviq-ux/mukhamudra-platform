import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";

type CronHandler = (request: NextRequest) => Promise<NextResponse>;

export function withCronAuth(handler: CronHandler) {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    return handler;
  }

  const qstashHandler = process.env.QSTASH_CURRENT_SIGNING_KEY
    ? verifySignatureAppRouter(handler)
    : null;

  return async (request: NextRequest) => {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (secret && authHeader === `Bearer ${secret}`) {
      return handler(request);
    }

    if (qstashHandler) {
      return qstashHandler(request);
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  };
}
