import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { SequenceManager } from "./sequence-manager";

export default async function AdminSequencesPage() {
  const sequences = await prisma.sequence.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
        include: { template: { select: { id: true, name: true, channel: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  });

  const templates = await prisma.messageTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, channel: true },
  });

  const stats = {
    total: sequences.length,
    active: sequences.filter((s) => s.isActive).length,
    totalEnrollments: sequences.reduce((sum, s) => sum + s._count.enrollments, 0),
  };

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Automation Sequences</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sequences</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Enrollments</p>
            <p className="text-2xl font-semibold">{stats.totalEnrollments}</p>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>All Sequences</CardTitle>
        </CardHeader>
        <CardContent>
          <SequenceManager
            sequences={sequences.map((s) => ({
              ...s,
              createdAt: s.createdAt.toISOString(),
              updatedAt: s.updatedAt.toISOString(),
              steps: s.steps.map((step) => ({
                ...step,
                createdAt: step.createdAt.toISOString(),
                updatedAt: step.updatedAt.toISOString(),
              })),
            }))}
            templates={templates}
          />
        </CardContent>
      </Card>
    </div>
  );
}
