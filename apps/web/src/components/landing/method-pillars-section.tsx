"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@ru/ui";

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

const PILLARS = [
  {
    number: "1",
    title: "Face Yoga & The Sutras",
    description:
      "We blend the aesthetic science of Face Yoga with the foundational Yamas and Niyamas of ancient yoga. Practicing Ahimsa (non-violence) prevents violent, tense expressions that make the face look hardened, while mastering Santosha (inner contentment) naturally keeps the cheeks and corners of the mouth lifted. By pairing these mindsets with targeted isometric exercises, we boost cellular energy and prevent your face from cracking under stress.",
  },
  {
    number: "2",
    title: "Tantra & Chakra Alchemy",
    description:
      "Experience the true essence of Tantra. Through systematic, 8-stage Chakra awakenings, we guide your Kundalini energy from the Root (Mooladhara) to the Command Center (Ajna). This is not just meditation; the chakras act as an intermediary center that actively converts your subtle, astral emotions into vital physical energy, pushing a divine, outward glow into your facial network.",
  },
  {
    number: "3",
    title: "Pranayama & The Nadi Network",
    description:
      "Your physical body is interconnected by a vast network of subtle energy channels known as Nadis. Our clinical Pranayama routines act as the ultimate internal lymphatic pump. By controlling the breath (Prana + Ayama), we absorb vital force into the astral body and circulate it flawlessly through the blood vessels, nerves, and facial meridians. This mastery halts cortisol production and powerfully preserves your skin\u2019s youthful architecture.",
  },
];

/* ── Gold vertical divider (matching hero) ── */
function GoldDivider() {
  return (
    <div className="flex flex-col items-center gap-0 h-full py-8">
      <div className="w-1.5 h-1.5 rotate-45 bg-[rgba(196,136,58,0.5)]" />
      <div className="flex-1 w-px bg-gradient-to-b from-[rgba(196,136,58,0.4)] via-[rgba(196,136,58,0.15)] to-[rgba(196,136,58,0.4)]" />
      <div className="w-1 h-1 rounded-full bg-[rgba(196,136,58,0.4)]" />
      <div className="flex-1 w-px bg-gradient-to-b from-[rgba(196,136,58,0.4)] via-[rgba(196,136,58,0.15)] to-[rgba(196,136,58,0.4)]" />
      <div className="w-1.5 h-1.5 rotate-45 bg-[rgba(196,136,58,0.5)]" />
    </div>
  );
}

/* ── Horizontal gold divider (mobile) ── */
function GoldDividerH() {
  return (
    <div className="flex items-center justify-center w-full py-1">
      <div className="flex items-center gap-2 w-48">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[rgba(196,136,58,0.4)]" />
        <div className="w-1.5 h-1.5 rotate-45 bg-[rgba(196,136,58,0.5)]" />
        <div className="w-1 h-1 rounded-full bg-[rgba(196,136,58,0.4)]" />
        <div className="w-1.5 h-1.5 rotate-45 bg-[rgba(196,136,58,0.5)]" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[rgba(196,136,58,0.4)]" />
      </div>
    </div>
  );
}

function PillarRow({
  pillar,
  index,
}: {
  pillar: (typeof PILLARS)[number];
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: EASE_GALLERY,
      }}
      className="group"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full cursor-pointer"
      >
        <div className="flex items-center gap-4 md:gap-6 py-5 md:py-7">
          {/* Large number */}
          <span
            className="text-[3.5rem] md:text-[5rem] leading-none font-light text-[rgba(196,136,58,0.15)] select-none transition-colors duration-500 group-hover:text-[rgba(196,136,58,0.3)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {pillar.number}
          </span>

          {/* Title */}
          <h3
            className="flex-1 text-left text-sm md:text-base uppercase tracking-[0.12em] font-medium text-[#F0E8D8]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {pillar.title}
          </h3>

          {/* Expand icon */}
          <div
            className={`w-10 h-10 md:w-11 md:h-11 rounded-full border border-[rgba(196,136,58,0.2)] flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:border-[rgba(196,136,58,0.4)] ${
              open ? "bg-[rgba(196,136,58,0.08)] border-[rgba(196,136,58,0.4)]" : ""
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={`text-[rgba(196,136,58,0.5)] transition-transform duration-500 group-hover:text-[rgba(196,136,58,0.8)] ${
                open ? "rotate-180" : ""
              }`}
            >
              <path d="M3 5.5L7 9.5L11 5.5" />
            </svg>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(196,136,58,0.15) 30%, rgba(196,136,58,0.15) 70%, transparent)",
          }}
        />
      </button>

      {/* Expandable description */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_GALLERY }}
            className="overflow-hidden"
          >
            <p className="text-sm text-[#8A8070] leading-relaxed pl-[4.5rem] md:pl-[6rem] pr-14 pb-5">
              {pillar.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function MethodPillarsSection() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Duo-tone grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr]">
        {/* ═══ LEFT — Sunrise / Parchment ═══ */}
        <div className="hero-sunrise relative px-6 md:px-10 lg:px-14 py-20 md:py-28 lg:py-32">
          {/* Grain overlay */}
          <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

          {/* Decorative lotus (top-right of panel) */}
          <motion.svg
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.35 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.5 }}
            width="100"
            height="100"
            viewBox="0 0 120 120"
            fill="none"
            className="absolute top-8 right-8 lg:top-12 lg:right-12 pointer-events-none z-[1]"
            aria-hidden="true"
          >
            <path d="M60 10 C55 30, 35 40, 20 55 C35 50, 50 55, 60 70 C70 55, 85 50, 100 55 C85 40, 65 30, 60 10Z" fill="rgba(212,160,84,0.15)" stroke="rgba(212,160,84,0.3)" strokeWidth="0.5" />
            <path d="M60 25 C56 40, 45 50, 40 60 C48 55, 55 58, 60 68 C65 58, 72 55, 80 60 C75 50, 64 40, 60 25Z" fill="rgba(212,160,84,0.18)" stroke="rgba(212,160,84,0.35)" strokeWidth="0.5" />
            <circle cx="60" cy="62" r="3" fill="rgba(212,160,84,0.4)" />
          </motion.svg>

          <div className="relative z-10 max-w-lg mx-auto lg:mx-0 lg:ml-auto lg:mr-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE_GALLERY }}
            >
              <div
                className="inline-block text-[0.6rem] uppercase tracking-[0.3em] px-3 py-1.5 rounded-full border mb-6"
                style={{
                  borderColor: "rgba(154,107,36,0.3)",
                  color: "#7A5C20",
                  background: "rgba(154,107,36,0.06)",
                }}
              >
                The method
              </div>
              <h2
                className="text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.15] mb-8"
                style={{ fontFamily: "var(--font-display)", color: "#1A1208" }}
              >
                Why Choose the
                <br />
                <span style={{ color: "#9A6B24" }}>Mukha Mudra</span> Method?
              </h2>
              <p
                className="text-sm md:text-[0.95rem] leading-relaxed max-w-lg"
                style={{ color: "#5C5347" }}
              >
                Your face is a divine reflection of your inner Shakti. According
                to ancient Tantric philosophy, true beauty is achieved through the
                expansion and liberation of consciousness (Tonati and Trayati). The
                Mukha Mudra method transcends basic skincare by utilizing the
                profound science of Nadis (energy channels) and Chakras to
                transform your astral energy into physical radiance. Rooted deeply
                in Patanjali&apos;s Yoga Sutras, we guide you to clear the
                emotional blockages and &ldquo;mental fluctuations&rdquo; that
                prematurely age the face, returning you to the true, homogeneous
                essence of Yoga.
              </p>

              <Link href="/trial" className="inline-block mt-8">
                <Button variant="gold" className="px-8 py-5 text-base">
                  Start Your Trial Session
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* ═══ CENTER — Gold divider ═══ */}
        {/* Desktop: vertical */}
        <div
          className="hidden lg:flex z-20"
          style={{ background: "linear-gradient(to bottom, #F5ECD4, #081C17)" }}
        >
          <GoldDivider />
        </div>
        {/* Mobile: horizontal */}
        <div
          className="lg:hidden z-20 relative"
          style={{ background: "linear-gradient(to right, #E5D6B8, #0F2E26)" }}
        >
          <GoldDividerH />
        </div>

        {/* ═══ RIGHT — Nightfall / Dark ═══ */}
        <div className="hero-nightfall relative px-6 md:px-10 lg:px-14 py-20 md:py-28 lg:py-32">
          {/* Grain overlay */}
          <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

          {/* Decorative crescent (top-left of panel) */}
          <motion.svg
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.3 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.6 }}
            width="40"
            height="40"
            viewBox="0 0 50 50"
            fill="none"
            className="absolute top-10 left-8 lg:top-14 lg:left-12 pointer-events-none z-[1]"
            aria-hidden="true"
          >
            <path d="M25 2 A23 23 0 1 1 25 48 A16 23 0 1 0 25 2Z" fill="rgba(212,160,84,0.3)" />
          </motion.svg>

          <div className="relative z-10 max-w-lg mx-auto lg:mx-0">
            {PILLARS.map((pillar, i) => (
              <PillarRow key={pillar.number} pillar={pillar} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
