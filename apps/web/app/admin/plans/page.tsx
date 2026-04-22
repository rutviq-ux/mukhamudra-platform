import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { PlanManager } from "./plan-manager";

export default async function AdminPlansPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const [plans, products] = await Promise.all([
    prisma.plan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        product: { select: { id: true, name: true, type: true } },
        _count: { select: { orders: true, memberships: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const activePlans = plans.filter((p) => p.isActive);
  const productsWithPlans = new Set(plans.map((p) => p.productId)).size;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Plans</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Plans</p>
            <p className="text-2xl font-semibold">{plans.length}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold text-success">
              {activePlans.length}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Products with Plans
            </p>
            <p className="text-2xl font-semibold">{productsWithPlans}</p>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanManager
            plans={plans.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            }))}
            products={products}
          />
        </CardContent>
      </Card>
    </div>
  );
}
