"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const LeadPopup = dynamic(
  () => import("@/components/landing/lead-popup").then((m) => m.LeadPopup),
  { ssr: false },
);

const MARKETING_PATHS = new Set([
  "/",
  "/face-yoga",
  "/pranayama",
  "/pricing",
  "/about",
  "/faq",
  "/trial",
]);

export function MarketingLeadPopup() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded || isSignedIn) return null;
  if (!MARKETING_PATHS.has(pathname)) return null;

  return <LeadPopup />;
}
