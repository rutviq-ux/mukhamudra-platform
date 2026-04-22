"use client";

import { useState } from "react";
import { Switch } from "@ru/ui";
import { toast } from "@/hooks/use-toast";

interface AttendanceToggleProps {
  sessionId: string;
  userId: string;
  initiallyChecked: boolean;
}

export function AttendanceToggle({ sessionId, userId, initiallyChecked }: AttendanceToggleProps) {
  const [checked, setChecked] = useState(initiallyChecked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (newChecked: boolean) => {
    setIsLoading(true);
    setChecked(newChecked);

    try {
      const res = await fetch("/api/coach/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userId, attended: newChecked }),
      });

      if (!res.ok) {
        throw new Error("Failed to update attendance");
      }

      toast({
        title: newChecked ? "Attendance marked" : "Attendance removed",
        description: "The change has been saved successfully.",
      });
    } catch (error) {
      setChecked(!newChecked); // Rollback
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {isLoading ? "Updating..." : checked ? "Attended" : "Absent"}
      </span>
      <Switch 
        checked={checked} 
        onCheckedChange={handleToggle} 
        disabled={isLoading}
      />
    </div>
  );
}
