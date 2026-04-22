import Link from "next/link";
import { CheckCircle2, ArrowRight, Calendar, Film, CreditCard } from "lucide-react";
import { Button, Card, CardContent } from "@ru/ui";
import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { RecordingAddonReminder } from "./recording-addon-reminder";

export default async function CheckoutSuccessPage() {
  const user = await getCurrentUser();
  const isOnboarded = !!user?.onboardedAt;

  // Fetch the most recent membership to show what was purchased
  const membership = user
    ? await prisma.membership.findFirst({
        where: { userId: user.id },
        include: { plan: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const planName = membership?.plan?.name;
  const productName = membership?.plan?.product?.name;
  const amountDisplay = membership?.plan?.amountPaise
    ? `₹${(membership.plan.amountPaise / 100).toLocaleString("en-IN")}`
    : null;
  const interval = membership?.plan?.interval === "ANNUAL" ? "year" : "month";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card glass className="max-w-lg w-full p-8">
        <CardContent className="p-0">
          {/* Success icon */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>

            <h1 className="text-2xl font-semibold mb-2">You&apos;re in.</h1>
            <p className="text-muted-foreground">
              Welcome to Mukha Mudra. We're excited to practice with you.
            </p>
          </div>

          {/* Purchase summary */}
          {membership && (
            <div className="mb-8 p-4 rounded-[4px] bg-muted/50 border border-border space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 text-primary" />
                Your subscription
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {productName} &mdash; {planName}
                </span>
                {amountDisplay && (
                  <span className="font-medium">
                    {amountDisplay}/{interval}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Check your email for confirmation and session details.
              </p>
            </div>
          )}

          {/* Primary CTA */}
          <div className="space-y-3 mb-6">
            {isOnboarded ? (
              <Link href="/app/sessions">
                <Button size="lg" variant="accent" className="w-full group">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Your First Session
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            ) : (
              <Link href="/onboarding">
                <Button size="lg" variant="accent" className="w-full group">
                  Complete Your Profile
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            )}
            <Link href="/app">
              <Button size="lg" variant="ghost" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>

          {/* Recording add-on reminder (client component reads sessionStorage) */}
          <RecordingAddonReminder />

          <p className="text-xs text-muted-foreground mt-6 text-center">
            Need help? Contact us at support@mukhamudra.com
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
