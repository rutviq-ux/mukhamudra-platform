import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { getRecordingAccessInfo } from "@/lib/recording-access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ru/ui";
import { Film, Lock, Play, Calendar, Clock } from "lucide-react";
import { RecordingAddonCheckout } from "@/components/recording-addon-checkout";

export default async function RecordingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Check recording access (paid add-on OR bundle-annual)
  const accessInfo = await getRecordingAccessInfo(user.id);

  // Check if user is eligible for the paid add-on (has non-bundle annual membership)
  const annualMembership = !accessInfo.hasAccess
    ? await prisma.membership.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          plan: {
            interval: "ANNUAL",
            product: { type: { not: "BUNDLE" } },
          },
        },
      })
    : null;

  const isMonthlyOnly =
    !accessInfo.hasAccess &&
    !annualMembership &&
    (await prisma.membership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        plan: { interval: "MONTHLY" },
      },
    }));

  // ─── No access: show upsell ───
  if (!accessInfo.hasAccess) {
    return (
      <div className="space-y-8">
        <div>
          <h1
            className="text-2xl md:text-3xl font-light tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Recordings
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Revisit your sessions anytime
          </p>
        </div>

        <Card className="void-card max-w-lg mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-[rgba(196,136,58,0.1)] flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-[#C4883A]" />
            </div>
            <CardTitle
              className="text-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recording Access
            </CardTitle>
            <CardDescription>
              {isMonthlyOnly
                ? "Recording access is available with annual plans only. Upgrade to an annual plan to unlock this feature."
                : annualMembership
                  ? "Add recording access for just ₹1,000/year and watch all session recordings: Face Yoga and Pranayama."
                  : "Subscribe to an annual plan to unlock recording access."}
            </CardDescription>
          </CardHeader>
          {annualMembership && (
            <CardContent>
              <RecordingAddonCheckout />
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // ─── Has access: show recordings for user's products ───
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

  // Determine access expiry for display
  const accessExpiresAt = accessInfo.expiresAt;

  const recordings = await prisma.session.findMany({
    where: {
      recordingUrl: { not: null },
      status: "COMPLETED",
      ...(productTypes.size > 0
        ? { product: { type: { in: [...productTypes] as any } } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      recordingUrl: true,
      batch: {
        select: {
          name: true,
          product: { select: { type: true, name: true } },
        },
      },
    },
    orderBy: { startsAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1
            className="text-2xl md:text-3xl font-light tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Recordings
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            {accessInfo.source === "bundle-annual"
              ? "Included with Bundle Annual"
              : "Recording Add-on"}
            {accessExpiresAt && (
              <>
                {" · expires "}
                {accessExpiresAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#C4883A]">
          <Film className="w-4 h-4" />
          <span>{recordings.length} recordings</span>
        </div>
      </div>

      {recordings.length === 0 ? (
        <Card className="void-card text-center py-12">
          <CardContent>
            <Film className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No recordings available yet. Recordings will appear here after
              your sessions are completed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <Card key={recording.id} className="void-card group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      {recording.title || recording.batch?.name || "Session"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {recording.batch?.product?.name}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-[rgba(196,136,58,0.1)] text-[#C4883A]">
                    {recording.batch?.product?.type === "FACE_YOGA"
                      ? "Face Yoga"
                      : "Pranayama"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {recording.startsAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recording.startsAt.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <a
                  href={recording.recordingUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#C4883A] hover:text-[#d4984a] transition-colors duration-300"
                >
                  <Play className="w-4 h-4" />
                  Watch Recording
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
