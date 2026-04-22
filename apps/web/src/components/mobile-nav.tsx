"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SignOut } from "@/components/sign-out-button";

export interface MobileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  muted?: boolean;
}

interface MobileNavProps {
  title: string;
  subtitle?: string;
  items: MobileNavItem[];
  children?: React.ReactNode;
}

export function MobileNav({ title, subtitle, items, children }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/admin" || href === "/coach"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <div className="md:hidden border-b border-border bg-background sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 max-h-[70vh] overflow-y-auto">
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-muted text-foreground"
                      : item.muted
                        ? "text-muted-foreground hover:bg-muted/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {children}

          <div className="border-t border-border/50 pt-3 mt-3">
            <SignOut />
          </div>
        </div>
      )}
    </div>
  );
}
