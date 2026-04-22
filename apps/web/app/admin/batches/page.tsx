import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { BatchManager } from "./batch-manager";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminBatchesPage() {
  const [batches, products] = await Promise.all([
    prisma.batch.findMany({
      orderBy: { name: "asc" },
      include: {
        product: { select: { id: true, name: true, type: true } },
        _count: { select: { sessions: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = batches.map((b) => ({
    ...b,
    daysOfWeekLabels: b.daysOfWeek.map((d) => DAY_NAMES[d]).join(", "),
    productType: b.product.type,
    endsAt: b.endsAt ? b.endsAt.toISOString().split("T")[0]! : null,
    dayModalities: (b.dayModalities ?? null) as Record<string, string[]> | null,
  }));

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Batches</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Batches</p>
            <p className="text-2xl font-semibold">{batches.length}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold">
              {batches.filter((b) => b.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sessions</p>
            <p className="text-2xl font-semibold">
              {batches.reduce((sum, b) => sum + b._count.sessions, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchManager batches={serialized} products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
