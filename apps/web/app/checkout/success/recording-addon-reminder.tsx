"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";

export function RecordingAddonReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const intent = sessionStorage.getItem("mm-recording-addon-intent");
    if (intent === "true") {
      setShow(true);
      sessionStorage.removeItem("mm-recording-addon-intent");
    }
  }, []);

  if (!show) return null;

  return (
    <div className="p-4 rounded-[4px] bg-[#C4883A]/10 border border-[#C4883A]/20">
      <div className="flex items-center gap-3 mb-2">
        <Film className="h-4 w-4 text-[#C4883A]" />
        <span className="text-sm font-medium">Recording Access</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        You selected recording access during checkout. Once your subscription
        activates, you can add it from your billing page.
      </p>
      <Link
        href="/app/billing"
        className="text-sm text-[#C4883A] hover:underline"
      >
        Go to Billing &rarr;
      </Link>
    </div>
  );
}
