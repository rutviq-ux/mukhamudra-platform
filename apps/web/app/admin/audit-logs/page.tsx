import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { ScrollText } from "lucide-react";
import { AuditLogViewer } from "./audit-log-viewer";

export default async function AdminAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Audit Log</h1>

      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Activity Log ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogViewer
            initialLogs={logs.map((l) => ({
              ...l,
              createdAt: l.createdAt.toISOString(),
              metadata: l.metadata as Record<string, unknown> | null,
            }))}
            initialTotal={total}
            initialPage={1}
          />
        </CardContent>
      </Card>
    </div>
  );
}
