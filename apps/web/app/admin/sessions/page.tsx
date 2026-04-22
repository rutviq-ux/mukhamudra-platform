import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { SessionTable } from "./session-table";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminSessionsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const now = new Date();

  const [upcomingSessions, batches, coaches, stats] = await Promise.all([
    prisma.session.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 100,
      include: {
        batch: { select: { name: true, slug: true, timezone: true } },
        product: { select: { name: true } },
        coach: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.batch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["COACH", "ADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    Promise.all([
      prisma.session.count({
        where: { startsAt: { gte: now }, status: "SCHEDULED" },
      }),
      prisma.session.count({
        where: { status: "IN_PROGRESS" },
      }),
      prisma.session.count({
        where: {
          startsAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
      }),
    ]),
  ]);

  const [scheduledCount, inProgressCount, todayCount] = stats;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-light">Sessions</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-semibold">{todayCount}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-semibold">{scheduledCount}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-semibold">{inProgressCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Session List */}
      <Card glass>
        <CardHeader>
          <CardTitle>Upcoming Sessions ({upcomingSessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionTable
            sessions={upcomingSessions.map((s) => ({
              ...s,
              startsAt: s.startsAt.toISOString(),
              endsAt: s.endsAt.toISOString(),
            }))}
            batches={batches}
            coaches={coaches}
          />
        </CardContent>
      </Card>
    </div>
  );
}
