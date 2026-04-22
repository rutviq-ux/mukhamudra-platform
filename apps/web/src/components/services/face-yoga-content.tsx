"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { Button } from "@ru/ui";

const EASE = [0.22, 1, 0.36, 1] as const;

const TECHNIQUES = [
  {
    name: "Face Yoga",
    description:
      "Targeted isometric exercises that tone and lift all 57 facial muscles, your natural alternative to fillers.",
  },
  {
    name: "Gua Sha",
    description:
      "Ancient jade-tool sculpting that drains lymph, defines bone structure, and releases deep fascial tension.",
  },
  {
    name: "Roller Therapy",
    description:
      "Cooling crystal rollers that boost circulation, de-puff, and push serums deeper into the skin.",
  },
  {
    name: "Trataka",
    description:
      "Yogic eye-gazing that strengthens the muscles around the eyes, reduces dark circles, and sharpens focus.",
  },
  {
    name: "Osteopathy",
    description:
      "Gentle cranial manipulation that realigns facial bones, corrects asymmetries, and releases jaw tension.",
  },
  {
    name: "Cupping",
    description:
      "Facial suction therapy that stimulates collagen, lifts sagging skin, and accelerates cellular renewal.",
  },
  {
    name: "Acupressure",
    description:
      "Precise pressure-point activation along facial meridians that unblocks energy flow and relieves tension.",
  },
];

const SESSION_STEPS = [
  { time: "0–5 min", label: "Warm-Up", detail: "Gentle neck rolls, jaw release, and facial activation to prepare the muscles" },
  { time: "5–15 min", label: "Core Techniques", detail: "Guided isometric exercises targeting jawline, cheeks, forehead, and eye area" },
  { time: "15–22 min", label: "Tool Work", detail: "Gua Sha, roller, or cupping, rotating each session for full-spectrum results" },
  { time: "22–28 min", label: "Acupressure & Trataka", detail: "Energy-point activation and eye exercises to complete the practice" },
  { time: "28–30 min", label: "Cool-Down", detail: "Lymphatic drainage sweep and facial Savasana to seal in the work" },
];

const TESTIMONIALS = [
  {
    quote: "The group energy is amazing. Practicing face yoga with others keeps me consistent in a way solo videos never did. My jawline is visibly sharper after 3 months.",
    name: "Arjun K.",
    role: "Face Yoga annual member",
  },
  {
    quote: "I was skeptical about face yoga until I joined a live session. Having Rutviq correct my form in real-time made all the difference. My nasolabial folds are noticeably softer.",
    name: "Deepa R.",
    role: "Face Yoga member, 5 months",
  },
  {
    quote: "The gua sha and roller techniques are a game-changer. My under-eye puffiness has almost disappeared, and I look forward to the tool work every session.",
    name: "Priya M.",
    role: "Face Yoga member, 3 months",
  },
  {
    quote: "I've tried face yoga apps and YouTube. Nothing compares to having someone watch your form live. The consistency of 3x/week made it a habit within the first two weeks.",
    name: "Sneha T.",
    role: "Face Yoga annual member",
  },
];

const FAQS = [
  // Getting Started & Expectations
  {
    q: "How long does it take to see actual results?",
    a: "Mukha Mudra is a dedicated routine (like a gym for your face) rather than a quick fix. Commit to consistent practice for at least 2 to 3 months to truly remodel your facial architecture. Short stints of a few weeks are often not enough to produce highly visible, permanent results.",
  },
  {
    q: "What changes will I notice first?",
    a: "Most people first notice a shift in their facial structure: a lifting effect, reduced puffiness, and more defined contours as deep tension is released. Because this is an inside-out approach, the exact timeline and results vary based on your genetics and habits.",
  },
  // Factors Influencing Progress
  {
    q: "Why do some people see results faster than others?",
    a: "Age and lifestyle are major factors. Younger individuals often have faster cellular turnover, while older practitioners may take more time to see profound changes. However, the biggest factor is your emotional landscape.",
  },
  {
    q: "How do my emotions affect my face?",
    a: "Your face reflects your internal state. Chronic stress spikes cortisol, which is clinically proven to break down Type I collagen. Constant anxiety can lead to hardened expressions that physically tighten the face, making emotional mastery through Pranayama essential for faster results.",
  },
  // Daily Practice & Maintenance
  {
    q: "How much time do I need to commit daily?",
    a: "We recommend a 10-minute daily workout. Even in this short time, you move stagnant energy (Prana), boost circulation, and keep your facial architecture toned. At the very least, try to dedicate time for one focused session per week.",
  },
  {
    q: "How should I approach the practice in the long run?",
    a: "Focus on consistency and variety. Just like a spiritual practice (Sadhana), daily repetition helps your fascia retain structural memory. You should also surprise your facial network by incorporating different movements rather than repeating the same stretch forever.",
  },
  {
    q: "What happens if I stop practicing?",
    a: "Your face will gradually return to its previous baseline position as daily stress and gravity take over. While your skin won't suddenly sag worse than before, the active lift and radiant glow will fade. This is why we view Mukha Mudra as a continuous lifestyle ritual.",
  },
  // Safety & Myths
  {
    q: "Will excessive pulling stretch my skin or cause it to sag?",
    a: "No. It is a myth that manipulating the face causes sagging. Mukha Mudra uses rhythmic, controlled stimulation that is clinically proven to activate fibroblasts, which actually boosts natural elastin and collagen production.",
  },
  {
    q: "Can Face Yoga stretch the skin permanently?",
    a: "Absolutely not. The skin is incredibly resilient. Targeted mechanical stimulation makes the skin firmer and healthier over time. In reality, it is a lack of movement and muscle mobility that causes tissues to weaken and lead to sagging or stretch marks.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b border-border last:border-b-0 cursor-pointer group"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between py-5 px-1">
        <h3 className="text-base font-medium group-hover:text-accent transition-colors duration-500 pr-8">
          {q}
        </h3>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-muted-foreground text-lg flex-shrink-0"
        >
          +
        </motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground pb-5 px-1 leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaceYogaContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section id="hero" className="relative pt-6 pb-16 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
          >
            <div>
              <div className="tag-pill uppercase tracking-[0.25em] mb-5">
                Evening Practice
              </div>
              <h1
                className="text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sculpt Your Face
                <br />
                <span className="heading-gold">Naturally.</span>
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-lg mb-6">
                Live group sessions 3× per week: Mon, Wed, Fri evenings.
                7 modalities in every session: Face Yoga, Gua Sha, Roller,
                Trataka, Osteopathy, Cupping &amp; Acupressure. Led live by
                Rutviq in small groups with real-time form correction.
              </p>
              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span className="px-3 py-1.5 border border-border rounded-full">Mon / Wed / Fri</span>
                <span className="px-3 py-1.5 border border-border rounded-full">9 PM or 10 PM IST</span>
                <span className="px-3 py-1.5 border border-border rounded-full">30 min</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-6 text-sm">
                <div className="void-card px-4 py-2.5">
                  <span className="text-accent font-medium">2,000+</span>
                  <span className="text-muted-foreground ml-1.5">sessions</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-accent font-medium">100K+</span>
                  <span className="text-muted-foreground ml-1.5">community</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-accent font-medium">500+</span>
                  <span className="text-muted-foreground ml-1.5">practicing daily</span>
                </div>
              </div>
              <Button
                variant="gold"
                className="px-8 py-5 text-base mt-6"
                onClick={() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" })}
              >
                See plans &amp; join &rarr;
              </Button>
            </div>
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
              <Image
                src="/face-yoga/face_yoga_cover.jpg"
                alt="Face Yoga practice"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 7 Techniques ── */}
      <section id="techniques" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-center mb-14"
          >
            <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
              The modalities
            </div>
            <h2
              className="text-3xl md:text-4xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              7 Techniques in Every Session
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Each 30-minute class rotates through multiple modalities, so you get a complete
              facial workout, not just one exercise repeated.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECHNIQUES.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                className="void-card p-6 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[0.65rem] font-mono text-accent/40 tracking-widest">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="text-sm uppercase tracking-[0.1em] font-medium"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What a Session Looks Like ── */}
      <section id="session" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/5.jpeg" alt="" aria-hidden="true" loading="lazy" />
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-center mb-14"
          >
            <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
              The session
            </div>
            <h2
              className="text-3xl md:text-4xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What 30 Minutes Looks Like
            </h2>
          </motion.div>

          <div className="space-y-0">
            {SESSION_STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                className="group flex gap-5 md:gap-8"
              >
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full border-2 border-accent bg-background flex-shrink-0 mt-1.5 group-first:border-accent group-last:border-primary" />
                  {i < SESSION_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-accent/30 to-primary/10" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-8">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs font-mono text-accent tracking-wider">{step.time}</span>
                    <h3
                      className="text-sm md:text-base font-medium uppercase tracking-[0.08em]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {step.label}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instructor ── */}
      <section id="instructor" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/1.jpeg" alt="" aria-hidden="true" loading="lazy" />
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 items-center"
          >
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden mx-auto md:mx-0 border-2 border-accent/20">
              <Image
                src="/face-yoga/face_yoga_instruct.png"
                alt="Rutviq, Face Yoga Instructor"
                fill
                className="object-cover"
                sizes="224px"
              />
            </div>
            <div>
              <div className="tag-pill uppercase tracking-[0.25em] mb-4">
                Your teacher
              </div>
              <h2
                className="text-2xl md:text-3xl font-light mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Led live by Rutviq
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-xl">
                2,000+ live sessions taught. 100K+ Instagram community. Rutviq doesn&apos;t just
                demonstrate. He watches your form through the camera, corrects your technique
                in real time, and adapts the session to who&apos;s in the room. Every class feels personal.
              </p>
              <div className="flex flex-wrap gap-4 mt-6 text-sm">
                <div className="void-card px-4 py-2.5">
                  <span className="text-accent font-medium">2,000+</span>
                  <span className="text-muted-foreground ml-1.5">sessions</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-accent font-medium">100K+</span>
                  <span className="text-muted-foreground ml-1.5">community</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-accent font-medium">3×/week</span>
                  <span className="text-muted-foreground ml-1.5">live</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/2.jpeg" alt="" aria-hidden="true" loading="lazy" />
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-center mb-12"
          >
            <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
              Members
            </div>
            <h2
              className="text-3xl md:text-4xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What members say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}
                className="parchment-card p-8 space-y-5"
              >
                <span
                  className="text-5xl font-light text-[var(--color-mm-gold)]/20 leading-none select-none block"
                  style={{ fontFamily: "var(--font-display)" }}
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                <p
                  className="text-base text-foreground leading-relaxed -mt-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t.quote}
                </p>
                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                    {t.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/4.jpeg" alt="" aria-hidden="true" loading="lazy" />
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-center mb-12"
          >
            <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
              FAQ
            </div>
            <h2
              className="text-3xl md:text-4xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Common questions
            </h2>
          </motion.div>

          <div className="void-card px-6 md:px-8">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Live Sessions ── */}
      <section className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/5.jpeg" alt="" aria-hidden="true" loading="lazy" />
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <div className="void-card p-8 md:p-10">
              <h2
                className="text-2xl md:text-3xl font-light text-center mb-8"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Why Choose Face Yoga with Us?
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                <p>
                  We combine traditional yoga wisdom with mindful facial practices to release deep
                  tension and restore natural balance to the face.
                </p>
                <p>
                  Our live sessions integrate Face Yoga, Gua Sha, and Cupping to awaken facial
                  tissues and encourage healthy circulation.
                </p>
                <p>
                  With consistent practice, you cultivate stronger facial tone and a radiant
                  Slow Beauty glow.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Transition to checkout ── */}
      <div className="gold-rule my-0" />
    </>
  );
}
