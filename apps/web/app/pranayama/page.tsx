"use client";

import Link from "next/link";
import { Check, Film, AlertCircle, UserPlus, Loader2, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { trackEvent } from "@/lib/posthog-provider";
import { PranayamaContent } from "@/components/services/pranayama-content";
import { CtaArrowGuide } from "@/components/cta-arrow-guide";
import { useCheckout, PHASE_LABELS } from "@/hooks/use-checkout";

const PLANS = [
  {
    slug: "pranayama-annual",
    name: "Annual",
    price: 3000,
    interval: "year",
    savings: "Save vs monthly",
    features: [
      "Unlimited group sessions",
      "3x/week live classes (Mon/Wed/Fri)",
      "Join any batch (8 AM or 9 AM IST)",
      "WhatsApp community access",
      "8-stage progressive curriculum",
    ],
  },
  {
    slug: "pranayama-monthly",
    name: "Monthly",
    price: 1111,
    interval: "month",
    features: [
      "Unlimited group sessions",
      "3x/week live classes (Mon/Wed/Fri)",
      "Join any batch (8 AM or 9 AM IST)",
      "WhatsApp community access",
      "Cancel anytime",
    ],
  },
];

const BUNDLE = {
  slug: "bundle-annual",
  name: "Bundle: Both Programs",
  price: 6000,
  interval: "year",
  perMonth: "₹500/mo",
  features: [
    "All Face Yoga + Pranayama sessions",
    "Access to all 4 batches",
    "WhatsApp community for both",
    "Free recording add-on for 12 months",
  ],
};

const ALL_PLANS = [...PLANS, BUNDLE];

export default function PranayamaPage() {
  const {
    selectedPlan,
    setSelectedPlan,
    addRecording,
    setAddRecording,
    loadingPhase,
    error,
    setError,
    isLoading,
    isLoaded,
    isSignedIn,
    currentPlan,
    isBundle,
    showRecordingAddon,
    ctaLabel,
    handleSubscribe,
  } = useCheckout({
    redirectPage: "/pranayama",
    productLabel: "Pranayama",
    allPlans: ALL_PLANS,
    defaultPlanSlug: "bundle-annual",
  });

  return (
    <>
      {/* Breadcrumb — top of page */}
      <div className="relative z-10 px-6 pt-20 pb-0">
        <nav className="mx-auto max-w-6xl flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">Pranayama</span>
        </nav>
      </div>

      <PranayamaContent />
      <main className="px-4 pt-12 pb-32 md:pb-8" id="checkout">

      {/* Plan Selection */}
      <div className="mx-auto max-w-4xl mb-8">
        <div className="text-center mb-10">
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            Choose your plan
          </div>
          <h2
            className="text-3xl md:text-4xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Start practicing this week
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
            All plans include unlimited live group sessions 3&times;/week.
            Pick what works for you. Upgrade or cancel anytime.
          </p>
        </div>

        {/* Bundle Card — full width */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="mb-6">
          <Card
            glass
            className={`cursor-pointer transition-all border-success/20 ${
              selectedPlan === BUNDLE.slug
                ? "ring-2 ring-success"
                : "hover:border-success/50"
            }`}
            onClick={() => {
              setSelectedPlan(BUNDLE.slug);
              setAddRecording(false);
              setError(null);
              trackEvent.planSelected(BUNDLE.slug);
            }}
          >
            <div className="bg-success text-success-foreground text-xs font-medium py-1 px-3 rounded-b-lg mx-auto w-fit">
              Best Value
            </div>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{BUNDLE.name}</span>
                    {selectedPlan === BUNDLE.slug && (
                      <Check className="h-5 w-5 text-success" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get both for ₹{BUNDLE.price.toLocaleString("en-IN")}/year, plus free recording add-on for all 12 months
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold">
                  ₹{BUNDLE.price.toLocaleString("en-IN")}
                </span>
                <span className="text-muted-foreground text-sm">/year</span>
                <span className="text-xs text-success">{BUNDLE.perMonth}</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                {BUNDLE.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Individual plans */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.slug}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                glass
                className={`cursor-pointer transition-all ${
                  selectedPlan === plan.slug
                    ? "ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => {
                  setSelectedPlan(plan.slug);
                  setError(null);
                  trackEvent.planSelected(plan.slug);
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    {selectedPlan === plan.slug && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      ₹{plan.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      /{plan.interval}
                    </span>
                  </div>
                  {plan.savings && (
                    <p className="text-xs text-success mb-3">{plan.savings}</p>
                  )}
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recording Add-on */}
      {showRecordingAddon && (
        <div className="mx-auto max-w-4xl mb-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              glass
              className={`cursor-pointer transition-all ${
                addRecording
                  ? "ring-2 ring-[#C4883A]"
                  : "hover:border-[#C4883A]/50"
              }`}
              onClick={() => setAddRecording(!addRecording)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-[4px] bg-[#C4883A]/20">
                    <Film className="h-5 w-5 text-[#C4883A]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Add Recording Access</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">+₹1,000<span className="text-sm font-normal text-muted-foreground">/year</span></span>
                        {addRecording && <Check className="h-5 w-5 text-[#C4883A]" />}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Watch missed sessions, revisit techniques, practice at your own pace.
                      {addRecording && (
                        <span className="text-[#C4883A]"> Added after your subscription activates.</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)]/95 backdrop-blur-sm border-t border-border/50 z-40">
        <div className="mx-auto max-w-4xl px-4 py-2.5 space-y-2">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-[4px] px-3 py-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick plan switcher */}
          {!isLoading && (
            <div className="flex items-center gap-1.5">
              {ALL_PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.slug;
                const isBundlePlan = plan.slug === BUNDLE.slug;
                const label = isBundlePlan ? "Bundle" : plan.name;
                return (
                  <button
                    key={plan.slug}
                    type="button"
                    className={`flex-1 py-1 rounded-md text-[0.65rem] leading-tight transition-all ${
                      isSelected
                        ? isBundlePlan
                          ? "bg-success/15 text-success"
                          : "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      setSelectedPlan(plan.slug);
                      if (isBundlePlan) setAddRecording(false);
                      setError(null);
                      trackEvent.planSelected(plan.slug);
                    }}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="opacity-60"> ₹{plan.price.toLocaleString("en-IN")}/{plan.interval === "year" ? "yr" : "mo"}</span>
                  </button>
                );
              })}
            </div>
          )}

          <CtaArrowGuide />

          <Button
            size="lg"
            variant="gold"
            className="w-full font-medium tracking-wide"
            disabled={!selectedPlan || isLoading || !isLoaded}
            onClick={() => handleSubscribe()}
          >
            {!isLoaded ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : isLoading ? (
              <motion.span
                key={loadingPhase}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {PHASE_LABELS[loadingPhase!]}
              </motion.span>
            ) : !selectedPlan ? (
              "Select a plan"
            ) : (
              <span className="flex items-center justify-center gap-2">
                {!isSignedIn ? <UserPlus className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                {ctaLabel}
              </span>
            )}
          </Button>

          <p className="text-[0.6rem] text-center text-muted-foreground/40 -mt-0.5">
            {isLoaded && !isSignedIn && selectedPlan && !isLoading
              ? "Free account required · "
              : ""}
            By subscribing you agree to our{" "}
            <Link href="/terms" target="_blank" className="hover:underline">
              Terms
            </Link>
          </p>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </main>
    </>
  );
}
