"use client";

import { motion } from "framer-motion";

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

const RIBBON_ITEMS = [
  { value: "100K+", label: "Instagram community" },
  { value: "2,000+", label: "Live sessions taught" },
  { value: "500+", label: "Members practicing daily" },
  { value: "3×/week", label: "Live classes" },
  { value: "7", label: "Facial techniques" },
  { value: "8-stage", label: "Breathwork curriculum" },
  { value: "Above the neck", label: "Practice focus" },
  { value: "Trusted", label: "By thousands" },
];

function MarqueeTrack({ id }: { id: string }) {
  return (
    <div className="flex items-center" aria-hidden="true">
      {RIBBON_ITEMS.map((item) => (
        <div
          key={`${id}-${item.label}`}
          className="flex items-center gap-6 md:gap-10 px-3 md:px-5"
        >
          <div className="flex items-center gap-2 md:gap-3 whitespace-nowrap">
            <span
              className="text-sm md:text-base font-light tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {item.value}
            </span>
            <span className="text-[0.55rem] md:text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              {item.label}
            </span>
          </div>
          {/* Diamond separator */}
          <div className="w-1 h-1 rotate-45 bg-primary/20 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function StatsMarquee() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: EASE_GALLERY }}
      className="group relative py-5 md:py-6 overflow-hidden select-none"
    >
      {/* Gold rules */}
      <div
        className="absolute top-0 left-[5%] right-[5%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 15%, transparent) 50%, transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-[5%] right-[5%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 15%, transparent) 50%, transparent)",
        }}
      />

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Scrolling track */}
      <div className="flex w-max animate-[marquee-scroll_45s_linear_infinite] group-hover:[animation-play-state:paused]">
        <MarqueeTrack id="a" />
        <MarqueeTrack id="b" />
      </div>
    </motion.section>
  );
}
