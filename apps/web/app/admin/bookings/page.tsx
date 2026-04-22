import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { BookingStatusActions } from "./booking-status-actions";

export default async function AdminBookingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const [bookings, stats] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        session: {
          include: {
            batch: { select: { name: true } },
            product: { select: { name: true, type: true } },
          },
        },
      },
    }),
    Promise.all([
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "NO_SHOW" } }),
      prisma.booking.count({
        where: {
          status: "CONFIRMED",
          session: { startsAt: { gte: startOfToday, lt: startOfTomorrow } },
        },
      }),
    ]),
  ]);

  const [confirmed, cancelled, completed, noShow, todayBookings] = stats;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Bookings</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-semibold">{todayBookings}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Confirmed</p>
            <p className="text-2xl font-semibold text-success">{confirmed}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold">{completed}</p>
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
            <p className="text-sm text-muted-foreground">No-shows</p>
            <p className="text-2xl font-semibold text-warning">{noShow}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Bookings ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium hidden md:table-cell">Session</th>
                    <th className="p-3 font-medium hidden md:table-cell">Batch</th>
                    <th className="p-3 font-medium">Date & Time</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium hidden lg:table-cell">Booked</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <Link
                            href={`/admin/users/${booking.user.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            <div className="font-medium">
                              {booking.user.name || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.user.email}
                            </div>
                          </Link>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              booking.session.product.type === "FACE_YOGA"
                                ? "bg-accent/20 text-accent"
                                : "bg-primary/20 text-primary"
                            }`}
                          >
                            {booking.session.product.name}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">
                          {booking.session.batch?.name || "—"}
                        </td>
                        <td className="p-3">
                          <div>
                            {booking.session.startsAt.toLocaleDateString(
                              "en-IN",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {booking.session.startsAt.toLocaleTimeString(
                              "en-IN",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <BookingStatusActions
                            bookingId={booking.id}
                            status={booking.status}
                            sessionInfo={`${booking.session.product.name} · ${booking.session.batch?.name || "Session"}`}
                          />
                        </td>
                        <td className="p-3 text-muted-foreground text-xs hidden lg:table-cell">
                          {booking.createdAt.toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No bookings yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
