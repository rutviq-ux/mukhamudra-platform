"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Calendar,
  TrendingUp,
  Film,
  CreditCard,
  ShoppingBag,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard, exact: true },
  { label: "Sessions", href: "/app/sessions", icon: Calendar },
  { label: "Progress", href: "/app/progress", icon: TrendingUp },
  { label: "Recordings", href: "/app/recordings", icon: Film },
  { label: "Tools", href: "/app/tools", icon: ShoppingBag },
  { label: "Billing", href: "/app/billing", icon: CreditCard },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="border-b border-[rgba(200,191,168,0.1)] px-4 py-3">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/app"
          className="text-lg font-light uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mukha Mudra
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm transition-colors duration-300 ${
                  active
                    ? "text-foreground bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}

          <span className="w-px h-5 bg-border mx-2" />

          {mounted && (
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors duration-300 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </SignOutButton>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden mt-3 pb-3 border-t border-border/50 pt-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] text-sm transition-colors ${
                  active
                    ? "text-foreground bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="border-t border-border/50 pt-2 mt-2">
            {mounted && (
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive transition-colors w-full cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </SignOutButton>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
