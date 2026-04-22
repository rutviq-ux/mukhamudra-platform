"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { updateUserProfile } from "@/actions/user";

interface NotificationPreferencesProps {
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
}

export function NotificationPreferences({
  marketingOptIn: initialEmail,
  whatsappOptIn: initialWhatsApp,
}: NotificationPreferencesProps) {
  const router = useRouter();
  const [emailOptIn, setEmailOptIn] = useState(initialEmail);
  const [waOptIn, setWaOptIn] = useState(initialWhatsApp);
  const [isPending, startTransition] = useTransition();

  const {
    permission,
    isSubscribed,
    isLoading: pushLoading,
    isSupported: pushSupported,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  function handleSave() {
    startTransition(async () => {
      const result = await updateUserProfile({
        marketingOptIn: emailOptIn,
        whatsappOptIn: waOptIn,
      });

      if (result.success) {
        toast({ title: "Preferences updated" });
        router.refresh();
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    });
  }

  const hasChanges =
    emailOptIn !== initialEmail || waOptIn !== initialWhatsApp;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Choose how you'd like to receive updates about your sessions,
        payments, and community news.
      </p>

      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailOptIn}
            onChange={(e) => setEmailOptIn(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <div>
            <p className="font-medium text-sm">Email notifications</p>
            <p className="text-xs text-muted-foreground">
              Receive session reminders, payment receipts, and updates via
              email.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={waOptIn}
            onChange={(e) => setWaOptIn(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <div>
            <p className="font-medium text-sm">WhatsApp notifications</p>
            <p className="text-xs text-muted-foreground">
              Receive session reminders and quick updates on WhatsApp. You can
              opt out at any time.
            </p>
          </div>
        </label>

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
              {pushLoading
                ? "..."
                : isSubscribed
                  ? "Disable"
                  : "Enable"}
            </Button>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={isPending || !hasChanges} size="sm">
        {isPending ? "Saving..." : "Save preferences"}
      </Button>
    </div>
  );
}
