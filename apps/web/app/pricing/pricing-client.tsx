"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Film, AlertCircle, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import {
  useCheckout,
  PHASE_LABELS,
  type CheckoutPlan,
} from "@/hooks/use-checkout";
import { CtaArrowGuide } from "@/components/cta-arrow-guide";
import { RecordingAddonCheckout } from "@/components/recording-addon-checkout";

const ALL_PLANS: CheckoutPlan[] = [
  { slug: "face-annual", name: "Face Yoga Annual", price: 3000, interval: "year" },
  { slug: "face-monthly", name: "Face Yoga Monthly", price: 1111, interval: "month" },
  { slug: "pranayama-annual", name: "Pranayama Annual", price: 3000, interval: "year" },
  { slug: "pranayama-monthly", name: "Pranayama Monthly", price: 1111, interval: "month" },
  { slug: "bundle-annual", name: "Bundle Annual", price: 6000, interval: "year" },
];

interface ProductPlan {
  name: string;
  price: number;
  interval: string;
  slug: string;
  popular?: boolean;
  perMonth?: string;
}

interface Product {
  name: string;
  defaultSlug: string;
  cover: string | string[];
  description: string;
  schedule: string;
  plans: ProductPlan[];
  features: string[];
}

const PRODUCTS: Product[] = [
  {
    name: "Face Yoga",
    defaultSlug: "face-annual",
    cover: "/face-yoga/face_yoga_cover.jpg",
    description:
      "7 techniques including Face Yoga, Gua Sha, Roller, Trataka, Osteopathy, Cupping, and Acupressure.",
    schedule: "Mon / Wed / Fri evenings, 9 PM or 10 PM IST",
    plans: [
      { name: "Annual", slug: "face-annual", price: 3000, interval: "year", popular: true, perMonth: "₹250/mo" },
      { name: "Monthly", slug: "face-monthly", price: 1111, interval: "month" },
    ],
    features: [
      "Unlimited group sessions",
      "3x/week live classes",
      "Choose your batch time",
      "WhatsApp community",
      "Recording add-on eligible (annual)",
    ],
  },
  {
    name: "Pranayama",
    defaultSlug: "pranayama-annual",
    cover: "/pranayama/pranayama_page_cover.png",
    description:
      "8-stage progressive breathwork curriculum from Ajna to Sahasrara.",
    schedule: "Mon / Wed / Fri mornings, 8 AM or 9 AM IST",
    plans: [
      { name: "Annual", slug: "pranayama-annual", price: 3000, interval: "year", popular: true, perMonth: "₹250/mo" },
      { name: "Monthly", slug: "pranayama-monthly", price: 1111, interval: "month" },
    ],
    features: [
      "Unlimited group sessions",
      "3x/week live classes",
      "Choose your batch time",
      "WhatsApp community",
      "Recording add-on eligible (annual)",
    ],
  },
  {
    name: "Bundle: Both Programs",
    defaultSlug: "bundle-annual",
    cover: ["/face-yoga/face_yoga_cover.jpg", "/pranayama/pranayama_page_cover.png"],
    description:
      "Get the best of both worlds. Access all Face Yoga + Pranayama batches with a single subscription.",
    schedule: "All 4 batches, mornings + evenings, Mon / Wed / Fri",
    plans: [
      { name: "Annual", slug: "bundle-annual", price: 6000, interval: "year", popular: true, perMonth: "₹500/mo" },
    ],
    features: [
      "All Face Yoga sessions",
      "All Pranayama sessions",
      "Access to all 4 batches",
      "WhatsApp community for both",
      "Recording add-on eligible",
    ],
  },
];

export function PricingClient() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  // Track selected plan per product
  const [selectedSlugs, setSelectedSlugs] = useState<Record<string, string>>(() =>
    Object.fromEntries(PRODUCTS.map((p) => [p.name, p.defaultSlug]))
  );

  const {
    selectedPlan,
    loadingPhase,
    error,
    setError,
    isLoading,
    isLoaded,
    handleSubscribe,
    autoRenew,
    setAutoRenew,
  } = useCheckout({
    redirectPage: "/pricing",
    productLabel: "Plan",
    allPlans: ALL_PLANS,
    defaultPlanSlug: "bundle-annual",
  });

  useEffect(() => {
    if (!isLoading) setActiveSlug(null);
  }, [isLoading]);

  const onGetStarted = async (productName: string) => {
    const slug = selectedSlugs[productName]!;
    setError(null);
    setActiveSlug(slug);
    await handleSubscribe(slug);
  };

  const loadingSlug = activeSlug || selectedPlan;

  return (
    <main className="min-h-screen px-4 pt-24 pb-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground">Pricing</span>
        </nav>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold mb-3">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose Face Yoga, Pranayama, or both. All plans include unlimited live group sessions 3x/week.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto max-w-2xl mb-6 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-[4px] px-4 py-3"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mb-16">
          {PRODUCTS.map((product) => {
            const chosenSlug = selectedSlugs[product.name]!;
            const isActive = isLoading && loadingSlug === chosenSlug;
            return (
              <Card key={product.name} glass className="flex flex-col overflow-hidden">
                {/* Cover image */}
                {product.cover && (
                  <div className="relative h-44 w-full overflow-hidden">
                    {Array.isArray(product.cover) ? (
                      <div className="relative flex h-full">
                        {product.cover.map((src) => (
                          <div key={src} className="relative flex-1">
                            <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 20vw" />
                          </div>
                        ))}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-8 h-8 rounded-full backdrop-blur-sm border border-white/30 flex items-center justify-center text-white/80 text-sm font-medium">+</div>
                        </div>
                      </div>
                    ) : (
                      <Image src={product.cover} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl mb-3">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{product.schedule}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Selectable pricing tiers */}
                  <div className="space-y-3 mb-6">
                    {product.plans.map((plan) => {
                      const isSelected = chosenSlug === plan.slug;
                      return (
                        <button
                          key={plan.slug}
                          type="button"
                          onClick={() => setSelectedSlugs((prev) => ({ ...prev, [product.name]: plan.slug }))}
                          className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                            isSelected
                              ? "bg-primary/10 border-2 border-primary/50 ring-1 ring-primary/30"
                              : "bg-muted/50 border border-transparent hover:border-primary/20 hover:bg-primary/5"
                          }`}
                        >
                          <div>
                            <span className="font-medium">{plan.name}</span>
                            {plan.popular && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Best Value</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold">₹{plan.price.toLocaleString("en-IN")}</span>
                            <span className="text-muted-foreground text-sm">/{plan.interval}</span>
                            {plan.perMonth && <p className="text-xs text-success">{plan.perMonth}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    {product.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto space-y-2">
                    <CtaArrowGuide />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoRenew}
                        onChange={(e) => setAutoRenew(e.target.checked)}
                        className="rounded"
                      />
                      Enable auto-renew
                    </label>
                    <Button
                      variant="gold"
                      size="lg"
                      className="w-full"
                      disabled={isLoading || !isLoaded}
                      onClick={() => onGetStarted(product.name)}
                    >
                      {isActive ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {PHASE_LABELS[loadingPhase!]}
                        </span>
                      ) : (
                        "Join"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recording Add-on */}
        <div className="mx-auto max-w-2xl mb-16">
          <Card glass>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-[4px] bg-[#C4883A]/20">
                  <Film className="h-6 w-6 text-[#C4883A]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Recording Access Add-on</h3>
                  <p className="text-sm text-muted-foreground">Available with annual plans only</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-2xl font-bold">₹1,000</span>
                  <span className="text-muted-foreground text-sm">/year</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Access all session recordings across Face Yoga and Pranayama. Watch missed sessions, revisit techniques,
                or practice along at your own pace. Recordings are available within 24 hours of each session.
              </p>
              <div className="mt-4">
                <RecordingAddonCheckout />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold text-center mb-8">Common Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-1">What happens after I subscribe?</h3>
              <p className="text-sm text-muted-foreground">
                You'll be added to your batch's WhatsApp group and can immediately start booking sessions from your dashboard. Sessions run Mon/Wed/Fri.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Can I switch batches?</h3>
              <p className="text-sm text-muted-foreground">
                Contact us via WhatsApp and we'll move you to a different batch at no extra cost.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">What if I want both Face Yoga and Pranayama?</h3>
              <p className="text-sm text-muted-foreground">
                The Bundle plan gives you access to all 4 batches at a discounted rate. Annual bundle is ₹6,000/year (₹500/mo) vs ₹6,000/year buying separately.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. Cancel from your billing page and you'll retain access until the end of your current billing period.{" "}
                <Link href="/terms" className="text-primary hover:underline">See full terms</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </main>
  );
}
