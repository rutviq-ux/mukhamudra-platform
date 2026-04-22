import { prisma } from "@ru/db";
import { requireCoach } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { Users, Clock, CheckCircle2 } from "lucide-react";
import { getConfig } from "@/lib/config";
import { getTimezoneOffsetMs } from "@/lib/sessions";

// Client components
import { AttendanceToggle } from "./attendance-toggle";
import { SessionActions } from "./session-actions";

export default async function CoachDashboardPage() {
  const [user, config] = await Promise.all([requireCoach(), getConfig()]);
  const tz = config.DEFAULT_TIMEZONE; // "Asia/Kolkata"

  // Build today's boundaries in the platform timezone.
  // Use Intl to get the current date string in IST, then construct UTC bounds.
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // "2026-02-26"
  const startOfDay = new Date(`${todayStr}T00:00:00Z`);
  const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

  // Adjust from local TZ to UTC: if tz is Asia/Kolkata (+5:30),
  // midnight IST = 18:30 UTC previous day
  const tzOffsetMs = getTimezoneOffsetMs(tz, startOfDay);
  const startUtc = new Date(startOfDay.getTime() - tzOffsetMs);
  const endUtc = new Date(endOfDay.getTime() - tzOffsetMs);

  const sessions = await prisma.session.findMany({
    where: {
      coachId: user.id,
      startsAt: { gte: startUtc, lte: endUtc },
      // Only show sessions from active batches (or unbatched sessions)
      OR: [
        { batch: { isActive: true } },
        { batchId: null },
      ],
    },
    include: {
      product: true,
      batch: { select: { timezone: true } },
      bookings: {
        include: {
          user: true,
        },
      },
      attendances: true,
    },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light">Coach Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your sessions for today, {now.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: tz,
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {sessions.length === 0 ? (
          <Card glass className="p-12 text-center text-muted-foreground">
            No sessions scheduled for today.
          </Card>
        ) : (
          sessions.map((session) => {
            const sessionTz = session.batch?.timezone || tz;
            return (
              <Card key={session.id} glass>
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {session.title || session.product.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.startsAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: sessionTz,
                        })}
                        {" - "}
                        {new Date(session.endsAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: sessionTz,
                        })}
                      </p>
                    </div>
                  </div>
                  <SessionActions
                    sessionId={session.id}
                    joinUrl={session.joinUrl}
                    calendarEventId={session.calendarEventId}
                    meetingId={session.meetingId}
                    recordingUrl={session.recordingUrl}
                    status={session.status}
                  />
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{session.bookings.length} Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">{session.attendances.length} Attended</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Attendees</h4>
                    {session.bookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bookings yet.</p>
                    ) : (
                      <div className="grid gap-2">
                        {session.bookings.map((booking) => {
                          const isAttended = session.attendances.some(
                            (a) => a.userId === booking.userId,
                          );
                          return (
                            <div
                              key={booking.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium">
                                  {booking.user.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {booking.user.name || booking.user.email}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {booking.user.phone}
                                  </p>
                                </div>
                              </div>
                              <AttendanceToggle
                                sessionId={session.id}
                                userId={booking.userId}
                                initiallyChecked={isAttended}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

