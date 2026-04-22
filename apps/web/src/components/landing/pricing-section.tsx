"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@ru/ui";
import { Check, Film } from "lucide-react";

const TIERS = [
  {
    name: "Face Yoga",
    tier: "Mastery",
    price: "₹3,000",
    interval: "/year",
    monthly: "₹1,111/mo",
    href: "/face-yoga",
    accent: "accent",
    features: [
      "3x/week live group sessions",
      "7 techniques per session",
      "Evening batches (9 or 10 PM)",
      "WhatsApp community access",
    ],
  },
  {
    name: "Pranayama",
    tier: "Explorer",
    price: "₹3,000",
    interval: "/year",
    monthly: "₹1,111/mo",
    href: "/pranayama",
    accent: "primary",
    features: [
      "3x/week live group sessions",
      "8-stage progressive curriculum",
      "Morning batches (8 or 9 AM)",
      "WhatsApp community access",
    ],
  },
  {
    name: "Bundle",
    tier: "Complete System",
    price: "₹6,000",
    interval: "/year",
    monthly: "₹1,500/mo",
    href: "/pricing",
    accent: "primary",
    popular: true,
    features: [
      "All Face Yoga sessions",
      "All Pranayama sessions",
      "All 4 batches included",
      "WhatsApp community for both",
    ],
  },
];

export function PricingSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/5.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            Pricing
          </div>
          <h2
            className="heading-gold text-3xl sm:text-4xl md:text-5xl font-light"
          >
            Start this week.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            Annual plans are the best value. Monthly available if you prefer
            flexibility. All plans include unlimited live sessions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`${tier.popular ? "parchment-card" : "void-card"} p-8 space-y-6 relative ${
                tier.popular
                  ? "!overflow-visible"
                  : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="gold-sparkle bg-primary text-primary-foreground text-[0.65rem] uppercase tracking-[0.15em] font-medium px-4 py-1.5 rounded-full">
                    Best Value
                  </span>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                  {tier.tier}
                </p>
                <h3
                  className="text-2xl font-light mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">
                    {tier.interval}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  or {tier.monthly}
                </p>
              </div>

              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={tier.href}>
                <Button
                  variant="gold"
                  className="w-full py-5 text-base"
                >
                  Get {tier.name}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Recording add-on */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="void-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-3xl mx-auto"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[4px] bg-primary/15 flex items-center justify-center">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Recording Access</p>
              <p className="text-sm text-muted-foreground">
                ₹1,000/year: watch all session recordings. Annual plans only.
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <Button className="btn-ghost px-6 py-3 whitespace-nowrap">
              Learn more
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
