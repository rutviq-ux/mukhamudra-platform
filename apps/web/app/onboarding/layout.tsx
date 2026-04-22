import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Already onboarded — send to dashboard
  if (user?.onboardedAt) {
    redirect("/app");
  }

  return <>{children}</>;
}
