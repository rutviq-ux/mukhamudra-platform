import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { Users, CreditCard, Calendar, TrendingUp, UserPlus, Activity } from "lucide-react";

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    userCount,
    membershipCount,
    sessionCount,
    monthlyRevenue,
    lastMonthRevenue,
    recentOrders,
    planBreakdown,
    newUsersThisMonth,
    newUsersLastMonth,
    bookingsToday,
    leadsThisMonth,
    leadsLastMonth,
    attendanceThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.membership.count({ where: { status: "ACTIVE" } }),
    prisma.session.count({ where: { startsAt: { gte: now } } }),
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
    prisma.order.findMany({
      where: { status: "PAID" },
      include: { user: true, plan: true },
      orderBy: { paidAt: "desc" },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["planId"],
      where: { status: "PAID" },
      _count: true,
      _sum: { amountPaise: true },
    }),
    prisma.user.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
    }),
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        session: {
          startsAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
      },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
    }),
    prisma.attendance.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
  ]);

  // Get plan names for breakdown
  const planIds = planBreakdown.map((p) => p.planId);
  const plans = await prisma.plan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, name: true },
  });
  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  const revenueThisMonth = (monthlyRevenue._sum.amountPaise || 0) / 100;
  const revenueLastMonth = (lastMonthRevenue._sum.amountPaise || 0) / 100;
  const revenueChange =
    revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0;

  const userGrowth =
    newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
      : 0;

  const leadGrowth =
    leadsLastMonth > 0
      ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100
      : 0;

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Admin Dashboard</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-8">
        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground">
              +{newUsersThisMonth} this month
              {userGrowth !== 0 && (
                <span
                  className={
                    userGrowth > 0 ? "text-success ml-1" : "text-destructive ml-1"
                  }
                >
                  ({userGrowth > 0 ? "+" : ""}
                  {userGrowth.toFixed(0)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue (This Month)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {`₹${revenueThisMonth.toLocaleString("en-IN")}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyRevenue._count} orders
              {revenueChange !== 0 && (
                <span
                  className={
                    revenueChange > 0
                      ? "text-success ml-1"
                      : "text-destructive ml-1"
                  }
                >
                  ({revenueChange > 0 ? "+" : ""}
                  {revenueChange.toFixed(0)}% vs last month)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Memberships
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{membershipCount}</div>
            <p className="text-xs text-muted-foreground">
              {bookingsToday} bookings today
            </p>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Sessions
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sessionCount}</div>
            <p className="text-xs text-muted-foreground">scheduled</p>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Leads This Month
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{leadsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              leads captured
              {leadGrowth !== 0 && (
                <span
                  className={
                    leadGrowth > 0
                      ? "text-success ml-1"
                      : "text-destructive ml-1"
                  }
                >
                  ({leadGrowth > 0 ? "+" : ""}
                  {leadGrowth.toFixed(0)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance This Month
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendanceThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              sessions attended
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Plan Breakdown */}
        <Card glass>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {planBreakdown.length > 0 ? (
              <div className="space-y-3">
                {planBreakdown
                  .sort(
                    (a, b) =>
                      (b._sum.amountPaise || 0) - (a._sum.amountPaise || 0)
                  )
                  .map((plan) => {
                    const revenue = (plan._sum.amountPaise || 0) / 100;
                    const totalRevenue =
                      planBreakdown.reduce(
                        (sum, p) => sum + (p._sum.amountPaise || 0),
                        0
                      ) / 100;
                    const percentage =
                      totalRevenue > 0
                        ? ((revenue / totalRevenue) * 100).toFixed(0)
                        : 0;

                    return (
                      <div key={plan.planId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {planMap.get(plan.planId) || "Unknown"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {`₹${revenue.toLocaleString("en-IN")}`} ({plan._count}{" "}
                            orders)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                No orders yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders - spans 2 cols */}
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Plan</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="p-3">{order.user.email}</td>
                      <td className="p-3 text-muted-foreground">
                        {order.plan.name}
                      </td>
                      <td className="p-3 font-medium">
                        {`₹${(order.amountPaise / 100).toLocaleString("en-IN")}`}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {order.paidAt?.toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
