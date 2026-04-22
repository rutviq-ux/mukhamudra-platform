import { Suspense } from "react";
import { PricingClient } from "./pricing-client";

export const metadata = {
  title: "Pricing | Mukha Mudra",
  description:
    "Simple, transparent pricing for Face Yoga, Pranayama, and Bundle plans.",
};

export default function PricingPage() {
  return (
    <Suspense>
      <PricingClient />
    </Suspense>
  );
}
