"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function AboutSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-4xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            The practice
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What is Mukha Mudra?
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="void-card p-8 md:p-12 space-y-6"
        >
          <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
            <span className="text-foreground font-medium">Mukha Mudra</span> is
            the ultimate yoga-based practice that goes deep, past your
            surface-level skin, to reset your face&apos;s muscles, tissues, and
            energy channels for that natural, snatched lift.
          </p>
          <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
            In Sanskrit,{" "}
            <span
              className="text-foreground"
              style={{ fontFamily: "var(--font-devanagari)" }}
            >
              मुख
            </span>{" "}
            (<span className="italic">Mukha</span>) means &ldquo;face&rdquo;,
            literally the &ldquo;opening&rdquo;, and{" "}
            <span
              className="text-foreground"
              style={{ fontFamily: "var(--font-devanagari)" }}
            >
              मुद्रा
            </span>{" "}
            (<span className="italic">Mudra</span>) is a &ldquo;gesture that
            seals your Prana.&rdquo; Together, it&apos;s the art of channelling
            life-force energy through facial gestures that lift, sculpt, and glow
            you up from the inside out.
          </p>
          <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
            We blend{" "}
            <span className="text-foreground font-medium">7 modalities</span>{" "}
            into a single coherent practice: Face Yoga, Gua Sha, Roller
            Therapy, Trataka, Osteopathy, Cupping, and Acupressure, alongside a
            progressive 8-stage Pranayama curriculum designed to kill cortisol,
            protect your collagen, and activate that godly glow.
          </p>
        </motion.div>

        {/* ── The science hook with face-mapping image ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="void-card p-8 md:p-10 border-primary/20 overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <h3
                className="text-xl font-light mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Cortisol-Collagen Connection
              </h3>
              <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
                Stress triggers cortisol. Cortisol eats collagen. Collagen is
                what keeps your skin plump, lifted, and youthful. So every time
                you stress out, you&apos;re literally ageing your face.
                That&apos;s why Mukha Mudra attacks the problem from both sides
                :{" "}
                <span className="text-foreground">Face Yoga</span> rebuilds the
                structure (muscles, fascia, lymph), and{" "}
                <span className="text-foreground">Pranayama</span> eliminates
                the destroyer (cortisol). Simple words: stop stressing out and
                being ugly.
              </p>
            </div>
            <div className="hidden md:block relative flex-shrink-0">
              <Image
                src="/rutviq/transparent/rutviq_3802728451409965951_2026-01-04.png"
                alt="Facial mapping technique"
                width={200}
                height={260}
                className="rounded-[4px] object-cover opacity-90 image-dissolve-portrait-soft"
              />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: "Face Yoga",
              value: "Evening",
              detail: "Mon / Wed / Fri, 9 or 10 PM IST",
            },
            {
              label: "Pranayama",
              value: "Morning",
              detail: "Mon / Wed / Fri, 8 or 9 AM IST",
            },
            {
              label: "Duration",
              value: "30 min",
              detail: "Per session: consistency over intensity",
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 * i }}
              className="void-card p-6 text-center space-y-2"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {item.label}
              </p>
              <p
                className="text-2xl font-light"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
