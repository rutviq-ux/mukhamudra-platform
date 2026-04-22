import { prisma } from "@ru/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ru/ui";
import { SendTestMessage } from "./send-test-message";
import { TemplateEditor } from "./template-editor";

export default async function AdminMessagesPage() {
  const templates = await prisma.messageTemplate.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { messageLogs: true } } },
  });

  const recentMessages = await prisma.messageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { template: true },
  });

  const templateOptions = templates.map((template) => ({
    id: template.id,
    name: template.name,
    channel: template.channel,
    subject: template.subject,
    body: template.body,
    variables: template.variables,
    isActive: template.isActive,
  }));

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Messages</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Templates - 2 cols */}
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Message Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateEditor templates={templates} />
          </CardContent>
        </Card>

        {/* Send Test - 1 col */}
        <Card glass>
          <CardHeader>
            <CardTitle>Send Test Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Send a test message to verify your email and WhatsApp integrations.
            </p>
            <SendTestMessage templates={templateOptions} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card glass>
        <CardHeader>
          <CardTitle>Recent Message Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3">To</th>
                  <th className="text-left p-3">Channel</th>
                  <th className="text-left p-3">Template</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Error</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                <TooltipProvider>
                  {recentMessages.length > 0 ? (
                    recentMessages.map((msg) => (
                      <tr
                        key={msg.id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-3">{msg.to}</td>
                        <td className="p-3">{msg.channel}</td>
                        <td className="p-3">{msg.template?.name || "-"}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              msg.status === "DELIVERED"
                                ? "bg-success/20 text-success"
                                : msg.status === "SENT"
                                  ? "bg-primary/20 text-primary"
                                  : msg.status === "FAILED"
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-warning/20 text-warning"
                            }`}
                          >
                            {msg.status}
                          </span>
                        </td>
                        <td className="p-3 max-w-[200px]">
                          {msg.status === "FAILED" && msg.error ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-destructive truncate block cursor-help">
                                  {msg.error.length > 40
                                    ? `${msg.error.slice(0, 40)}…`
                                    : msg.error}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-sm text-xs"
                              >
                                {msg.error}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {msg.createdAt.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {msg.sentAt?.toLocaleString("en-IN") || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No messages sent yet.
                      </td>
                    </tr>
                  )}
                </TooltipProvider>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
