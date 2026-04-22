"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@ru/ui";

export function WhyBothSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/1.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-5xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            The full practice
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Why do both?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            Face Yoga and Pranayama aren&apos;t separate practices. They&apos;re
            two halves of the same system. One builds the structure. The other
            protects it. Together, they deliver 2x results.
          </p>
        </motion.div>

        {/* ── Science callout ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="void-card p-6 md:p-8 border-primary/20 text-center"
        >
          <p className="text-muted-foreground leading-relaxed text-[0.95rem] max-w-3xl mx-auto">
            <span className="text-foreground font-medium">The science:</span>{" "}
            Pranayama activates the thyroid gland through Jalandhara Bandha and
            specific breathing patterns. A well-regulated thyroid controls
            metabolism, hormonal balance, and (critically) your skin&apos;s
            ability to regenerate collagen. Combine that with Face Yoga&apos;s
            direct muscle activation and lymphatic drainage, and you get a
            compounding effect that neither practice achieves alone.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Face Yoga Only */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="void-card p-6 space-y-4"
          >
            <h3
              className="text-xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Face Yoga alone
            </h3>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60">
              The structure builder
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Visible toning, sculpting, and lifting
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Lymphatic drainage reduces puffiness
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Fascia release and muscle re-education
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-0.5">−</span>
                Cortisol still breaking down collagen
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-0.5">−</span>
                No thyroid or hormonal optimisation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-0.5">−</span>
                Rebuilding without protecting
              </li>
            </ul>
          </motion.div>

          {/* Pranayama Only */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="void-card p-6 space-y-4"
          >
            <h3
              className="text-xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pranayama alone
            </h3>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60">
              The cortisol killer
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Cortisol suppression protects collagen
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Better sleep, energy, and mental clarity
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Thyroid and hormonal regulation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-0.5">−</span>
                No facial muscle activation or toning
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-0.5">−</span>
                No lymphatic or fascia work
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/40 mt-0.5">−</span>
                Protecting without rebuilding
              </li>
            </ul>
          </motion.div>

          {/* Both */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="void-card p-6 space-y-4 border-primary/40 shadow-[0_0_60px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
          >
            <h3
              className="text-xl font-light text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Both together
            </h3>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">
              The complete system: 2x results
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Cortisol managed → collagen preserved
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Facial muscles toned + nourished with oxygen
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Thyroid activation + fibroblast stimulation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Morning energy + evening wind-down ritual
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                Building AND protecting simultaneously
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">+</span>
                The complete Mukha Mudra system
              </li>
            </ul>
            <Link href="/pricing" className="block pt-2">
              <Button variant="gold" className="w-full py-4">
                Bundle: ₹6,000/year
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
