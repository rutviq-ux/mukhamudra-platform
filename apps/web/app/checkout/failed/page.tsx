"use client";

import Link from "next/link";
import { XCircle, RefreshCcw, Sparkles, Users } from "lucide-react";
import { Button, Card, CardContent } from "@ru/ui";

export default function CheckoutFailedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card glass className="max-w-md w-full p-8 text-center">
        <CardContent className="p-0">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="text-2xl font-semibold mb-2">Payment didn&apos;t go through.</h1>
          <p className="text-muted-foreground mb-8">
            No worries &mdash; nothing was charged. Try again or use a different
            payment method.
          </p>

          <div className="space-y-3">
            <Link href="/pricing">
              <Button size="lg" variant="accent" className="w-full">
                <RefreshCcw className="mr-2 h-4 w-4" />
                View Plans &amp; Try Again
              </Button>
            </Link>

            <div className="flex gap-3">
              <Link href="/face-yoga" className="flex-1">
                <Button size="lg" variant="ghost" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Face Yoga
                </Button>
              </Link>
              <Link href="/pranayama" className="flex-1">
                <Button size="lg" variant="ghost" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Pranayama
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            If the problem persists, contact us at support@mukhamudra.com
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
