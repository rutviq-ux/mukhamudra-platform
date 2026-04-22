"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";
import { Sparkles, Wind } from "lucide-react";

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

/* ── Carousel slides ── */
const CAROUSEL_SLIDES = [
  {
    src: "/carousel_images_t/IMG_3978.png",
    alt: "Temple acupressure: activating energy points to release jaw tension",
    caption: "Temple Acupressure",
  },
  {
    src: "/carousel_images_t/IMG_4037.png",
    alt: "Brow bone knuckling: deep pressure technique to lift the forehead",
    caption: "Brow Lifting",
  },
  {
    src: "/carousel_images_t/IMG_3996.png",
    alt: "Gua Sha sculpting: contouring the cheekbone with a jade tool",
    caption: "Gua Sha Sculpting",
  },
  {
    src: "/carousel_images_t/IMG_4026.png",
    alt: "Facial Gua Sha: smoothing the cheek with acupressure point activation",
    caption: "Cheek Contouring",
  },
  {
    src: "/carousel_images_t/IMG_4030.png",
    alt: "Temple Gua Sha: jade tool along the temporal muscle",
    caption: "Temple Release",
  },
  {
    src: "/carousel_images_t/IMG_4045.png",
    alt: "Dual Gua Sha: both tools sculpting the cheekbone area",
    caption: "Dual Sculpting",
  },
  {
    src: "/carousel_images_t/IMG_4049.png",
    alt: "Cheek activation: pinching technique to stimulate facial muscles",
    caption: "Cheek Activation",
  },
  {
    src: "/carousel_images_t/IMG_4034.png",
    alt: "Facial muscle lifting: pinch and lift technique for cheek volume",
    caption: "Muscle Lifting",
  },
];

/* ── The two disciplines ── */
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
    image: "/face-yoga/face_yoga_cover.jpg",
    imageAlt: "Face yoga technique: brow lifting exercise",
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
    image: "/pranayama/pranayama_cover.png",
    imageAlt: "Pranayama breathwork demonstration",
  },
];

/* ── Science facts ── */
const scienceFacts = [
  {
    stat: "Cortisol ↓",
    detail: "Breathwork lowers the stress hormone that destroys collagen",
  },
  {
    stat: "Collagen ↑",
    detail: "Facial exercises stimulate natural collagen production",
  },
  {
    stat: "Live > Recorded",
    detail: "Real-time correction and group accountability change everything",
  },
];

const IMAGES_PER_PAGE_DESKTOP = 2;
const IMAGES_PER_PAGE_MOBILE = 1;
const TOTAL_PAGES_DESKTOP = Math.ceil(CAROUSEL_SLIDES.length / IMAGES_PER_PAGE_DESKTOP);
const TOTAL_PAGES_MOBILE = CAROUSEL_SLIDES.length;

/* ═══════════════════════════════════════════════
   Image Carousel — horizontal multi-image strip
   ═══════════════════════════════════════════════ */

function ImageCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const totalPages = TOTAL_PAGES_DESKTOP;

  /* Track scroll position to update active page */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const scrollLeft = el.scrollLeft;
      const itemWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth
        : 1;
      /* Use perPage=2 on md+, 1 on mobile */
      const perPage = window.innerWidth >= 768 ? IMAGES_PER_PAGE_DESKTOP : IMAGES_PER_PAGE_MOBILE;
      const page = Math.round(scrollLeft / (itemWidth * perPage));
      setActivePage(page);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToPage = useCallback((page: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const itemWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    const perPage = window.innerWidth >= 768 ? IMAGES_PER_PAGE_DESKTOP : IMAGES_PER_PAGE_MOBILE;
    el.scrollTo({ left: itemWidth * perPage * page, behavior: "smooth" });
  }, []);

  /* Lightbox keyboard */
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight")
        setLightboxIndex((p) => (p + 1) % CAROUSEL_SLIDES.length);
      if (e.key === "ArrowLeft")
        setLightboxIndex((p) => (p - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen]);

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.0, delay: 0.3, ease: EASE_GALLERY }}
        className="w-full h-full relative"
      >
        {/* Scrollable image strip */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory h-full [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {CAROUSEL_SLIDES.map((slide, i) => (
            <div
              key={slide.src}
              className="flex-shrink-0 snap-start w-[70%] md:w-[38%] relative rounded-xl overflow-hidden cursor-pointer group/slide aspect-[3/4] lg:aspect-auto lg:h-full"
              onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover/slide:scale-[1.03]"
                sizes="(max-width: 768px) 70vw, 38vw"
                loading="lazy"
              />
              {/* Top gradient + caption */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
              <p className="absolute top-2 inset-x-0 text-center text-[0.6rem] uppercase tracking-[0.15em] text-white/70 pointer-events-none">
                {slide.caption}
              </p>
            </div>
          ))}
        </div>

        {/* Numbered page dots — overlaid at bottom */}
        <div className="absolute bottom-3 left-0 right-0 flex gap-2.5 justify-center z-10">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToPage(i)}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-all duration-400 cursor-pointer backdrop-blur-sm ${
                i === activePage
                  ? "bg-primary/30 text-foreground"
                  : "bg-black/30 text-white/60 hover:bg-black/50 hover:text-white/90"
              }`}
              aria-label={`Go to page ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_GALLERY }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute top-5 right-5 md:top-8 md:right-8 w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors z-10"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close lightbox"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <button
              className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => (p - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length); }}
              aria-label="Previous image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => (p + 1) % CAROUSEL_SLIDES.length); }}
              aria-label="Next image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <AnimatePresence mode="wait">
              <motion.div
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: EASE_GALLERY }}
                className="relative w-[85vw] max-w-md h-[80vh] max-h-[700px]"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={CAROUSEL_SLIDES[lightboxIndex]!.src}
                  alt={CAROUSEL_SLIDES[lightboxIndex]!.alt}
                  fill
                  className="object-contain"
                  sizes="85vw"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
              <p className="text-white/70 text-sm tracking-wide">
                {CAROUSEL_SLIDES[lightboxIndex]!.caption}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {lightboxIndex + 1} / {CAROUSEL_SLIDES.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Merged section — The Foundation
   ═══════════════════════════════════════════════ */

export function WhyFaceSection() {
  return (
    <section className="aura-bg relative py-24 md:py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_GALLERY }}
          className="text-center mb-4"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            The foundation
          </div>
          <h2
            className="heading-gold text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
          >
            What We Teach & Why It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            Your face is more than skin. It is a network of muscles, fascia,
            and subtle energy channels that respond powerfully to conscious practice.
          </p>
        </motion.div>

        {/* ── Philosophy + Carousel ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0, delay: 0.1, ease: EASE_GALLERY }}
          className="void-card p-8 md:p-12 lg:p-16 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-12 items-stretch">
            {/* Text column */}
            <div className="flex flex-col justify-center space-y-8">
              <motion.h3
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2, ease: EASE_GALLERY }}
                className="heading-gold text-2xl sm:text-3xl md:text-[2.5rem] font-light leading-[1.15] tracking-tight"
              >
                Why Work On
                <br />
                Your Face?
              </motion.h3>

              {/* Gold rule */}
              <div
                className="w-16 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-mm-gold), transparent)",
                  opacity: 0.5,
                }}
              />

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3, ease: EASE_GALLERY }}
                className="space-y-5"
              >
                <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
                  Your face is a sacred map of subtle energy channels
                  (<span className="text-foreground italic">Nadis</span>),
                  muscles, and fascia. Chronic stress and stagnant{" "}
                  <span className="text-foreground italic">Prana</span> (vital
                  force) leave visible marks on this network, depleting your
                  natural collagen and causing deep physical tension, sagging,
                  and asymmetries.
                </p>
                <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
                  Practicing{" "}
                  <span className="text-foreground font-medium">Mukha Mudra</span>
                  , the true, holistic essence of ancient Yoga, uses physical
                  manipulation and energy seals to awaken your inner{" "}
                  <span className="text-foreground italic">Shakti</span>. This
                  conscious sculpting unblocks vital flow, boosts cellular
                  oxygenation, and naturally lifts your facial architecture.
                </p>
              </motion.div>

            </div>

            {/* Carousel column */}
            <div className="h-full">
              <ImageCarousel />
            </div>
          </div>
        </motion.div>

        {/* ── Two Discipline Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {practices.map((practice, i) => {
            const Icon = practice.icon;

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
                className="void-card overflow-hidden"
              >
                {/* Portrait — dark emerald backdrop */}
                <div
                  className="relative h-52 md:h-60 overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(180deg, #081C17 0%, #0D2A22 100%)",
                  }}
                >
                  {/* Accent glow behind figure */}
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      background:
                        practice.accent === "primary"
                          ? "radial-gradient(ellipse 55% 65% at 50% 65%, var(--color-primary) 0%, transparent 60%)"
                          : "radial-gradient(ellipse 55% 65% at 50% 65%, var(--color-accent) 0%, transparent 60%)",
                    }}
                  />
                  <Image
                    src={practice.image}
                    alt={practice.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    loading="lazy"
                  />
                  {/* Subtle bottom blend into card surface */}
                  <div
                    className="absolute bottom-0 inset-x-0 h-10"
                    style={{
                      background:
                        "linear-gradient(to top, var(--color-surface), transparent)",
                    }}
                  />
                  {/* Accent bar — top edge */}
                  <div
                    className="absolute top-0 inset-x-0 h-[2px]"
                    style={{
                      background:
                        practice.accent === "primary"
                          ? "linear-gradient(90deg, transparent 10%, var(--color-primary) 50%, transparent 90%)"
                          : "linear-gradient(90deg, transparent 10%, var(--color-accent) 50%, transparent 90%)",
                      opacity: 0.5,
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-4 h-4 ${
                        practice.accent === "primary"
                          ? "text-primary/70"
                          : "text-accent/70"
                      }`}
                    />
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

        {/* ── Science Facts — single strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE_GALLERY }}
          className="void-card p-2 md:p-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {scienceFacts.map((fact, i) => (
              <div
                key={fact.stat}
                className={`text-center px-5 py-5 md:py-6 ${
                  i > 0
                    ? "border-t sm:border-t-0 sm:border-l border-primary/[0.08]"
                    : ""
                }`}
              >
                <p
                  className="text-xl md:text-2xl font-light mb-1.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {fact.stat}
                </p>
                <p className="text-[0.7rem] md:text-xs text-muted-foreground leading-relaxed">
                  {fact.detail}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Bundle CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE_GALLERY }}
          className="parchment-card p-8 md:p-10 text-center space-y-4"
        >
          <h3
            className="text-2xl md:text-3xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The complete system
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Morning breathwork + evening face yoga = the full transformation.
            Bundle both from ₹6,000/year.
          </p>
          <Link href="/pricing" className="inline-block pt-1">
            <Button variant="gold" className="px-8 py-4 text-base">
              See bundle pricing
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}