"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

interface PhotoInterstitialProps {
  src: string;
  alt: string;
  quote?: string;
  attribution?: string;
  height?: string;
  overlay?: "dark" | "gradient" | "none";
  /** Remove bottom clipping so the image bleeds into the next section */
  bleedBottom?: boolean;
}

/**
 * Full-bleed photographic break between content sections.
 * Creates visual rhythm and emotional contrast on long-scroll pages.
 * Uses transparent Rutviq images with parallax + quote overlay.
 */
export function PhotoInterstitial({
  src,
  alt,
  quote,
  attribution,
  height = "60vh",
  overlay = "gradient",
  bleedBottom = false,
}: PhotoInterstitialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.4, 0.6, 0.8], [0, 1, 1, 0]);

  return (
    <div
      ref={ref}
      className={`relative w-full flex items-center justify-center ${
        bleedBottom ? "overflow-x-clip overflow-y-visible" : "overflow-hidden"
      }`}
      style={{ minHeight: height }}
    >
      {/* Parallax image */}
      <motion.div
        className={`absolute inset-0 flex items-start justify-center ${
          bleedBottom ? "-top-[10%]" : ""
        }`}
        style={{ y: imageY, bottom: bleedBottom ? "-50%" : 0 }}
      >
        <Image
          src={src}
          alt={alt}
          width={800}
          height={1000}
          className={`w-auto max-w-none object-contain ${
            bleedBottom
              ? "h-[160%] opacity-50 image-dissolve-portrait"
              : "h-full opacity-40 image-dissolve-atmospheric"
          }`}
          style={bleedBottom ? undefined : { minHeight: "120%" }}
        />
      </motion.div>

      {/* Overlay — warm fade for editorial feel */}
      {overlay === "dark" && (
        <div className="absolute inset-0 bg-background/70" />
      )}
      {overlay === "gradient" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/20 to-background" />
          <div className="absolute inset-0 bg-background/30" />
        </>
      )}

      {/* Quote text */}
      {quote && (
        <motion.div
          style={{ opacity: textOpacity }}
          className="relative z-10 max-w-3xl mx-auto px-8 text-center"
        >
          <p
            className="text-2xl sm:text-3xl md:text-4xl font-light leading-[1.3] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {quote}
          </p>
          {attribution && (
            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {attribution}
            </p>
          )}
        </motion.div>
      )}

      {/* Grain */}
      <div className="absolute inset-0 grain-overlay pointer-events-none" />
    </div>
  );
}

/**
 * A more dramatic variant — the image fills one side, text on the other.
 * Used for transitional moments between major content blocks.
 */
export function SplitInterstitial({
  src,
  alt,
  title,
  body,
  flip = false,
}: {
  src: string;
  alt: string;
  title: string;
  body: string;
  flip?: boolean;
}) {
  return (
    <section className="relative py-16 px-6 overflow-hidden">
      <div
        className={`max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center ${
          flip ? "lg:[direction:rtl]" : ""
        }`}
      >
        {/* Image side */}
        <motion.div
          initial={{ opacity: 0, x: flip ? 30 : -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative flex justify-center lg:[direction:ltr]"
        >
          <Image
            src={src}
            alt={alt}
            width={480}
            height={600}
            className="max-h-[500px] w-auto object-contain drop-shadow-[0_0_60px_color-mix(in_srgb,var(--color-primary)_6%,transparent)] image-dissolve-portrait"
          />
        </motion.div>

        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="space-y-6 lg:[direction:ltr]"
        >
          <h2
            className="text-3xl sm:text-4xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
            {body}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
