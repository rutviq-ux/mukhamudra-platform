"use client";

import { useTransition } from "react";
import { Button } from "@ru/ui";
import { useRouter } from "next/navigation";
import { cancelSubscription } from "@/actions/memberships";

interface CancelSubscriptionButtonProps {
  membershipId: string;
  batchName: string;
}

export function CancelSubscriptionButton({
  membershipId,
  batchName,
}: CancelSubscriptionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCancel = () => {
    if (isPending) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel your subscription to "${batchName}"? You will lose access at the end of your current billing period.`
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await cancelSubscription({ membershipId });

      if (!result.success) {
        alert(result.error || "Failed to cancel subscription");
        return;
      }

      alert("Subscription cancelled. You will have access until the end of your billing period.");
      router.refresh();
    });
  };

  return (
    <Button
      onClick={handleCancel}
      disabled={isPending}
      size="sm"
      variant="outline"
      className="text-destructive hover:text-destructive"
    >
      {isPending ? "Cancelling..." : "Cancel"}
    </Button>
  );
}
