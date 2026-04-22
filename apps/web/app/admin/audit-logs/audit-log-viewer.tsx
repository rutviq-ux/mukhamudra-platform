"use client";

import { useState } from "react";
import { Button, Input, Label } from "@ru/ui";
import Link from "next/link";

interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string } | null;
}

interface AuditLogViewerProps {
  initialLogs: AuditLogEntry[];
  initialTotal: number;
  initialPage: number;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-success/20 text-success",
  update: "bg-primary/20 text-primary",
  delete: "bg-destructive/20 text-destructive",
  deactivate: "bg-warning/20 text-warning",
  refund: "bg-warning/20 text-warning",
};

function getActionColor(action: string) {
  const verb = action.split(".").pop() || "";
  return ACTION_COLORS[verb] || "bg-muted text-muted-foreground";
}

export function AuditLogViewer({
  initialLogs,
  initialTotal,
  initialPage,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  async function fetchLogs(pageNum: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", String(limit));
      if (action) params.set("action", action);
      if (targetType) params.set("targetType", targetType);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotal(data.total);
        setPage(data.page);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    fetchLogs(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="flex flex-wrap gap-3 items-end"
      >
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. coupon.create"
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Target Type</Label>
          <Input
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            placeholder="e.g. User"
            className="w-32"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-36"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={loading}>
          {loading ? "..." : "Filter"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAction("");
            setTargetType("");
            setFrom("");
            setTo("");
            fetchLogs(1);
          }}
        >
          Clear
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">{total} total entries</p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-3 font-medium">Timestamp</th>
              <th className="p-3 font-medium">Actor</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium hidden md:table-cell">
                Target
              </th>
              <th className="p-3 font-medium hidden lg:table-cell">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((entry) => (
              <>
                <tr
                  key={entry.id}
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                  onClick={() =>
                    setExpanded(expanded === entry.id ? null : entry.id)
                  }
                >
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3">
                    {entry.actor ? (
                      <Link
                        href={`/admin/users/${entry.actor.id}`}
                        className="hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-medium text-xs">
                          {entry.actor.name || entry.actor.email}
                        </div>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        System
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${getActionColor(entry.action)}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {entry.targetType}
                      {entry.targetId && (
                        <span className="font-mono ml-1">
                          {entry.targetId.slice(0, 8)}...
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground font-mono">
                      {entry.ip || "—"}
                    </span>
                  </td>
                </tr>
                {expanded === entry.id && entry.metadata && (
                  <tr key={`${entry.id}-meta`}>
                    <td colSpan={5} className="p-3 bg-muted/20">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => fetchLogs(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => fetchLogs(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
