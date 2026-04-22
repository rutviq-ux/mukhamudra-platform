import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { getCurrentUser } from "@/lib/auth";
import { UserActions } from "./user-actions";
import { MembershipStatus } from "./membership-actions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, admin] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { plan: { select: { name: true } } },
        },
        memberships: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: { select: { name: true, product: { select: { name: true } } } },
          },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            session: {
              select: { startsAt: true, batch: { select: { name: true } } },
            },
          },
        },
        recordingAccess: {
          orderBy: { createdAt: "desc" },
          include: {
            order: {
              select: { razorpayOrderId: true, amountPaise: true },
            },
          },
        },
        attendances: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            session: {
              select: {
                startsAt: true,
                batch: { select: { name: true } },
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!user) notFound();

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Users
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light">{user.name || user.email}</h1>
          <p className="text-muted-foreground">{user.email}</p>
          {user.phone && (
            <p className="text-sm text-muted-foreground">{user.phone}</p>
          )}
        </div>
        <UserActions
          userId={user.id}
          currentRole={user.role}
          currentName={user.name}
          currentPhone={user.phone}
          currentEmail={user.email}
          clerkId={user.clerkId}
          marketingOptIn={user.marketingOptIn}
          whatsappOptIn={user.whatsappOptIn}
          isSelf={admin?.id === user.id}
        />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="text-lg font-semibold">{user.role}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Opt-in</p>
            <p className="text-lg">
              {user.marketingOptIn ? "M " : ""}
              {user.whatsappOptIn ? "W" : ""}
              {!user.marketingOptIn && !user.whatsappOptIn && "-"}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Clerk</p>
            <p className="text-sm font-mono truncate">
              {user.clerkId || "Not linked"}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Joined</p>
            <p className="text-lg font-semibold">
              {user.createdAt.toLocaleDateString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Memberships */}
        <Card glass>
          <CardHeader>
            <CardTitle>Memberships ({user.memberships.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.memberships.length > 0 ? (
              <div className="space-y-3">
                {user.memberships.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{m.plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.plan.product?.name || m.plan.name}
                        {m.periodEnd &&
                          ` · Until ${new Date(m.periodEnd).toLocaleDateString("en-IN")}`}
                      </p>
                    </div>
                    <MembershipStatus
                      membership={{
                        id: m.id,
                        status: m.status,
                        periodEnd: m.periodEnd?.toISOString() || null,
                        plan: m.plan,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                No memberships.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        <Card glass>
          <CardHeader>
            <CardTitle>Orders ({user.orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Plan</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border/50"
                      >
                        <td className="p-2">{order.plan.name}</td>
                        <td className="p-2">
                          {`₹${(order.amountPaise / 100).toLocaleString("en-IN")}`}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              order.status === "PAID"
                                ? "bg-success/20 text-success"
                                : order.status === "FAILED"
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-warning/20 text-warning"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {order.createdAt.toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                No orders.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bookings */}
        <Card glass>
          <CardHeader>
            <CardTitle>Bookings ({user.bookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Session</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b border-border/50"
                      >
                        <td className="p-2">
                          {booking.session.batch?.name || "Session"}
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {new Date(booking.session.startsAt).toLocaleDateString(
                            "en-IN",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              booking.status === "CONFIRMED"
                                ? "bg-primary/20 text-primary"
                                : booking.status === "COMPLETED"
                                  ? "bg-success/20 text-success"
                                  : booking.status === "CANCELLED"
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-warning/20 text-warning"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                No bookings.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recording Access */}
        <Card glass>
          <CardHeader>
            <CardTitle>Recording Access ({user.recordingAccess.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.recordingAccess.length > 0 ? (
              <div className="space-y-3">
                {user.recordingAccess.map((ra) => (
                  <div
                    key={ra.id}
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {ra.order?.razorpayOrderId || "Manual"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires{" "}
                        {ra.expiresAt.toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {ra.order &&
                          ` · ₹${(ra.order.amountPaise / 100).toLocaleString("en-IN")}`}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        ra.isActive && ra.expiresAt > new Date()
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ra.isActive && ra.expiresAt > new Date()
                        ? "Active"
                        : "Expired"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                No recording access.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card glass>
          <CardHeader>
            <CardTitle>
              Recent Attendance ({user.attendances.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.attendances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Session</th>
                      <th className="text-left p-2">Product</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.attendances.map((att) => (
                      <tr
                        key={att.id}
                        className="border-b border-border/50"
                      >
                        <td className="p-2">
                          {att.session.batch?.name || "Session"}
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {att.session.product.name}
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {att.joinedAt.toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {att.durationMin ? `${att.durationMin} min` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                No attendance records.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
