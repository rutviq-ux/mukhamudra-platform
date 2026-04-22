"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { whatsappRateLimitSchema } from "@ru/config";
import { Button, Input, Label } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { updateWhatsappRateLimit } from "./actions";

type FormValues = z.input<typeof whatsappRateLimitSchema>;

interface WhatsAppRateLimitFormProps {
  initial: {
    perMinute: number;
    perDay: number;
  };
}

export function WhatsAppRateLimitForm({ initial }: WhatsAppRateLimitFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(whatsappRateLimitSchema),
    defaultValues: initial,
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await updateWhatsappRateLimit(data);

      if (result.success) {
        toast({
          title: "Rate limits updated",
          description: "WhatsApp rate limits have been saved successfully.",
        });
        router.refresh();
      } else {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            setError(field as keyof FormValues, { message: msgs[0] });
          }
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wa-per-minute">Per minute</Label>
          <Input
            id="wa-per-minute"
            type="number"
            min={1}
            {...register("perMinute", { valueAsNumber: true })}
          />
          {errors.perMinute && (
            <p className="text-sm text-destructive">{errors.perMinute.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-per-day">Per day</Label>
          <Input
            id="wa-per-day"
            type="number"
            min={1}
            {...register("perDay", { valueAsNumber: true })}
          />
          {errors.perDay && (
            <p className="text-sm text-destructive">{errors.perDay.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
