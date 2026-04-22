import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getCurrentUser } from "@/lib/auth";
import { getRecordingAccessInfo } from "@/lib/recording-access";

const log = createLogger("api:recordings");

/**
 * GET /api/recordings?page=1&limit=20
 *
 * Returns paginated session recordings for users with active RecordingAccess
 * or an active bundle-annual membership.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to continue" },
        { status: 401 }
      );
    }

    // Check recording access (paid add-on OR bundle-annual)
    const accessInfo = await getRecordingAccessInfo(user.id);

    if (!accessInfo.hasAccess) {
      // Check if user has an annual membership (eligible for paid add-on)
      const annualMembership = await prisma.membership.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          plan: {
            interval: "ANNUAL",
            product: { type: { not: "BUNDLE" } },
          },
        },
      });

      return NextResponse.json({
        hasAccess: false,
        isEligible: !!annualMembership,
        recordings: [],
        total: 0,
      });
    }

    // Parse pagination
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // Get user's accessible product types (from memberships)
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

    const productFilter =
      productTypes.size > 0
        ? { product: { type: { in: [...productTypes] as any } } }
        : undefined;

    // Get completed sessions with recordings for user's products
    const [recordings, total] = await Promise.all([
      prisma.session.findMany({
        where: {
          recordingUrl: { not: null },
          status: "COMPLETED",
          ...productFilter,
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          recordingUrl: true,
          batch: {
            select: {
              name: true,
              slug: true,
              product: { select: { type: true, name: true } },
            },
          },
        },
        orderBy: { startsAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.session.count({
        where: {
          recordingUrl: { not: null },
          status: "COMPLETED",
          ...productFilter,
        },
      }),
    ]);

    return NextResponse.json({
      hasAccess: true,
      expiresAt: accessInfo.expiresAt,
      source: accessInfo.source,
      recordings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    log.error({ err: error }, "Failed to fetch recordings");
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 }
    );
  }
}
