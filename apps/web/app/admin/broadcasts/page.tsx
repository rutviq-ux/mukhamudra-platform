import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { BroadcastManager } from "./broadcast-manager";

export default async function AdminBroadcastsPage() {
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      template: { select: { id: true, name: true, channel: true } },
      creator: { select: { name: true, email: true } },
    },
  });

  const templates = await prisma.messageTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, channel: true, body: true, variables: true },
  });

  const stats = {
    total: broadcasts.length,
    sent: broadcasts.filter((b) => b.status === "COMPLETED").length,
    totalRecipients: broadcasts.reduce((sum, b) => sum + b.sentCount, 0),
  };

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Broadcasts</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Broadcasts</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sent</p>
            <p className="text-2xl font-semibold">{stats.totalRecipients}</p>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>All Broadcasts</CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastManager
            broadcasts={broadcasts.map((b) => ({
              ...b,
              variables: b.variables as Record<string, string>,
              segment: b.segment as any,
              scheduledFor: b.scheduledFor?.toISOString() ?? null,
              startedAt: b.startedAt?.toISOString() ?? null,
              completedAt: b.completedAt?.toISOString() ?? null,
              createdAt: b.createdAt.toISOString(),
              updatedAt: b.updatedAt.toISOString(),
            }))}
            templates={templates}
          />
        </CardContent>
      </Card>
    </div>
  );
}
