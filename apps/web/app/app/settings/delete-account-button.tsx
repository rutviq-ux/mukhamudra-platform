"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ru/ui";
import { useClerk } from "@clerk/nextjs";

export function DeleteAccountButton() {
  const [step, setStep] = useState<"idle" | "confirm" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signOut } = useClerk();

  async function handleDelete() {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/user/delete-account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      await signOut();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }

  if (step === "idle") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => setStep("confirm")}
      >
        Delete account
      </Button>
    );
  }

  if (step === "confirm") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive font-medium">
          Are you absolutely sure?
        </p>
        <p className="text-xs text-muted-foreground">
          This will permanently delete your account and all associated data
          including your membership, bookings, progress, and payment history.
          This cannot be undone.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            Yes, delete my account
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep("idle")}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">Deleting your account...</p>
  );
}
