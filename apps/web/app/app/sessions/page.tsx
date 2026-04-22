import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { SessionsCalendar } from "./sessions-calendar";

export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const userTimezone = user.timezone || "Asia/Kolkata";

  // Get user's active memberships (product-level)
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { plan: { include: { product: true } } },
  });

  const hasFaceYogaAccess = memberships.some(
    (m) =>
      m.plan.product.type === "FACE_YOGA" ||
      m.plan.product.type === "BUNDLE"
  );

  const hasPranayamaAccess = memberships.some(
    (m) =>
      m.plan.product.type === "PRANAYAMA" ||
      m.plan.product.type === "BUNDLE"
  );

  // Build product filter: only show sessions matching the user's subscription
  const accessibleProductTypes: string[] = [];
  if (hasFaceYogaAccess) accessibleProductTypes.push("FACE_YOGA");
  if (hasPranayamaAccess) accessibleProductTypes.push("PRANAYAMA");

  // Get available sessions for next 14 days
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: now, lte: twoWeeksLater },
      ...(accessibleProductTypes.length > 0
        ? { product: { type: { in: accessibleProductTypes as any } } }
        : {}),
    },
    include: {
      product: true,
      batch: true,
      bookings: {
        where: { status: "CONFIRMED" },
        select: { id: true, userId: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return (
    <SessionsCalendar
      sessions={sessions.map((s) => ({
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        title: s.title,
        capacity: s.capacity,
        modalities: s.modalities,
        joinUrl: s.joinUrl,
        product: { name: s.product.name, type: s.product.type },
        batch: s.batch
          ? { name: s.batch.name, timezone: s.batch.timezone }
          : null,
        bookings: s.bookings,
      }))}
      userId={user.id}
      userTimezone={userTimezone}
      hasFaceYogaAccess={hasFaceYogaAccess}
      hasPranayamaAccess={hasPranayamaAccess}
    />
  );
}
