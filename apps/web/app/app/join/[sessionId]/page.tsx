import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { JoinWaitingRoom } from "./join-waiting-room";

export default async function JoinSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      product: true,
      batch: true,
      bookings: {
        where: { userId: user.id, status: "CONFIRMED" },
        select: { id: true },
      },
    },
  });

  if (!session) redirect("/app");

  // Check eligibility: must have a booking or active membership
  const hasBooking = session.bookings.length > 0;
  if (!hasBooking) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        OR: [
          { plan: { productId: session.productId } },
          { plan: { product: { type: "BUNDLE" } } },
        ],
      },
    });
    if (!membership) redirect("/app");
  }

  return (
    <JoinWaitingRoom
      sessionId={session.id}
      title={session.title || session.batch?.name || session.product.name}
      productName={session.product.name}
      productType={session.product.type}
      startsAt={session.startsAt.toISOString()}
      endsAt={session.endsAt.toISOString()}
      joinUrl={session.joinUrl}
    />
  );
}
