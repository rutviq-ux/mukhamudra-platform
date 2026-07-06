import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import {
  Calendar,
  Clock,
  Sparkles,
  Film,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// Convert "HH:mm" (24h) batch time to a friendly "h:mm AM/PM" label.
function formatBatchTime(hhmm: string): string {
  const parts = hhmm.split(":");
  const h = parseInt(parts[0] ?? "", 10);
  const m = parseInt(parts[1] ?? "", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export default async function MemberDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Get active memberships
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { plan: { include: { product: true } } },
  });

  const hasFaceYoga = memberships.some(
    (m) =>
      m.plan.product.type === "FACE_YOGA" ||
      m.plan.product.type === "BUNDLE"
  );
  const hasPranayama = memberships.some(
    (m) =>
      m.plan.product.type === "PRANAYAMA" ||
      m.plan.product.type === "BUNDLE"
  );

  // Find the relevant membership for period info
  const faceYogaMembership = memberships.find(
    (m) =>
      m.plan.product.type === "FACE_YOGA" ||
      m.plan.product.type === "BUNDLE"
  );
  const pranayamaMembership = memberships.find(
    (m) =>
      m.plan.product.type === "PRANAYAMA" ||
      m.plan.product.type === "BUNDLE"
  );

  // Recording access
  const recordingAccess = await prisma.recordingAccess.findFirst({
    where: { userId: user.id, isActive: true, expiresAt: { gt: new Date() } },
  });

  // Weekly schedule: active batches for the products this member is subscribed to
  const subscribedProductTypes = new Set<string>();
  for (const m of memberships) {
    const t = m.plan.product.type;
    if (t === "BUNDLE") {
      subscribedProductTypes.add("FACE_YOGA");
      subscribedProductTypes.add("PRANAYAMA");
    } else {
      subscribedProductTypes.add(t);
    }
  }

  const scheduleBatches = subscribedProductTypes.size
    ? await prisma.batch.findMany({
        where: {
          isActive: true,
          product: { type: { in: Array.from(subscribedProductTypes) as any } },
        },
        include: { product: { select: { type: true, name: true } } },
        orderBy: { startTime: "asc" },
      })
    : [];

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAY_NAMES_FULL = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];

  // Today's day-of-week in IST (batches are scheduled in IST)
  const istDayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });
  const todayDow = DAY_NAMES_FULL.indexOf(istDayStr);

  // Which subscribed batches run today
  const todaysClasses = scheduleBatches.filter((b) =>
    b.daysOfWeek.includes(todayDow)
  );

  // Get upcoming bookings
  const upcomingBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: "CONFIRMED",
      session: { startsAt: { gte: new Date() } },
    },
    include: { session: { include: { batch: true, product: true } } },
    orderBy: { session: { startsAt: "asc" } },
    take: 5,
  });

  const firstName = user.name?.split(" ")[0] || "there";
  const userTimezone = user.timezone || "Asia/Kolkata";

  // Time-based greeting (in user's timezone)
  const hour = parseInt(
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: userTimezone,
    }),
    10
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const faceYogaCard = (
    <div
      className="animate-[reveal-up_0.6s_ease_both]"
      style={{ animationDelay: "0.1s" }}
    >
      <Card glass className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Face Yoga</CardTitle>
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
        </CardHeader>
        <CardContent>
          {hasFaceYoga ? (
            <>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-lg font-semibold text-success">
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {faceYogaMembership?.plan.name}
              </p>
              {faceYogaMembership?.periodStart && (
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Started{" "}
                  {faceYogaMembership.periodStart.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {faceYogaMembership?.periodEnd && (
                <p className="text-xs text-muted-foreground/80 mt-0.5">
                  {faceYogaMembership.status === "ACTIVE" ? "Renews" : "Ends"}{" "}
                  {faceYogaMembership.periodEnd.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-muted-foreground/50">
                Not subscribed
              </div>
              <Link
                href="/face-yoga#checkout"
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-2 transition-colors"
              >
                Join Face Yoga
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const pranayamaCard = (
    <div
      className="animate-[reveal-up_0.6s_ease_both]"
      style={{ animationDelay: "0.2s" }}
    >
      <Card glass className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pranayama</CardTitle>
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {hasPranayama ? (
            <>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-lg font-semibold text-success">
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {pranayamaMembership?.plan.name}
              </p>
              {pranayamaMembership?.periodStart && (
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Started{" "}
                  {pranayamaMembership.periodStart.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {pranayamaMembership?.periodEnd && (
                <p className="text-xs text-muted-foreground/80 mt-0.5">
                  {pranayamaMembership.status === "ACTIVE" ? "Renews" : "Ends"}{" "}
                  {pranayamaMembership.periodEnd.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-muted-foreground/50">
                Not subscribed
              </div>
              <Link
                href="/pranayama#checkout"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2 transition-colors"
              >
                Join Pranayama
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const nextSessionCard = (
    <div
      className="animate-[reveal-up_0.6s_ease_both]"
      style={{ animationDelay: "0.3s" }}
    >
      <Card glass className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Next Session</CardTitle>
          <div className="p-1.5 rounded-lg bg-muted">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length > 0 ? (
            <>
              <div className="text-lg font-semibold">
                {new Date(
                  upcomingBookings[0]!.session.startsAt
                ).toLocaleDateString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  timeZone: userTimezone,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {new Date(
                  upcomingBookings[0]!.session.startsAt
                ).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: userTimezone,
                  timeZoneName: "short",
                })}
                {" \u00b7 "}
                {upcomingBookings[0]!.session.product?.name ||
                  upcomingBookings[0]!.session.batch?.name ||
                  "Session"}
              </p>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-muted-foreground/50">
                None booked
              </div>
              <Link
                href="/app/sessions"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2 transition-colors"
              >
                Book a session
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="relative">
      {/* Grain overlay for texture consistency with landing page */}
      <div className="grain-overlay pointer-events-none fixed inset-0 z-0 opacity-[0.03]" />

      {/* Greeting */}
      <div
        className="animate-[reveal-up_0.6s_ease_both] mb-8"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">
          {greeting}
        </p>
        <h1
          className="text-2xl md:text-3xl font-light"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&rsquo;s what&rsquo;s happening with your practice.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3 mb-8">
        {user.goal === "pranayama" ? (
          <>
            {pranayamaCard}
            {faceYogaCard}
            {nextSessionCard}
          </>
        ) : (
          <>
            {faceYogaCard}
            {pranayamaCard}
            {nextSessionCard}
          </>
        )}
      </div>

      {/* Recording access card */}
      {recordingAccess && (
        <div
          className="animate-[reveal-up_0.6s_ease_both] mb-8"
          style={{ animationDelay: "0.35s" }}
        >
          <Card glass>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-2.5 rounded-lg bg-[#C4883A]/10">
                <Film className="h-5 w-5 text-[#C4883A]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Recording Access</span>
                  <span className="text-[0.6rem] uppercase tracking-wider bg-[#C4883A]/15 text-[#C4883A] px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Until{" "}
                  {recordingAccess.expiresAt.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Link
                href="/app/recordings"
                className="inline-flex items-center gap-1 text-xs text-[#C4883A] hover:text-[#C4883A]/80 transition-colors shrink-0"
              >
                View recordings
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's class */}
      {todaysClasses.length > 0 && (
        <div
          className="animate-[reveal-up_0.6s_ease_both] mb-8"
          style={{ animationDelay: "0.37s" }}
        >
          <Card glass>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <span
                  className="text-lg font-light"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Today&rsquo;s Classes
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {todaysClasses.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded ${
                          b.product.type === "FACE_YOGA"
                            ? "bg-accent/15 text-accent"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {b.product.name}
                      </span>
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatBatchTime(b.startTime)} IST
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly schedule */}
      {scheduleBatches.length > 0 && (
        <div
          className="animate-[reveal-up_0.6s_ease_both] mb-8"
          style={{ animationDelay: "0.38s" }}
        >
          <Card glass>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <span
                  className="text-lg font-light"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Weekly Schedule
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {scheduleBatches.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded ${
                          b.product.type === "FACE_YOGA"
                            ? "bg-accent/15 text-accent"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {b.product.name}
                      </span>
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex gap-1">
                        {b.daysOfWeek
                          .slice()
                          .sort((a, z) => a - z)
                          .map((d) => (
                            <span
                              key={d}
                              className={`px-1.5 py-0.5 rounded ${
                                d === todayDow
                                  ? "bg-accent/20 text-accent font-medium"
                                  : "bg-muted"
                              }`}
                            >
                              {DAY_NAMES[d]}
                            </span>
                          ))}
                      </span>
                      <span className="font-medium text-foreground/70 ml-1">
                        {formatBatchTime(b.startTime)} IST
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[0.65rem] text-muted-foreground/50 mt-3">
                All times shown in IST. Book individual sessions from the{" "}
                <Link href="/app/sessions" className="text-primary hover:underline">
                  sessions page
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Sessions */}
      <div
        className="animate-[reveal-up_0.6s_ease_both]"
        style={{ animationDelay: "0.4s" }}
      >
        <Card glass>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <span
                  className="text-lg font-light"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Upcoming Sessions
                </span>
              </CardTitle>
              {upcomingBookings.length > 0 && (
                <Link
                  href="/app/sessions"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {upcomingBookings.map((booking, i) => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-muted/30 border border-border/50 transition-colors hover:border-border"
                    style={{
                      animationDelay: `${0.45 + i * 0.05}s`,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded ${
                            booking.session.product?.type === "FACE_YOGA"
                              ? "bg-accent/15 text-accent"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {booking.session.product?.name || "Session"}
                        </span>
                      </div>
                      <p className="font-medium text-sm">
                        {booking.session.title ||
                          booking.session.batch?.name ||
                          booking.session.product?.name ||
                          "Session"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(
                          booking.session.startsAt
                        ).toLocaleDateString("en-IN", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          timeZone: userTimezone,
                        })}{" "}
                        at{" "}
                        {new Date(
                          booking.session.startsAt
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: userTimezone,
                          timeZoneName: "short",
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/app/join/${booking.session.id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 shrink-0 self-start sm:self-center transition-colors"
                    >
                      Join
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No upcoming sessions
                </p>
                <Link
                  href="/app/sessions"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 mt-2 transition-colors"
                >
                  Book a session
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
