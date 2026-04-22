import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { CreditCard, TrendingUp } from "lucide-react";
import Link from "next/link";
import { OrderStatusActions } from "./order-status-actions";

export default async function AdminPaymentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [orders, stats] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: {
          select: { name: true, product: { select: { name: true } } },
        },
        coupon: { select: { code: true } },
      },
    }),
    Promise.all([
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "FAILED" } }),
      prisma.order.count({ where: { status: "REFUNDED" } }),
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { amountPaise: true },
      }),
      prisma.order.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum: { amountPaise: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: {
          status: "PAID",
          paidAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { amountPaise: true },
      }),
    ]),
  ]);

  const [
    paid,
    pending,
    failed,
    refunded,
    totalRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
  ] = stats;

  const totalRevenueINR = (totalRevenue._sum.amountPaise || 0) / 100;
  const thisMonthINR = (thisMonthRevenue._sum.amountPaise || 0) / 100;
  const lastMonthINR = (lastMonthRevenue._sum.amountPaise || 0) / 100;
  const momChange =
    lastMonthINR > 0
      ? ((thisMonthINR - lastMonthINR) / lastMonthINR) * 100
      : 0;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Payments</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold">
              ₹{totalRevenueINR.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-semibold">
              ₹{thisMonthINR.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {thisMonthRevenue._count} orders
              {momChange !== 0 && (
                <span
                  className={
                    momChange > 0 ? "text-success ml-1" : "text-destructive ml-1"
                  }
                >
                  ({momChange > 0 ? "+" : ""}
                  {momChange.toFixed(0)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid / Pending</p>
            <p className="text-2xl font-semibold">
              <span className="text-success">{paid}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-warning">{pending}</span>
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Failed / Refunded
            </p>
            <p className="text-2xl font-semibold">
              <span className="text-destructive">{failed}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-primary">{refunded}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium hidden md:table-cell">Plan</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium hidden md:table-cell">Coupon</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium hidden md:table-cell">Razorpay ID</th>
                    <th className="p-3 font-medium hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const amountINR = order.amountPaise / 100;
                    const discountINR = order.discountPaise / 100;

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <Link
                            href={`/admin/users/${order.user.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            <div className="font-medium">
                              {order.user.name || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.user.email}
                            </div>
                          </Link>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="font-medium">{order.plan.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.plan.product.name}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">
                            ₹{amountINR.toLocaleString("en-IN")}
                          </div>
                          {discountINR > 0 && (
                            <div className="text-xs text-success">
                              -₹{discountINR.toLocaleString("en-IN")}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">
                          {order.coupon ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {order.coupon.code}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3">
                          <OrderStatusActions
                            orderId={order.id}
                            status={order.status}
                            planName={order.plan.name}
                            amountPaise={order.amountPaise}
                          />
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <code className="text-xs text-muted-foreground font-mono">
                            {order.razorpayPaymentId || order.razorpayOrderId}
                          </code>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs hidden lg:table-cell">
                          {(order.paidAt || order.createdAt).toLocaleDateString(
                            "en-IN",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No orders yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
