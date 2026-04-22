import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SignOut } from "@/components/sign-out-button";
import { AdminMobileNav } from "@/components/admin-mobile-nav";
import { adminNavItems } from "@/lib/admin-nav-items";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side RBAC check - only ADMIN can access
  const user = await requireAdmin();
  
  if (!user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AdminMobileNav email={user.email} />

      {/* Sidebar */}
      <aside className="w-64 border-r border-border p-4 hidden md:flex md:flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-semibold">RU Admin</h2>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
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
