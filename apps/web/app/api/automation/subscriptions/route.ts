import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { requireAutomationKey } from "@/lib/automation-auth";

const log = createLogger("api:automation:subscriptions");

/**
 * GET /api/automation/subscriptions
 *
 * NEW, READ-ONLY, ADDITIVE endpoint — does not modify any existing route,
 * file, or behavior. Returns membership/subscription records for external
 * read-only automation (e.g. Google Sheets sync). Auth is via an
 * `x-automation-key` header, checked by `requireAutomationKey`.
 */
export async function GET(request: NextRequest) {
    const authError = requireAutomationKey(request);
    if (authError) return authError;

  try {
        const memberships = await prisma.membership.findMany({
                orderBy: { createdAt: "desc" },
                take: 500,
                include: {
                          user: { select: { id: true, name: true, email: true, phone: true } },
                          plan: {
                                      select: {
                                                    name: true,
                                                    interval: true,
                                                    amountPaise: true,
                                                    product: { select: { name: true, type: true } },
                                      },
                          },
                },
        });

      return NextResponse.json({ memberships });
  } catch (error) {
        log.error({ err: error }, "Failed to list memberships for automation");
        return NextResponse.json(
          { error: "Failed to list memberships" },
          { status: 500 },
              );
  }
}
