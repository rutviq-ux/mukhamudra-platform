"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// PostHog events for the Mukha Mudra platform
export const trackEvent = {
  ctaClick: (service: string) =>
    posthog.capture("cta_click", { service }),
  planSelected: (planId: string) =>
    posthog.capture("plan_selected", { planId }),
  batchSelected: (batchId: string) =>
    posthog.capture("batch_selected", { batchId }),
  checkoutOpened: (provider: string) =>
    posthog.capture("checkout_opened", { provider }),
  paymentSuccessUI: (orderId: string) =>
    posthog.capture("payment_success_ui", { orderId }),
  sessionBooked: (sessionId: string) =>
    posthog.capture("session_booked", { sessionId }),
  joinLinkOpened: (sessionId: string) =>
    posthog.capture("join_link_opened", { sessionId }),
  newsletterSubscribeClicked: () =>
    posthog.capture("newsletter_subscribe_clicked"),
  newsletterSubscribed: () =>
    posthog.capture("newsletter_subscribed"),
  blogPostViewed: (slug: string) =>
    posthog.capture("blog_post_viewed", { slug }),
};

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthogClient.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthogClient]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (key && host && !key.includes("your_key")) {
      posthog.init(key, {
        api_host: host,
        person_profiles: "identified_only",
        capture_pageview: false, // We capture manually
        capture_pageleave: true,
      });
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
