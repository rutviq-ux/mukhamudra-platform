"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { Button } from "@ru/ui";

const EASE = [0.22, 1, 0.36, 1] as const;

const STAGES = [
  {
    name: "Kapalbhati",
    subtitle: "Skull-Shining Breath",
    description:
      "Rapid abdominal exhalations that cleanse the sinuses, ignite metabolism, and sharpen mental clarity.",
  },
  {
    name: "Anulom Vilom",
    subtitle: "Alternate Nostril",
    description:
      "Left-right channel balancing that calms the nervous system, harmonises brain hemispheres, and lowers blood pressure.",
  },
  {
    name: "Bhastrika",
    subtitle: "Bellows Breath",
    description:
      "Vigorous inhale-exhale cycles that oxygenate every cell, raise core temperature, and build lung capacity.",
  },
  {
    name: "Ujjayi",
    subtitle: "Ocean Breath",
    description:
      "Slow, constricted-throat breathing that activates the vagus nerve, deepens focus, and induces meditative calm.",
  },
  {
    name: "Bhramari",
    subtitle: "Humming Bee",
    description:
      "Vibration-based exhalation that soothes the mind, reduces anxiety, and resonates through the cranial cavity.",
  },
  {
    name: "Surya Bhedana",
    subtitle: "Right-Nostril Activation",
    description:
      "Solar-channel breathing that raises energy, improves digestion, and builds internal heat for the morning.",
  },
  {
    name: "Chandra Bhedana",
    subtitle: "Left-Nostril Cooling",
    description:
      "Lunar-channel breathing that cools the body, calms pitta, and prepares the nervous system for stillness.",
  },
  {
    name: "Kumbhaka",
    subtitle: "Breath Retention",
    description:
      "Progressive holds (antara & bahya) that expand lung capacity, build CO\u2082 tolerance, and unlock deep meditative states.",
  },
];

const SESSION_STEPS = [
  { time: "0\u20135 min", label: "Grounding", detail: "Seated posture alignment, spinal awareness, and 3 rounds of natural breath observation" },
  { time: "5\u201312 min", label: "Purification", detail: "Kapalbhati and Bhastrika cycles, clearing the channels and raising energy" },
  { time: "12\u201320 min", label: "Balancing", detail: "Anulom Vilom and Surya/Chandra Bhedana, harmonising the left and right nadis" },
  { time: "20\u201326 min", label: "Deepening", detail: "Ujjayi, Bhramari, and progressive Kumbhaka, entering the meditative threshold" },
  { time: "26\u201330 min", label: "Integration", detail: "Silent breath observation and Sankalpa (intention setting) to carry the practice into your day" },
];

const TESTIMONIALS = [
  {
    quote: "Morning pranayama changed everything for me. The progressive curriculum means I'm always learning something new, not just repeating the same exercises. My anxiety has dropped dramatically.",
    name: "Vikram S.",
    role: "Pranayama annual member",
  },
  {
    quote: "I'd tried breathing apps before, but having Rutviq guide the tempo and correct my technique live is incomparable. The Kumbhaka progression alone was worth joining.",
    name: "Meera J.",
    role: "Pranayama member, 4 months",
  },
  {
    quote: "I started for stress relief but the sleep improvement surprised me most. Within a month of morning sessions, I was falling asleep faster and waking up without an alarm.",
    name: "Rahul D.",
    role: "Pranayama member, 6 months",
  },
  {
    quote: "The 8-stage curriculum gives you a real sense of progression. Each month feels like leveling up. I went from struggling with basic Kapalbhati to comfortable Kumbhaka holds in under 5 months.",
    name: "Ananya P.",
    role: "Pranayama annual member",
  },
];

const FAQS = [
  // Timeline & Early Changes
  {
    q: "How long does it take to see actual results?",
    a: "Rewiring your nervous system requires dedication. Clinical studies show it takes about 12 weeks of regular practice to see significant changes in stress levels and heart health. We recommend a consistent routine for 2 to 3 months to fully experience the internal shift.",
  },
  {
    q: "What changes will I notice first?",
    a: "Most people first experience a profound sense of mental calmness and a zen state. Physically, you may notice better sleep, improved digestion, and normalized breathing patterns. Results vary based on your unique lifestyle and energetic blockages.",
  },
  // The Science of Stress & Speed
  {
    q: "Why do some people see results faster than others?",
    a: "While diet and sleep play a role, your emotional baseline is the biggest factor. Chronic stress creates cortisol, which is clinically proven to break down the collagen in your skin. By mastering your breath, you lower cortisol and stop this degradation, accelerating your physical results.",
  },
  // Daily Practice & Long-Term Strategy
  {
    q: "How much time do I need to commit daily?",
    a: "Our live sessions are 30 minutes, providing a complete and balanced routine. However, even a 10-minute daily practice before bed can significantly calm your nervous system and prepare your body for cellular repair.",
  },
  {
    q: "How should I approach the practice in the long run?",
    a: "To maintain results, you must progress systematically through stages. We focus on one chakra per month, starting at the Ajna (Command Center) to safely manage internal energies. Consistent daily practice is the only way to convert subtle energy into physical radiance.",
  },
  {
    q: "What happens if I stop practicing?",
    a: "Your nervous system will gradually lose its rest-and-digest dominance. Without the daily practice, stress will spike your cortisol again, resuming the breakdown of collagen and stress-induced aging. Continuous practice is key to maintaining your Slow Beauty Glow.",
  },
  // Safety & Techniques
  {
    q: "Are energy locks (Bandhas) and breath retention dangerous?",
    a: "No. When guided correctly, these techniques are deeply healing. Bandhas act as an internal pump that massages your organs and stimulates the nervous system. Rather than straining your body, this process helps remove stagnant blood and heals internal organs.",
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
        <h3 className="text-base font-medium group-hover:text-primary transition-colors duration-500 pr-8">
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

export function PranayamaContent() {
  return (
    <>
      {/* -- Hero -- */}
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
                Morning Practice
              </div>
              <h1
                className="text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Master Your
                <br />
                <span className="text-primary">Breath.</span>
              </h1>
              <div className="text-muted-foreground leading-relaxed max-w-lg mb-6 space-y-4">
                <p>
                  Live group breathwork 3&times; per week &mdash; Mon, Wed, Fri mornings.
                </p>
                <p>
                  Did you know one of the most effective ways to stimulate lymphatic
                  drainage is through your breath? These sessions draw from
                  Patanjali&apos;s sutras, Vigyan Bhairava, and Kundalini Tantra
                  pranayama, designed to deepen awareness week by week.
                </p>
                <p>
                  Small live groups, led by Rutviq, with real-time posture and
                  rhythm correction.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span className="px-3 py-1.5 border border-border rounded-full">Mon / Wed / Fri</span>
                <span className="px-3 py-1.5 border border-border rounded-full">8 AM or 9 AM IST</span>
                <span className="px-3 py-1.5 border border-border rounded-full">30 min</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-6 text-sm">
                <div className="void-card px-4 py-2.5">
                  <span className="text-primary font-medium">2,000+</span>
                  <span className="text-muted-foreground ml-1.5">sessions</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-primary font-medium">100K+</span>
                  <span className="text-muted-foreground ml-1.5">community</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-primary font-medium">500+</span>
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
                src="/pranayama/pranayama_page_cover.png"
                alt="Pranayama breathwork practice"
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

      {/* -- 8-Stage Curriculum -- */}
      <section id="curriculum" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/1.jpeg" alt="" aria-hidden="true" loading="lazy" />
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
              The curriculum
            </div>
            <h2
              className="text-3xl md:text-4xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              8 Stages of Breathwork
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              A progressive system: each technique builds on the last. You&apos;ll develop from
              foundational cleansing breaths to advanced retention and meditative states.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STAGES.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
                className="void-card p-6 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[0.65rem] font-mono text-primary/40 tracking-widest">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3
                      className="text-sm uppercase tracking-[0.1em] font-medium"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {s.name}
                    </h3>
                    <p className="text-[0.65rem] text-muted-foreground/60 tracking-wider">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- What a Session Looks Like -- */}
      <section id="session" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
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
                  <div className="w-3 h-3 rounded-full border-2 border-primary bg-background flex-shrink-0 mt-1.5 group-first:border-primary group-last:border-accent" />
                  {i < SESSION_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-primary/30 to-accent/10" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-8">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs font-mono text-primary tracking-wider">{step.time}</span>
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

      {/* -- Instructor -- */}
      <section id="instructor" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/4.jpeg" alt="" aria-hidden="true" loading="lazy" />
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
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden mx-auto md:mx-0 border-2 border-primary/20">
              <Image
                src="/rutviq/transparent/rutviq_3465622324343052221_2024-09-26.png"
                alt="Rutviq, Pranayama Instructor"
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
                2,000+ live sessions taught. 100K+ Instagram community. In pranayama, rhythm and
                posture are everything. Rutviq watches your form through the camera, matches the
                tempo to the group&apos;s capacity, and progressively deepens the practice over weeks.
                No two sessions are identical.
              </p>
              <div className="flex flex-wrap gap-4 mt-6 text-sm">
                <div className="void-card px-4 py-2.5">
                  <span className="text-primary font-medium">2,000+</span>
                  <span className="text-muted-foreground ml-1.5">sessions</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-primary font-medium">100K+</span>
                  <span className="text-muted-foreground ml-1.5">community</span>
                </div>
                <div className="void-card px-4 py-2.5">
                  <span className="text-primary font-medium">8 stages</span>
                  <span className="text-muted-foreground ml-1.5">curriculum</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* -- Testimonials -- */}
      <section id="testimonials" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/5.jpeg" alt="" aria-hidden="true" loading="lazy" />
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

      {/* -- FAQ -- */}
      <section id="faq" className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/2.jpeg" alt="" aria-hidden="true" loading="lazy" />
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

      {/* -- Why Live Sessions -- */}
      <section className="aura-bg relative py-20 md:py-28 px-6 section-warm">
        <div className="aura-bg__img">
          <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
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
                Why Choose Pranayama with Us?
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                <p>
                  Our pranayama practice draws from traditional Tantric breathwork to help calm
                  the mind and reconnect you with your breath.
                </p>
                <p>
                  Through guided breathing and classical bandha techniques, we help you build
                  awareness of your body&apos;s internal rhythms.
                </p>
                <p>
                  The result is a practice that supports clarity, vitality, and a deeper sense
                  of inner balance.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* -- Transition to checkout -- */}
      <div className="gold-rule my-0" />
    </>
  );
}
