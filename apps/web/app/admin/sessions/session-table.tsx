"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { Video, Film, ExternalLink, Loader2, Plus, X as XIcon } from "lucide-react";
import {
  updateSession,
  getMeetPreview,
  generateMeetLink,
  fetchSessionRecording,
} from "./actions";

interface Session {
  id: string;
  type: string;
  status: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  joinUrl: string | null;
  calendarEventId: string | null;
  meetingId: string | null;
  recordingUrl: string | null;
  capacity: number;
  batch: { name: string; slug: string; timezone: string } | null;
  product: { name: string };
  coach: { id: string; name: string | null; email: string } | null;
  _count: { bookings: number };
}

interface Batch {
  id: string;
  name: string;
}

interface Coach {
  id: string;
  name: string | null;
  email: string;
}

interface SessionTableProps {
  sessions: Session[];
  batches: Batch[];
  coaches: Coach[];
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-primary/20 text-primary",
  IN_PROGRESS: "bg-warning/20 text-warning",
  COMPLETED: "bg-success/20 text-success",
  CANCELLED: "bg-destructive/20 text-destructive",
};

export function SessionTable({ sessions, batches, coaches }: SessionTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterBatch, setFilterBatch] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [fetchingRecording, setFetchingRecording] = useState<string | null>(null);
  const [assigningCoach, setAssigningCoach] = useState<string | null>(null);
  const [previewSession, setPreviewSession] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    title: string;
    description: string;
    attendees: string[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = filterBatch
    ? sessions.filter((s) => s.batch?.slug === filterBatch)
    : sessions;

  async function handleUpdateStatus(id: string, status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
    setUpdatingId(id);
    try {
      const result = await updateSession({ id, status });
      if (!result.success) {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: `Session ${status.toLowerCase()}` });
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAssignCoach(sessionId: string, coachId: string | null) {
    setAssigningCoach(sessionId);
    try {
      const result = await updateSession({ id: sessionId, coachId: coachId || null });
      if (!result.success) {
        toast({
          title: "Failed to assign coach",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: coachId ? "Coach assigned" : "Coach removed" });
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        title: "Failed to assign coach",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setAssigningCoach(null);
    }
  }

  async function handleFetchRecording(id: string) {
    setFetchingRecording(id);
    try {
      const result = await fetchSessionRecording({ id });
      if (!result.success) {
        toast({
          title: "No recording found",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Recording found" });
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        title: "No recording found",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setFetchingRecording(null);
    }
  }

  async function openMeetPreview(id: string) {
    setPreviewSession(id);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const result = await getMeetPreview({ id });
      if (!result.success) {
        toast({
          title: "Failed to load preview",
          description: result.error,
          variant: "destructive",
        });
        setPreviewSession(null);
        return;
      }
      setPreviewData(result.data);
    } catch (error) {
      toast({
        title: "Failed to load preview",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      setPreviewSession(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function createMeetFromPreview() {
    if (!previewSession || !previewData) return;
    setCreating(true);
    try {
      const result = await generateMeetLink({
        id: previewSession,
        title: previewData.title,
        description: previewData.description,
        attendees: previewData.attendees,
      });
      if (!result.success) {
        toast({
          title: "Failed to generate Meet link",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Meet link generated" });
      setPreviewSession(null);
      setPreviewData(null);
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        title: "Failed to generate Meet link",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  function addPreviewAttendee() {
    if (!newAttendeeEmail || !previewData) return;
    const email = newAttendeeEmail.trim().toLowerCase();
    if (!email || previewData.attendees.includes(email)) {
      setNewAttendeeEmail("");
      return;
    }
    setPreviewData({
      ...previewData,
      attendees: [...previewData.attendees, email],
    });
    setNewAttendeeEmail("");
  }

  function removePreviewAttendee(email: string) {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      attendees: previewData.attendees.filter((a) => a !== email),
    });
  }

  function formatDate(dateStr: string, tz?: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: tz || "Asia/Kolkata",
    });
  }

  function formatTime(dateStr: string, tz?: string) {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz || "Asia/Kolkata",
    });
  }

  function tzAbbr(dateStr: string, tz?: string) {
    return new Intl.DateTimeFormat("en", {
      timeZone: tz || "Asia/Kolkata",
      timeZoneName: "short",
    })
      .formatToParts(new Date(dateStr))
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.name.toLowerCase().replace(/\s/g, "-")}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3 hidden md:table-cell">Batch</th>
              <th className="text-left p-3 hidden md:table-cell">Product</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3 hidden lg:table-cell">Bookings</th>
              <th className="text-left p-3 hidden md:table-cell">Coach</th>
              <th className="text-left p-3 hidden md:table-cell">Meet</th>
              <th className="text-left p-3 hidden md:table-cell">Recording</th>
              <th className="text-left p-3 hidden lg:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <td className="p-3">{formatDate(session.startsAt, session.batch?.timezone)}</td>
                  <td className="p-3 whitespace-nowrap">
                    {formatTime(session.startsAt, session.batch?.timezone)}{" "}
                    - {formatTime(session.endsAt, session.batch?.timezone)}{" "}
                    <span className="text-muted-foreground text-xs">
                      {tzAbbr(session.startsAt, session.batch?.timezone)}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">{session.batch?.name || "-"}</td>
                  <td className="p-3 hidden md:table-cell">{session.product.name}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        STATUS_STYLES[session.status] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <span
                      className={
                        session._count.bookings >= session.capacity
                          ? "text-destructive font-medium"
                          : ""
                      }
                    >
                      {session._count.bookings}/{session.capacity}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <select
                      value={session.coach?.id || ""}
                      onChange={(e) => handleAssignCoach(session.id, e.target.value || null)}
                      disabled={assigningCoach === session.id}
                      className="h-8 rounded border border-border bg-background px-2 text-xs max-w-[140px] truncate"
                    >
                      <option value="">Unassigned</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {session.joinUrl ? (
                      <a
                        href={session.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                      >
                        <Video className="h-3 w-3" />
                        Meet
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : session.status === "SCHEDULED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openMeetPreview(session.id)}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {session.recordingUrl ? (
                      <a
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-success/20 text-success hover:bg-success/30 transition-colors"
                      >
                        <Film className="h-3 w-3" />
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : session.status === "COMPLETED" && session.meetingId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={fetchingRecording === session.id}
                        onClick={() => handleFetchRecording(session.id)}
                      >
                        {fetchingRecording === session.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Film className="h-3 w-3 mr-1" />
                        )}
                        Fetch
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    {session.status === "SCHEDULED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={updatingId === session.id}
                        onClick={() => handleUpdateStatus(session.id, "CANCELLED")}
                      >
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="p-8 text-center text-muted-foreground"
                >
                  No sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Meet Preview/Edit Modal */}
      <Dialog
        open={previewSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSession(null);
            setPreviewData(null);
            setNewAttendeeEmail("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Meet Link</DialogTitle>
            <DialogDescription>
              Review and edit meeting details before creating.
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={previewData.title}
                  onChange={(e) =>
                    setPreviewData({ ...previewData, title: e.target.value })
                  }
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Description
                </label>
                <textarea
                  value={previewData.description}
                  onChange={(e) =>
                    setPreviewData({ ...previewData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Attendees ({previewData.attendees.length})
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {previewData.attendees.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1"
                    >
                      <span className="truncate">{email}</span>
                      <button
                        onClick={() => removePreviewAttendee(email)}
                        className="ml-2 text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="email"
                    placeholder="Add attendee email"
                    value={newAttendeeEmail}
                    onChange={(e) => setNewAttendeeEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPreviewAttendee();
                      }
                    }}
                    className="flex-1 h-8 rounded-lg border border-border bg-background px-3 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={addPreviewAttendee}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreviewSession(null);
                setPreviewData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!previewData || creating}
              onClick={createMeetFromPreview}
            >
              {creating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Video className="h-3 w-3 mr-1" />
              )}
              Create Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
