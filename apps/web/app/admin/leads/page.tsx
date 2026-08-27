import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { UserPlus } from "lucide-react";
import {
  groupLeadsByPhone,
  leadPhoneKey,
  leadPhoneVariants,
  type GroupedLead,
} from "@/lib/leads";

type AccountStatus = "member" | "signed_up" | "lead_only";

function statusLabel(status: AccountStatus): { text: string; className: string } {
  if (status === "member") {
    return { text: "Member", className: "bg-success/15 text-success" };
  }
  if (status === "signed_up") {
    return { text: "Signed up, no plan", className: "bg-muted text-muted-foreground" };
  }
  return { text: "Lead only", className: "bg-primary/10 text-primary" };
}

export default async function AdminLeadsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [leads, thisMonth, thisWeek, totalLeads] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.lead.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: startOfWeek } },
    }),
    prisma.lead.count(),
  ]);

  const grouped = groupLeadsByPhone(leads);
  const uniqueCount = grouped.length;
  const duplicateRows = leads.length - uniqueCount;

  const emails = grouped
    .map((row) => row.email)
    .filter((email): email is string => Boolean(email));

  const phoneVariants = [
    ...new Set(grouped.flatMap((row) => leadPhoneVariants(row.phone))),
  ];

  const matchingUsers =
    phoneVariants.length === 0 && emails.length === 0
      ? []
      : await prisma.user.findMany({
          where: {
            OR: [
              ...(phoneVariants.length > 0
                ? [{ phone: { in: phoneVariants } }]
                : []),
              ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
            ],
          },
          select: {
            email: true,
            phone: true,
            memberships: {
              where: { status: "ACTIVE" },
              select: { id: true },
              take: 1,
            },
          },
        });

  const usersByPhone = new Map<string, (typeof matchingUsers)[number]>();
  const usersByEmail = new Map<string, (typeof matchingUsers)[number]>();
  for (const account of matchingUsers) {
    if (account.phone) {
      usersByPhone.set(leadPhoneKey(account.phone), account);
    }
    if (account.email) {
      usersByEmail.set(account.email.toLowerCase(), account);
    }
  }

  function accountFor(row: GroupedLead): AccountStatus {
    const byPhone = usersByPhone.get(row.key);
    const byEmail = row.email
      ? usersByEmail.get(row.email.toLowerCase())
      : undefined;
    const account = byPhone ?? byEmail;
    if (!account) return "lead_only";
    if (account.memberships.length > 0) return "member";
    return "signed_up";
  }

  const convertedUnique = grouped.filter((row) => accountFor(row) !== "lead_only").length;
  const conversionRate =
    uniqueCount > 0 ? ((convertedUnique / uniqueCount) * 100).toFixed(1) : "0";

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Leads</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unique people</p>
            <p className="text-2xl font-semibold">{uniqueCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalLeads} form rows
            </p>
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
            <p className="text-sm text-muted-foreground">Signed up</p>
            <p className="text-2xl font-semibold text-success">
              {conversionRate}%
            </p>
            {duplicateRows > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {duplicateRows} extra rows collapsed
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Recent Leads ({grouped.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grouped.length > 0 ? (
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
                    <th className="p-3 font-medium">Times</th>
                    <th className="p-3 font-medium hidden lg:table-cell">
                      Account
                    </th>
                    <th className="p-3 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((row) => {
                    const status = statusLabel(accountFor(row));
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{row.name}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">
                          {row.email || "—"}
                        </td>
                        <td className="p-3">{row.phone}</td>
                        <td className="p-3 hidden md:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {row.sources.join(", ")}
                          </span>
                        </td>
                        <td className="p-3">{row.count}</td>
                        <td className="p-3 hidden lg:table-cell">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {row.lastSeen.toLocaleDateString("en-IN", {
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
              No leads yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
