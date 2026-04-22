import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { ProgressTracker } from "./progress-tracker";

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

  const [
    totalSessions,
    recentSessions,
    totalMinutes,
    completedBookings,
  ] = await Promise.all([
    prisma.attendance.count({
      where: { userId: user.id },
    }),
    prisma.attendance.count({
      where: {
        userId: user.id,
        joinedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.attendance.aggregate({
      where: { userId: user.id, durationMin: { not: null } },
      _sum: { durationMin: true },
    }),
    prisma.booking.count({
      where: { userId: user.id, status: "COMPLETED" },
    }),
  ]);

  const practiceMins = totalMinutes._sum.durationMin || 0;
  const practiceHours = Math.floor(practiceMins / 60);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-light mb-2">Progress Tracker</h1>
        <p className="text-muted-foreground">
          Track your practice and see your transformation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Sessions</p>
            </div>
            <p className="text-2xl font-bold">{totalSessions}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Last 30 Days</p>
            </div>
            <p className="text-2xl font-bold">{recentSessions}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Practice Time</p>
            </div>
            <p className="text-2xl font-bold">
              {practiceHours > 0 ? `${practiceHours}h ${practiceMins % 60}m` : `${practiceMins}m`}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <p className="text-2xl font-bold">{completedBookings}</p>
          </CardContent>
        </Card>
      </div>

      {/* Photo Tracker (client component) */}
      <ProgressTracker />
    </div>
  );
}
