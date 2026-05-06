"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trackEvent } from "@/lib/posthog-provider";

export type LoadingPhase = null | "redirecting" | "creating" | "opening";

export const PHASE_LABELS: Record<Exclude<LoadingPhase, null>, string> = {
  redirecting: "Taking you to sign up\u2026",
  creating: "Creating your subscription\u2026",
  opening: "Opening payment\u2026",
};

export interface CheckoutPlan {
  slug: string;
  name: string;
  price: number;
  interval: string;
  [key: string]: unknown;
}

interface UseCheckoutOptions {
  /** Path used for sign-up redirect and intent matching, e.g. "/face-yoga" */
  redirectPage: string;
  /** Label shown in Razorpay modal, e.g. "Face Yoga" */
  productLabel: string;
  /** All selectable plans (including bundle) */
  allPlans: CheckoutPlan[];
  /** Plan slug to pre-select when no ?plan= param */
  defaultPlanSlug: string;
}

export function useCheckout({
  redirectPage,
  productLabel,
  allPlans,
  defaultPlanSlug,
}: UseCheckoutOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();

  const validSlugs = useMemo(() => new Set(allPlans.map((p) => p.slug)), [allPlans]);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [addRecording, setAddRecording] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null);
  const [error, setError] = useState<string | null>(null);
  const autoCheckoutFired = useRef(false);

  // Pre-select from ?plan= query param or default
  useEffect(() => {
    const paramPlan = searchParams.get("plan");
    if (paramPlan && validSlugs.has(paramPlan)) {
      setSelectedPlan(paramPlan);
    } else {
      setSelectedPlan(defaultPlanSlug);
    }
  }, [searchParams, validSlugs, defaultPlanSlug]);

  const currentPlan = allPlans.find((p) => p.slug === selectedPlan);
  const isBundle = selectedPlan?.startsWith("bundle-");
  const showRecordingAddon = selectedPlan && !isBundle;
  const isLoading = loadingPhase !== null;

  const startCheckout = useCallback(
    async (planSlug: string, wantRecording: boolean, wantAutoRenew: boolean) => {
      setError(null);
      setLoadingPhase("creating");
      trackEvent.checkoutOpened("razorpay");

      const plan = allPlans.find((p) => p.slug === planSlug);
      const isBundlePlan = planSlug.startsWith("bundle-");

      try {
        const res = await fetch("/api/razorpay/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planSlug, termsAccepted: true, autoRenew: wantAutoRenew }),
        });

        if (res.status === 401) {
          saveCheckoutIntent(planSlug, wantRecording, wantAutoRenew, true, redirectPage);
          setLoadingPhase("redirecting");
          router.push(`/auth/sign-up?redirect_url=${redirectPage}`);
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong. Please try again.");
          setLoadingPhase(null);
          return;
        }

        if (wantRecording && !isBundlePlan) {
          sessionStorage.setItem("mm-recording-addon-intent", "true");
        }

        setLoadingPhase("opening");

        const rzpOptions: Record<string, unknown> = {
          key: data.keyId,
          name: "Mukha Mudra",
          description: `${productLabel}: ${plan?.name}`,
          handler: () => {
            window.location.href = "/checkout/success";
          },
          modal: { ondismiss: () => setLoadingPhase(null) },
          prefill: data.prefill || {},
          theme: { color: "#2E9E86" },
        };

        if (data.subscriptionId) {
          rzpOptions.subscription_id = data.subscriptionId;
        } else if (data.orderId) {
          rzpOptions.order_id = data.orderId;
          rzpOptions.amount = data.amount;
          rzpOptions.currency = "INR";
        }

        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.open();
      } catch {
        setError("Connection error. Please check your internet and try again.");
        setLoadingPhase(null);
      }
    },
    [router, allPlans, productLabel, redirectPage],
  );

  /** Start checkout for the currently selected plan, or pass a slug directly. */
  const handleSubscribe = useCallback(
    async (planSlugOverride?: string) => {
      const planSlug = planSlugOverride || selectedPlan;
      if (!planSlug) return;

      if (!isSignedIn) {
        saveCheckoutIntent(planSlug, addRecording, autoRenew, termsAccepted, redirectPage);
        setLoadingPhase("redirecting");
        router.push(`/auth/sign-up?redirect_url=${redirectPage}`);
        return;
      }

      await startCheckout(planSlug, addRecording, autoRenew);
    },
    [selectedPlan, isSignedIn, addRecording, autoRenew, termsAccepted, router, startCheckout, redirectPage],
  );

  // Auto-resume checkout after sign-in redirect
  useEffect(() => {
    if (!isLoaded || !isSignedIn || autoCheckoutFired.current) return;

    const raw = sessionStorage.getItem("mm-checkout-intent");
    if (!raw) return;

    try {
      const intent = JSON.parse(raw) as {
        planSlug: string;
        addRecording: boolean;
        autoRenew: boolean;
        termsAccepted?: boolean;
        page: string;
      };
      if (intent.page !== redirectPage) return;

      sessionStorage.removeItem("mm-checkout-intent");
      autoCheckoutFired.current = true;

      if (validSlugs.has(intent.planSlug)) {
        setSelectedPlan(intent.planSlug);
        setAddRecording(intent.addRecording);
        setAutoRenew(intent.autoRenew ?? false);
        if (intent.termsAccepted) setTermsAccepted(true);
      }

      const timer = setTimeout(() => startCheckout(intent.planSlug, intent.addRecording, intent.autoRenew ?? false), 600);
      return () => clearTimeout(timer);
    } catch {
      sessionStorage.removeItem("mm-checkout-intent");
    }
  }, [isLoaded, isSignedIn, startCheckout, redirectPage, validSlugs]);

  const ctaLabel = !isLoaded
    ? null
    : isLoading
      ? null
      : !selectedPlan
        ? null
        : !isSignedIn
          ? "Join"
          : "Subscribe Now";

  return {
    selectedPlan,
    setSelectedPlan,
    addRecording,
    setAddRecording,
    autoRenew,
    setAutoRenew,
    termsAccepted,
    setTermsAccepted,
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
    startCheckout,
  };
}

function saveCheckoutIntent(
  planSlug: string,
  addRecording: boolean,
  autoRenew: boolean,
  termsAccepted: boolean,
  page: string,
) {
  try {
    sessionStorage.setItem(
      "mm-checkout-intent",
      JSON.stringify({ planSlug, addRecording, autoRenew, termsAccepted, page }),
    );
  } catch {
    /* quota or private browsing */
  }
}
