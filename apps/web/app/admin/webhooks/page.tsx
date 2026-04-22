import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";

export default async function AdminWebhooksPage() {
  const webhooks = await prisma.webhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-8">Webhook Events</h1>

      <Card glass>
        <CardHeader>
          <CardTitle>Recent Webhooks ({webhooks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3">Provider</th>
                  <th className="text-left p-3 hidden md:table-cell">Event ID</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3 hidden md:table-cell">Error</th>
                  <th className="text-left p-3">Received</th>
                  <th className="text-left p-3 hidden lg:table-cell">Processed</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        webhook.provider === "clerk" ? "bg-indigo-500/15 text-indigo-400" :
                        "bg-blue-500/15 text-blue-400"
                      }`}>
                        {webhook.provider}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs hidden md:table-cell">{webhook.eventId.slice(0, 20)}...</td>
                    <td className="p-3">{webhook.eventType}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        webhook.status === "PROCESSED" ? "bg-success/20 text-success" :
                        webhook.status === "FAILED" ? "bg-destructive/20 text-destructive" :
                        webhook.status === "IGNORED" ? "bg-muted text-muted-foreground" :
                        "bg-warning/20 text-warning"
                      }`}>
                        {webhook.status}
                      </span>
                    </td>
                    <td className="p-3 text-destructive text-xs max-w-xs truncate hidden md:table-cell">
                      {webhook.error || "-"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {webhook.createdAt.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-muted-foreground hidden lg:table-cell">
                      {webhook.processedAt?.toLocaleString("en-IN") || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
