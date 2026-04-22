import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default async function AdminSubscriptionsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const [memberships, stats] = await Promise.all([
    prisma.membership.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: {
          select: {
            name: true,
            interval: true,
            amountPaise: true,
            product: { select: { name: true, type: true } },
          },
        },
      },
    }),
    Promise.all([
      prisma.membership.count({ where: { status: "ACTIVE" } }),
      prisma.membership.count({ where: { status: "PAUSED" } }),
      prisma.membership.count({ where: { status: "CANCELLED" } }),
      prisma.membership.count({ where: { status: "EXPIRED" } }),
      prisma.membership.count({ where: { status: "PENDING" } }),
      // MRR calculation: sum of active monthly memberships + (annual / 12)
      prisma.membership.findMany({
        where: { status: "ACTIVE" },
        select: { plan: { select: { amountPaise: true, interval: true } } },
      }),
    ]),
  ]);

  const [active, paused, cancelled, expired, pending, activePlans] = stats;

  // Calculate MRR
  const mrr = activePlans.reduce((sum, m) => {
    const amount = m.plan.amountPaise / 100;
    return sum + (m.plan.interval === "ANNUAL" ? amount / 12 : amount);
  }, 0);

  const statusConfig: Record<
    string,
    { icon: typeof CheckCircle; color: string; bg: string }
  > = {
    ACTIVE: { icon: CheckCircle, color: "text-success", bg: "bg-success/20" },
    PAUSED: {
      icon: PauseCircle,
      color: "text-warning",
      bg: "bg-warning/20",
    },
    CANCELLED: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/20",
    },
    EXPIRED: {
      icon: AlertTriangle,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    PENDING: { icon: Clock, color: "text-warning", bg: "bg-warning/20" },
  };

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Subscriptions</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">MRR</p>
            <p className="text-2xl font-semibold">
              ₹{Math.round(mrr).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold text-success">{active}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold text-warning">{pending}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paused</p>
            <p className="text-2xl font-semibold text-warning">{paused}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-semibold text-destructive">
              {cancelled}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Expired</p>
            <p className="text-2xl font-semibold text-muted-foreground">
              {expired}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            All Subscriptions ({memberships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium hidden md:table-cell">Plan</th>
                    <th className="p-3 font-medium hidden md:table-cell">Interval</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium hidden md:table-cell">Period End</th>
                    <th className="p-3 font-medium hidden lg:table-cell">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((membership) => {
                    const config = statusConfig[membership.status] || {
                      icon: Clock,
                      color: "text-muted-foreground",
                      bg: "bg-muted",
                    };
                    const StatusIcon = config.icon;
                    const amountINR = membership.plan.amountPaise / 100;

                    return (
                      <tr
                        key={membership.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <Link
                            href={`/admin/users/${membership.user.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            <div className="font-medium">
                              {membership.user.name || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {membership.user.email}
                            </div>
                          </Link>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="font-medium">
                            {membership.plan.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {membership.plan.product.name}
                          </div>
                          {membership.plan.product.type === "BUNDLE" && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                              Bundle
                            </span>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              membership.plan.interval === "ANNUAL"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {membership.plan.interval || "—"}
                          </span>
                        </td>
                        <td className="p-3 font-medium">
                          ₹{amountINR.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.bg} ${config.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {membership.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs hidden md:table-cell">
                          {membership.periodEnd
                            ? membership.periodEnd.toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs hidden lg:table-cell">
                          {membership.createdAt.toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No subscriptions yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
