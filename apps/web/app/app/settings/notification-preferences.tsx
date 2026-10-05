"use client";

import { Button } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { CheckCircle2 } from "lucide-react";

interface NotificationPreferencesProps {
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
}

export function NotificationPreferences({
  marketingOptIn,
  whatsappOptIn,
}: NotificationPreferencesProps) {
  const {
    permission,
    isSubscribed,
    isLoading: pushLoading,
    isSupported: pushSupported,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Service notifications keep you on track with your sessions and payments.
      </p>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 w-4 h-4 text-[#C4883A] flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Email notifications</p>
            <p className="text-xs text-muted-foreground">
              Session reminders, payment receipts, and updates via email.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 w-4 h-4 text-[#C4883A] flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">WhatsApp notifications</p>
            <p className="text-xs text-muted-foreground">
              Session reminders and quick updates on WhatsApp.
            </p>
          </div>
        </div>

        {pushSupported && (
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm">Push notifications</p>
              <p className="text-xs text-muted-foreground">
                {permission === "denied"
                  ? "Push notifications are blocked. Please enable them in your browser settings."
                  : "Receive session reminders as browser notifications, even when the tab is closed."}
              </p>
            </div>
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              disabled={pushLoading || permission === "denied"}
              onClick={async () => {
                try {
                  if (isSubscribed) {
                    await unsubscribePush();
                    toast({ title: "Push notifications disabled" });
                  } else {
                    await subscribePush();
                    toast({ title: "Push notifications enabled!" });
                  }
                } catch {
                  toast({
                    title: "Failed to update push notifications",
                    variant: "destructive",
                  });
                }
              }}
            >
              {pushLoading ? "..." : isSubscribed ? "Disable" : "Enable"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
