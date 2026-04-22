"use client";

import { motion } from "framer-motion";

const KEYWORDS = [
  "Face Yoga",
  "Gua Sha",
  "Facial Cupping",
  "Diaphragm Breathing",
  "Meditation",
  "Lymphatic Drainage",
  "Osteopathy",
];

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

function MarqueeTrack({ id }: { id: string }) {
  return (
    <div className="flex items-center" aria-hidden="true">
      {KEYWORDS.map((keyword) => (
        <div
          key={`${id}-${keyword}`}
          className="flex items-center gap-10 md:gap-14 px-5 md:px-7"
        >
          <span
            className="text-sm md:text-base tracking-[0.15em] whitespace-nowrap text-foreground/80"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {keyword}
          </span>
          <span
            className="select-none text-foreground/20"
            aria-hidden="true"
          >
            ✦
          </span>
        </div>
      ))}
    </div>
  );
}

export function BrandMarquee() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: EASE_GALLERY }}
      className="group relative py-8 md:py-10 overflow-hidden select-none"
    >
      {/* Subtle rules */}
      <div
        className="absolute top-0 left-[8%] right-[8%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-foreground) 15%, transparent) 50%, transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-[8%] right-[8%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-foreground) 15%, transparent) 50%, transparent)",
        }}
      />

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Scrolling track — pauses on hover */}
      <div className="flex w-max animate-[marquee-scroll_40s_linear_infinite] group-hover:[animation-play-state:paused]">
        <MarqueeTrack id="a" />
        <MarqueeTrack id="b" />
      </div>
    </motion.section>
  );
}
