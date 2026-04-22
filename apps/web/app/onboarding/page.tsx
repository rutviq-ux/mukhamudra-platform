import { requireAuth } from "@/lib/auth";
import { prisma } from "@ru/db";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireAuth();
  if (!user) return null;

  // Fetch memberships with product type to infer goal
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { plan: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Infer goal from purchased product types
  const productTypes = new Set(memberships.map((m) => m.plan.product.type));
  let inferredGoal: string | null = null;
  if (productTypes.has("BUNDLE") || (productTypes.has("FACE_YOGA") && productTypes.has("PRANAYAMA"))) {
    inferredGoal = "both";
  } else if (productTypes.has("FACE_YOGA")) {
    inferredGoal = "face-yoga";
  } else if (productTypes.has("PRANAYAMA")) {
    inferredGoal = "pranayama";
  }

  return (
    <OnboardingForm
      initialName={user.name || ""}
      initialPhone={user.phone || ""}
      initialTimezone={user.timezone || ""}
      initialGoal={user.goal || inferredGoal || ""}
      termsAlreadyAccepted={!!user.termsAcceptedAt}
    />
  );
}
