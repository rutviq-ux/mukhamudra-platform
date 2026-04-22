"use client";

import { adminNavItems } from "@/lib/admin-nav-items";
import { MobileNav } from "@/components/mobile-nav";

interface AdminMobileNavProps {
  email: string;
}

export function AdminMobileNav({ email }: AdminMobileNavProps) {
  return (
    <MobileNav
      title="RU Admin"
      subtitle={email}
      items={adminNavItems}
    />
  );
}
