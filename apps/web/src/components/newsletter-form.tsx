"use client";

import { useState } from "react";
import { Button, Input, Label } from "@ru/ui";
import { trackEvent } from "@/lib/posthog-provider";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    trackEvent.newsletterSubscribeClicked();

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, optIn: true }),
      });

      const data = await res.json();

      if (res.ok) {
        trackEvent.newsletterSubscribed();
        setMessage({ type: "success", text: data.message || "Subscribed!" });
        setEmail("");
      } else {
        setMessage({ type: "error", text: data.error || "Something went wrong" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to subscribe" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" variant="accent" disabled={isLoading}>
          {isLoading ? "..." : "Subscribe"}
        </Button>
      </div>
      <Label className="flex items-center gap-2 mt-3 text-xs text-muted-foreground justify-center">
        <input type="checkbox" checked disabled className="rounded" />
        I agree to receive emails
      </Label>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "success" ? "text-success" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
