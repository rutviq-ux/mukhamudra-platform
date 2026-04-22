"use client";

import { useEffect, useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export function SignOut() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <SignOutButton redirectUrl="/">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors duration-300 cursor-pointer"
        type="button"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </SignOutButton>
  );
}
