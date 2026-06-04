import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import {
  CreditCard,
  Receipt,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Film,
} from "lucide-react";
import { CancelSubscriptionButton } from "./cancel-subscription-button";
import { RecordingAddonCheckout } from "@/components/recording-addon-checkout";
import Link from "next/link";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Get orders history
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { plan: { include: { product: true } }, coupon: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get active memberships
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { plan: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Recording access (paid add-on for any active member)
  const recordingAccess = await prisma.recordingAccess.findFirst({
    where: { userId: user.id, isActive: true, expiresAt: { gt: new Date() } },
  });

  // Eligible to buy the add-on if they have ANY active membership and no current access
  const hasActiveMembership = memberships.some((m) => m.status === "ACTIVE");
  const canPurchaseAddon = !recordingAccess && hasActiveMembership;

  const activeMemberships = memberships.filter((m) => m.status === "ACTIVE");
  const displayMemberships = memberships;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-2">Billing & Payments</h1>
      <p className="text-muted-foreground mb-6 md:mb-8">
        Manage your subscriptions and view order history.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        {/* Active Subscriptions Card */}
        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activeMemberships.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeMemberships.length > 0
                ? [
                    ...new Set(
                      activeMemberships.map(
                        (m) => m.plan.name
                      )
                    ),
                  ]
                    .slice(0, 3)
                    .join(", ")
                : "No active subscriptions"}
            </p>
          </CardContent>
        </Card>

        {/* Recording Access Card */}
        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Recording Access
            </CardTitle>
            <Film className="h-4 w-4 text-[#C4883A]" />
          </CardHeader>
          <CardContent>
            {recordingAccess ? (
              <>
                <div className="text-lg font-semibold text-success">Active</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Until{" "}
                  {recordingAccess.expiresAt.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <Link
                  href="/app/recordings"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  View recordings →
                </Link>
              </>
            ) : canPurchaseAddon ? (
              <>
                <div className="text-lg font-semibold text-muted-foreground">
                  Not purchased
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹1,000/year: all recordings for your plan
                </p>
                <RecordingAddonCheckout variant="compact" />
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-muted-foreground">
                  Not available
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active subscription required
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Spent Card */}
        <Card glass>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(
                orders
                  .filter((o) => o.status === "PAID")
                  .reduce((sum, o) => sum + o.amountPaise, 0) / 100
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              across {orders.filter((o) => o.status === "PAID").length} orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Subscriptions */}
      {displayMemberships.length > 0 && (
        <Card glass className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayMemberships.map((membership) => {
                const intervalLabel =
                  membership.plan.interval === "ANNUAL" ? "/year" : "/month";

                return (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 flex-wrap gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {membership.plan.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            membership.status === "ACTIVE"
                              ? "bg-success/20 text-success"
                              : membership.status === "PAUSED"
                                ? "bg-warning/20 text-warning"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {membership.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {membership.plan.name},{" "}
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(membership.plan.amountPaise / 100)}
                        {intervalLabel}
                      </p>
                      {membership.periodEnd && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {membership.status === "ACTIVE"
                            ? `Renews ${membership.periodEnd.toLocaleDateString("en-IN")}`
                            : `Ended ${membership.periodEnd.toLocaleDateString("en-IN")}`}
                        </p>
                      )}
                    </div>
                    {membership.status === "ACTIVE" &&
                      membership.razorpaySubscriptionId && (
                        <CancelSubscriptionButton
                          membershipId={membership.id}
                          batchName={membership.plan.name}
                        />
                      )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order History */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border/50">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 text-sm">
                        {order.createdAt.toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-sm font-medium">
                            {order.plan.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.plan.product.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-sm font-medium">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(order.amountPaise / 100)}
                          </p>
                          {order.discountPaise > 0 && (
                            <p className="text-xs text-success">
                              -{" "}
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }).format(order.discountPaise / 100)}{" "}
                              ({order.coupon?.code})
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            order.status === "PAID"
                              ? "bg-success/20 text-success"
                              : order.status === "PENDING"
                                ? "bg-warning/20 text-warning"
                                : order.status === "REFUNDED"
                                  ? "bg-primary/20 text-primary"
                                  : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {order.status === "PAID" && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {order.status === "FAILED" && (
                            <XCircle className="h-3 w-3" />
                          )}
                          {order.status === "PENDING" && (
                            <Clock className="h-3 w-3" />
                          )}
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
