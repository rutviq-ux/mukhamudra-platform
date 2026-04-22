"use client";

import { Calendar, LayoutDashboard } from "lucide-react";
import { MobileNav, type MobileNavItem } from "@/components/mobile-nav";

interface CoachMobileNavProps {
  userName: string;
  isAdmin: boolean;
}

export function CoachMobileNav({ userName, isAdmin }: CoachMobileNavProps) {
  const items: MobileNavItem[] = [
    { href: "/coach", label: "Today's Sessions", icon: Calendar },
  ];

  if (isAdmin) {
    items.push({
      href: "/admin",
      label: "Admin Dashboard",
      icon: LayoutDashboard,
      muted: true,
    });
  }

  return (
    <MobileNav
      title="RU Coach"
      subtitle={userName}
      items={items}
    />
  );
}
