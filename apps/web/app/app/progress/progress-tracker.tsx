"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ru/ui";
import { Camera, Sparkles, UploadCloud } from "lucide-react";

type MediaType = "BEFORE" | "AFTER" | "WEEKLY";

interface ProgressEntry {
  id: string;
  type: MediaType;
  url: string;
  notes: string | null;
  weekNumber: number | null;
  capturedAt: string;
}

const typeLabels: Record<MediaType, string> = {
  BEFORE: "Before",
  AFTER: "After",
  WEEKLY: "Weekly",
};

export function ProgressTracker() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [type, setType] = useState<MediaType>("WEEKLY");
  const [weekNumber, setWeekNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fetchProgress = async () => {
    try {
      const response = await fetch("/api/progress");
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      if (notes.trim()) formData.append("notes", notes.trim());
      if (type === "WEEKLY" && weekNumber) {
        formData.append("weekNumber", weekNumber);
      }

      const response = await fetch("/api/progress", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setEntries((prev) => [data.entry, ...prev]);
      setFile(null);
      setNotes("");
      setWeekNumber("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const grouped = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc[entry.type].push(entry);
        return acc;
      },
      { BEFORE: [], AFTER: [], WEEKLY: [] } as Record<MediaType, ProgressEntry[]>
    );
  }, [entries]);

  return (
    <>
      <Card glass className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            New Check-in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as MediaType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly check-in</SelectItem>
                    <SelectItem value="BEFORE">Before</SelectItem>
                    <SelectItem value="AFTER">After</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "WEEKLY" && (
                <div className="space-y-2">
                  <Label>Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={weekNumber}
                    onChange={(event) => setWeekNumber(event.target.value)}
                    placeholder="e.g. 6"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="How did this week feel?"
              />
            </div>

            {previewUrl && (
              <div className="rounded-xl border border-dashed border-border p-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 rounded-lg object-cover"
                />
              </div>
            )}

            <Button type="submit" disabled={isUploading || !file}>
              {isUploading ? "Uploading..." : "Save check-in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {["WEEKLY", "BEFORE", "AFTER"].map((section) => {
          const sectionType = section as MediaType;
          const items = grouped[sectionType];
          return (
            <Card key={sectionType} glass>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {sectionType === "WEEKLY" ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  {typeLabels[sectionType]} Shots
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : items.length === 0 ? (
                  <p className="text-muted-foreground">No entries yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {items.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-border/60 bg-muted/40 p-3"
                      >
                        <img
                          src={entry.url}
                          alt={entry.type}
                          className="h-40 w-full rounded-lg object-cover"
                        />
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {entry.type === "WEEKLY" && entry.weekNumber
                                ? `Week ${entry.weekNumber}`
                                : typeLabels[entry.type]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.capturedAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
