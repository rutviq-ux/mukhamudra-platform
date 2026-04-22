import { redirect } from "next/navigation";
import Link from "next/link";
import { requireCoach, isAdmin } from "@/lib/auth";
import { SignOut } from "@/components/sign-out-button";
import { CoachMobileNav } from "@/components/coach-mobile-nav";
import { Calendar, LayoutDashboard } from "lucide-react";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCoach();

  if (!user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <CoachMobileNav
        userName={user.name || user.email}
        isAdmin={isAdmin(user.role)}
      />

      {/* Sidebar */}
      <aside className="w-64 border-r border-border p-4 hidden md:flex md:flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-semibold">RU Coach</h2>
          <p className="text-xs text-muted-foreground">{user.name || user.email}</p>
        </div>

        <nav className="space-y-1">
          <Link
            href="/coach"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Today&apos;s Sessions
          </Link>
          {isAdmin(user.role) && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-muted-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin Dashboard
            </Link>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-border">
          <SignOut />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
