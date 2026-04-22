import { prisma } from "@ru/db";
import { MODALITIES } from "@ru/config";
import { Card, CardContent } from "@ru/ui";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { CoachManager } from "./coach-manager";

export default async function AdminCoachesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const config = await getConfig();
  const now = new Date();

  const [coaches, upcomingCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["COACH", "ADMIN"] } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        coachModalities: true,
        createdAt: true,
        _count: { select: { coachedSessions: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.session.count({
      where: {
        coachId: { not: null },
        startsAt: { gte: now },
        status: "SCHEDULED",
      },
    }),
  ]);

  // All available modalities (both product types combined)
  const allModalities = [
    ...MODALITIES.FACE_YOGA,
    ...MODALITIES.PRANAYAMA,
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light">Coaches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage coaches and their modalities.
            Default: <code className="text-foreground">{config.DEFAULT_COACH_EMAIL}</code>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Coaches</p>
            <p className="text-2xl font-semibold">{coaches.length}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Upcoming Assigned</p>
            <p className="text-2xl font-semibold">{upcomingCount}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Modalities Available</p>
            <p className="text-2xl font-semibold">{allModalities.length}</p>
          </CardContent>
        </Card>
      </div>

      <CoachManager
        initialCoaches={coaches.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        allModalities={allModalities}
        defaultCoachEmail={config.DEFAULT_COACH_EMAIL}
      />
    </div>
  );
}
