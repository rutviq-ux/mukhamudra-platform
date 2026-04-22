import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { UserPlus } from "lucide-react";

export default async function AdminLeadsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [leads, thisMonth, thisWeek, totalUsers, convertedCount] =
    await Promise.all([
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.lead.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      prisma.lead.count(),
      // Count leads whose email matches an existing user
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT l.id)::bigint as count
        FROM "Lead" l
        INNER JOIN "User" u ON l.email = u.email
        WHERE l.email IS NOT NULL
      `,
    ]);

  const converted = Number(convertedCount[0]?.count ?? 0);
  const conversionRate =
    totalUsers > 0 ? ((converted / totalUsers) * 100).toFixed(1) : "0";

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Leads</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-semibold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-semibold">{thisMonth}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-semibold">{thisWeek}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-semibold text-success">
              {conversionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Recent Leads ({leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium hidden md:table-cell">
                      Email
                    </th>
                    <th className="p-3 font-medium">Phone</th>
                    <th className="p-3 font-medium hidden md:table-cell">
                      Source
                    </th>
                    <th className="p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="p-3 font-medium">{lead.name}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">
                        {lead.email || "—"}
                      </td>
                      <td className="p-3">{lead.phone}</td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {lead.createdAt.toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No leads yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
