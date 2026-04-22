"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const HIDDEN_PREFIXES = ["/app", "/admin", "/auth", "/coach", "/onboarding"];

export function FooterVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  if (hidden) return null;

  return <>{children}</>;
}
