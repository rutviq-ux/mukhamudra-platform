import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AppNav } from "./app-nav";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Redirect non-onboarded regular users to onboarding
  if (user && !user.onboardedAt && user.role === "USER") {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-6xl px-4 py-4 md:py-8">
        {children}
      </div>
    </div>
  );
}
