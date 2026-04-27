"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ru/ui";
import { Loader2 } from "lucide-react";

interface RecordingAddonCheckoutProps {
  /** Button variant — compact for billing card, default for recordings upsell */
  variant?: "default" | "compact";
}

export function RecordingAddonCheckout({
  variant = "default",
}: RecordingAddonCheckoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Dynamically load Razorpay checkout script
  useEffect(() => {
    if ((window as any).Razorpay) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);

    return () => {
      // Don't remove — other components may need it
    };
  }, []);

  const handlePurchase = async () => {
    if (!scriptReady) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/razorpay/recording-addon", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "Mukha Mudra",
        description: "Recording Access Add-on (1 year)",
        handler: () => {
          // Payment successful — refresh to show updated access
          router.push("/app/recordings");
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        prefill: data.prefill || {},
        theme: { color: "#2E9E86" },
      });

      rzp.open();
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <div>
        <button
          onClick={handlePurchase}
          disabled={loading || !scriptReady}
          className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing…
            </>
          ) : (
            "Add recording access →"
          )}
        </button>
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="gold"
        size="lg"
        className="w-full"
        onClick={handlePurchase}
        disabled={loading || !scriptReady}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </span>
        ) : (
          "Add Recording Access"
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}
