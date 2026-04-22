"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";
import { Sparkles, Wind, FlaskConical, Dumbbell, Users2 } from "lucide-react";

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

const practices = [
  {
    title: "Why Choose Face Yoga with Us?",
    subtitle: "7 techniques · Evenings",
    description: [
      "We combine traditional yoga wisdom with mindful facial practices to release deep tension and restore natural balance to the face.",
      "Our live sessions integrate Face Yoga, Gua Sha, and Cupping to awaken facial tissues and encourage healthy circulation.",
      "With consistent practice, you cultivate stronger facial tone and a radiant Slow Beauty glow.",
    ],
    href: "/face-yoga",
    cta: "Explore Face Yoga",
    icon: Sparkles,
    accent: "primary" as const,
    image: "/rutviq/transparent/rutviq_3802728451409965951_2026-01-04.png",
    imageAlt: "Facial muscle mapping: face yoga technique",
  },
  {
    title: "Why Choose Pranayama with Us?",
    subtitle: "8 stages · Mornings",
    description: [
      "Our pranayama practice draws from traditional Tantric breathwork to help calm the mind and reconnect you with your breath.",
      "Through guided breathing and classical bandha techniques, we help you build awareness of your body's internal rhythms.",
      "The result is a practice that supports clarity, vitality, and a deeper sense of inner balance.",
    ],
    href: "/pranayama",
    cta: "Explore Pranayama",
    icon: Wind,
    accent: "accent" as const,
    image: "/rutviq/transparent/rutviq_3450293005826331107_2024-09-05.png",
    imageAlt: "Pranayama breathwork demonstration",
  },
];

const scienceFacts = [
  {
    icon: FlaskConical,
    stat: "Cortisol ↓",
    detail: "Breathwork lowers the stress hormone that destroys collagen",
  },
  {
    icon: Dumbbell,
    stat: "Collagen ↑",
    detail: "Facial exercises stimulate natural collagen production",
  },
  {
    icon: Users2,
    stat: "Live > Recorded",
    detail: "Real-time correction and group accountability change everything",
  },
];

export function WhatHeTeachesSection() {
  return (
    <section className="aura-bg relative py-24 md:py-32 px-6 section-warm torn-edge-bottom">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/4.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_GALLERY }}
          className="text-center mb-12"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            The method
          </div>
          <h2
            className="heading-gold text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
          >
            What we teach & why it works
          </h2>
        </motion.div>

        {/* Two practice cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {practices.map((practice, i) => {
            const Icon = practice.icon;
            const borderColor =
              practice.accent === "primary"
                ? "border-l-primary/40"
                : "border-l-accent/40";

            return (
              <motion.div
                key={practice.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 * i,
                  ease: EASE_GALLERY,
                }}
                className={`void-card overflow-hidden border-l-[3px] ${borderColor}`}
              >
                {/* Portrait */}
                <div className="gold-frame relative h-56 md:h-64 overflow-hidden">
                  {/* Warm ambient glow behind portrait */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `radial-gradient(ellipse 70% 80% at 50% 60%, var(--color-${practice.accent}) 0%, transparent 70%)`,
                    }}
                  />
                  <Image
                    src={practice.image}
                    alt={practice.imageAlt}
                    fill
                    className="object-contain object-bottom image-dissolve-bottom opacity-80"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${practice.accent === "primary" ? "text-primary/70" : "text-accent/70"}`} />
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {practice.subtitle}
                    </span>
                  </div>
                  <h3
                    className="text-2xl font-light"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {practice.title}
                  </h3>
                  <div className="space-y-2">
                    {practice.description.map((line, j) => (
                      <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                  <Link href={practice.href}>
                    <Button
                      variant="gold"
                      className="mt-2 px-5 py-2.5 text-sm"
                    >
                      {practice.cta}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Science facts row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {scienceFacts.map((fact, i) => {
            const Icon = fact.icon;
            return (
              <motion.div
                key={fact.stat}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: 0.3 + 0.08 * i,
                  ease: EASE_GALLERY,
                }}
                className="void-card p-5 flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-[4px] bg-muted/40 flex-shrink-0 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p
                    className="text-lg font-light"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {fact.stat}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {fact.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bundle CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE_GALLERY }}
          className="parchment-card p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div>
            <h3
              className="text-xl font-light mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The complete system
            </h3>
            <p className="text-sm text-muted-foreground">
              Morning breathwork + evening face yoga = the full transformation.
              Bundle both from ₹6,000/year.
            </p>
          </div>
          <Link href="/pricing" className="flex-shrink-0">
            <Button variant="gold">See bundle pricing</Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
