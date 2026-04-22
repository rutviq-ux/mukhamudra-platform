import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { CouponManager } from "./coupon-manager";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Coupons</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Coupons</p>
            <p className="text-2xl font-semibold">{coupons.length}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold">
              {coupons.filter((c) => c.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Uses</p>
            <p className="text-2xl font-semibold">
              {coupons.reduce((sum, c) => sum + c.usedCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <CouponManager coupons={coupons.map((c) => ({
            ...c,
            validFrom: c.validFrom.toISOString(),
            validUntil: c.validUntil?.toISOString() ?? null,
          }))} />
        </CardContent>
      </Card>
    </div>
  );
}
