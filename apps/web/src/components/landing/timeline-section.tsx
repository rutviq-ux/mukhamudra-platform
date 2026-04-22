"use client";

import { motion } from "framer-motion";
import { UserPlus, Calendar, Sparkles } from "lucide-react";

const steps = [
  {
    number: "1",
    title: "Pick your practice",
    description: "Face Yoga for evening sculpting, Pranayama for morning breathwork, or bundle both. Pick your batch time.",
    icon: UserPlus,
    color: "gold",
  },
  {
    number: "2",
    title: "Pay and book instantly",
    description: "Annual plans from \u20B93,000/year. Monthly available too. Subscribe and you\u2019re in your WhatsApp group within minutes.",
    icon: Calendar,
    color: "indigo",
  },
  {
    number: "3",
    title: "Show up and practice",
    description: "Join the live Google Meet session Mon/Wed/Fri, follow our guidance, and feel the difference. 30 minutes.",
    icon: Sparkles,
    color: "gold",
  },
];

export function TimelineSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/4.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center lg:text-left mb-16"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto lg:mx-0 mb-6">
            3 steps
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From sign-up to first session in under 5 minutes.
          </h2>
          <p className="text-muted-foreground max-w-full lg:max-w-md mt-4">
            No onboarding calls. No waiting lists. Pick, pay, and practice.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-[0.42fr_0.58fr] gap-10 items-start">
          <div className="void-card p-8 space-y-6">
            <div className="tag-pill uppercase tracking-[0.25em]">
              Why live?
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Pre-recorded videos can't correct your form or adjust to your pace.
              When you practice live with us, every session is tailored to
              what's happening in the room.
            </p>
            <div className="rounded-[4px] border border-border bg-card p-5 space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                What members say
              </p>
              <p className="text-sm text-muted-foreground">
                &ldquo;The live format keeps me accountable. I've never stuck
                with a practice this long.&rdquo;
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--color-mm-gold)] via-[var(--color-mm-emerald)] to-[var(--color-mm-gold)] opacity-40" />
            <ol className="space-y-8">
              {steps.map((step, index) => (
                <motion.li
                  key={step.number}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.15 }}
                  className="relative pl-16"
                >
                  <div className="absolute left-0 top-3">
                    <div
                      className={`w-10 h-10 rounded-[4px] bg-[var(--color-elevated)] border ${
                        step.color === "gold"
                          ? "border-primary text-primary"
                          : "border-accent text-accent"
                      } flex items-center justify-center text-xs tracking-[0.2em]`}
                    >
                      {step.number}
                    </div>
                  </div>

                  <div className="void-card p-6 sm:p-7">
                    <div className="flex items-center gap-3 mb-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      <step.icon className="w-4 h-4" />
                      Step {step.number}
                    </div>
                    <h3
                      className="text-2xl font-light"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground/85 text-sm leading-relaxed mt-2 max-w-full">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
