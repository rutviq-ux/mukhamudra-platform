"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col justify-end">
      {/* ── Video background ── */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/hero_videos/poster.png"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="/hero_videos/mm_vid_hero_landscape.mp4"
          type="video/mp4"
        />
      </video>

      {/* ── Dark overlay for text legibility ── */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ── Warm gold radial glow behind content ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 45% at 50% 48%, rgba(196,136,58,0.12) 0%, rgba(196,136,58,0.04) 40%, transparent 70%)",
        }}
      />

      {/* ── Warm vignette around edges ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(10,8,4,0.6) 100%)",
        }}
      />

      {/* ── Grain overlay ── */}
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[2]" />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-28 sm:pb-32 mt-auto flex flex-col items-start text-left">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: EASE_GALLERY }}
          className="text-4xl sm:text-5xl lg:text-6xl tracking-[0.04em] leading-[1.15] drop-shadow-[0_2px_32px_rgba(196,136,58,0.2)]"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-heading-gold)",
          }}
        >
          Beauty is a blessing
        </motion.h1>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: EASE_GALLERY }}
          className="mt-8"
        >
          <Link
            href="/trial"
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full border border-white/20 backdrop-blur-sm bg-white/5 text-[0.8rem] uppercase tracking-[0.2em] text-white/90 transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            Start Your Trial Session
            <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </motion.div>
      </div>

      {/* ── Scroll chevron ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0, delay: 1.6 }}
        className="absolute bottom-8 right-8 sm:right-12 z-10"
      >
        <motion.svg
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          width="16"
          height="10"
          viewBox="0 0 16 10"
          fill="none"
          className="text-white/40"
        >
          <path
            d="M1 1L8 8L15 1"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </motion.svg>
      </motion.div>

    </section>
  );
}