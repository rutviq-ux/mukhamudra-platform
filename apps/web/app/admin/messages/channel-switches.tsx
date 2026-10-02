"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notificationChannelsSchema, type NotificationChannelsInput } from "@ru/config";
import { Button, Label, Switch } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { updateNotificationChannels } from "./actions";

export function ChannelSwitches({ initial }: { initial: NotificationChannelsInput }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { handleSubmit, watch, setValue } = useForm<NotificationChannelsInput>({
    resolver: zodResolver(notificationChannelsSchema),
    defaultValues: initial,
  });

  const whatsapp = watch("whatsapp");
  const email = watch("email");
  const push = watch("push");

  function onSubmit(data: NotificationChannelsInput) {
    startTransition(async () => {
      const result = await updateNotificationChannels(data);
      if (result.success) {
        toast({ title: "Channel sending updated" });
        router.refresh();
      } else {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Turning a channel off stops the older messages on it. The new class notices
        follow each batch’s “Send class reminders” switch. Queued older messages stay
        queued. Sign-in emails still send.
      </p>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="channel-whatsapp" className="text-sm font-normal">
            WhatsApp
          </Label>
          <Switch
            id="channel-whatsapp"
            checked={whatsapp}
            onCheckedChange={(checked) => setValue("whatsapp", checked)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="channel-email" className="text-sm font-normal">
            Email
          </Label>
          <Switch
            id="channel-email"
            checked={email}
            onCheckedChange={(checked) => setValue("email", checked)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="channel-push" className="text-sm font-normal">
            Push
          </Label>
          <Switch
            id="channel-push"
            checked={push}
            onCheckedChange={(checked) => setValue("push", checked)}
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
