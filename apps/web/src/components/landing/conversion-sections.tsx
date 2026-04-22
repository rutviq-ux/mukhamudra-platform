"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";

const stats = [
  { label: "Instagram community", value: "100K+" },
  { label: "Live sessions taught", value: "2,000+" },
  { label: "Practice focus", value: "Above the neck" },
  { label: "Members practicing daily", value: "500+" },
];

const outcomes = [
  {
    title: "Less stress from the first session",
    copy: "Our breathwork techniques calm your nervous system in minutes. Most members feel the shift on day one.",
  },
  {
    title: "A sharper, more defined face",
    copy: "7 techniques: Face Yoga, Gua Sha, Roller, Trataka, Osteopathy, Cupping, and Acupressure. Tone your jawline and reduce puffiness within weeks.",
  },
  {
    title: "A morning ritual that actually sticks",
    copy: "Live sessions with a real teacher at a set time. No willpower needed. Just show up and breathe.",
  },
  {
    title: "Live group energy, not a lonely pre-recorded video",
    copy: "Group sessions keep you accountable. Practicing with others creates momentum that solo videos never will.",
  },
];

const offers = [
  {
    title: "Face Yoga",
    subtitle: "From ₹3,000/year",
    description: "Live group sessions with 7 techniques. Mon/Wed/Fri evenings at 9 PM or 10 PM IST.",
    href: "/face-yoga",
    cta: "Join Face Yoga",
    accent: "accent",
    features: ["3x/week live group sessions", "7 facial techniques", "WhatsApp community"],
  },
  {
    title: "Pranayama",
    subtitle: "From ₹3,000/year",
    description: "Progressive breathwork curriculum with morning sessions. Mon/Wed/Fri at 8 AM or 9 AM IST.",
    href: "/pranayama",
    cta: "Join Pranayama",
    accent: "primary",
    features: ["3x/week live sessions", "8-stage curriculum", "WhatsApp community"],
  },
  {
    title: "Bundle: Both",
    subtitle: "From ₹6,000/year",
    description: "Access all Face Yoga + Pranayama batches. Morning breathwork and evening facial toning.",
    href: "/pricing",
    cta: "See bundle plans",
    accent: "primary",
    features: ["All 4 batches included", "Save vs buying separately", "Recording add-on eligible"],
  },
];

const testimonials = [
  {
    quote:
      "I followed Rutviq on Instagram for months before signing up. After one week of pranayama, my morning anxiety was gone. Not reduced. Gone.",
    name: "Sanya M.",
    role: "Pranayama member, 6 months",
  },
  {
    quote:
      "The group energy is amazing. Practicing face yoga with others keeps me consistent in a way solo videos never did. My jawline is visibly sharper after 3 months.",
    name: "Arjun K.",
    role: "Face Yoga annual member",
  },
  {
    quote:
      "I've tried breathwork apps and YouTube videos. Nothing compares to breathing live with someone who actually corrects you in real time.",
    name: "Meera S.",
    role: "Pranayama member, 3 months",
  },
  {
    quote:
      "The bundle plan is incredible value. Morning pranayama sets my energy, evening face yoga helps me unwind. I look and feel completely different.",
    name: "Priya R.",
    role: "Bundle member, 4 months",
  },
];

const faqs = [
  {
    question: "How is this different from the free Instagram content?",
    answer:
      "Instagram gives you the what. Mukha Mudra gives you the how: live, guided, corrected in real time. You practice with us, not just watch.",
  },
  {
    question: "I'm a complete beginner. Can I join?",
    answer: "Yes. Most members start with zero experience. We structure every session so beginners feel comfortable and advanced practitioners stay challenged.",
  },
  {
    question: "What's included in the annual plan?",
    answer: "Unlimited live group sessions 3x/week, WhatsApp community access, and eligibility for the recording add-on (₹1,000/year). Annual plans are the best value at ₹3,000/year.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Cancel from your billing page and you'll retain access until the end of your current billing period. No lock-in, no questions asked.",
  },
];

export function SocialProofSection() {
  return (
    <section className="aura-bg relative py-24 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6"
        >
          <div className="space-y-3">
            <div className="tag-pill uppercase tracking-[0.25em]">
              The practice
            </div>
            <h2
              className="text-3xl sm:text-4xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Trusted by thousands. Led live by our team.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pranayama">
              <Button variant="gold" className="px-6 py-4">
                Start Pranayama
              </Button>
            </Link>
            <Link href="/face-yoga">
              <Button className="btn-ghost px-6 py-4">
                Explore Face Yoga
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <div key={stat.label} className="void-card p-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {stat.label}
              </p>
              <p
                className="text-2xl font-light"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OutcomesSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/2.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center lg:text-left"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto lg:mx-0 mb-5">
            What you get
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What changes when you practice with us.
          </h2>
          <p className="text-muted-foreground max-w-full lg:max-w-2xl mt-4">
            This isn&apos;t another wellness app or pre-recorded course.
            It&apos;s live, personal, and focused entirely above the neck.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {outcomes.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.15 }}
              className="void-card p-8"
            >
              <h3
                className="text-2xl font-light mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.copy}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OfferSection() {
  return (
    <section className="aura-bg relative py-24 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/5.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            Pricing
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pick how you want to practice.
          </h2>
          <p className="text-muted-foreground max-w-full lg:max-w-2xl mx-auto mt-4">
            Face Yoga for visible sculpting. Pranayama for inner calm.
            Or get both with the Bundle. All led live, starting this week.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {offers.map((offer) => (
            <div key={offer.title} className="void-card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {offer.subtitle}
                  </p>
                  <h3
                    className="text-3xl font-light"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {offer.title}
                  </h3>
                </div>
                <div
                  className={`w-12 h-12 rounded-[4px] ${
                    offer.accent === "primary" ? "bg-primary/20" : "bg-accent/20"
                  }`}
                />
              </div>
              <p className="text-muted-foreground">{offer.description}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {offer.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <Link href={offer.href}>
                <Button
                  variant="gold"
                  className="px-8 py-5 text-base w-full"
                >
                  {offer.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ item, index }: { item: typeof testimonials[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.12 }}
      className="parchment-card p-8 md:p-10 space-y-6 relative min-w-[85vw] md:min-w-0 snap-center"
    >
      <span
        className="text-6xl font-light text-[var(--color-mm-gold)]/20 leading-none select-none block"
        style={{ fontFamily: "var(--font-display)" }}
        aria-hidden="true"
      >
        &ldquo;
      </span>
      <p
        className="text-base md:text-lg text-foreground leading-relaxed relative -mt-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {item.quote}
      </p>
      <div className="pt-4 border-t border-border/50">
        <p className="text-sm font-medium">{item.name}</p>
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mt-1">
          {item.role}
        </p>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="aura-bg relative py-24 md:py-32 px-6 section-warm torn-edge-top">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/1.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            Members
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Hear it from people who practice with us.
          </h2>
        </motion.div>

        {/* Desktop: 2-col grid */}
        <div className="hidden md:grid md:grid-cols-2 gap-8">
          {testimonials.map((item, index) => (
            <TestimonialCard key={item.name} item={item} index={index} />
          ))}
        </div>

        {/* Mobile: horizontal scroll carousel */}
        <div className="md:hidden -mx-6 px-6 overflow-x-auto snap-x snap-mandatory flex gap-4 pb-4 scrollbar-hide">
          {testimonials.map((item, index) => (
            <TestimonialCard key={item.name} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b border-border last:border-b-0 cursor-pointer group"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between py-5 px-1">
        <h3 className="text-base font-medium group-hover:text-primary transition-colors duration-500 pr-8">
          {question}
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
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground pb-5 px-1 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/4.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-3xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            FAQ
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Questions you probably have.
          </h2>
        </motion.div>

        <div className="void-card px-6 md:px-8">
          {faqs.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="aura-bg relative py-24 md:py-32 px-6 section-warm overflow-hidden">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/2.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>

      {/* Background portrait — low opacity for gravitas */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <Image
          src="/rutviq/transparent/rutviq_3431649970787748000_2024-08-10.png"
          alt=""
          width={600}
          height={800}
          loading="lazy"
          className="h-[70%] w-auto max-w-none object-contain opacity-[0.10] image-dissolve-atmospheric"
          aria-hidden="true"
        />
      </div>
      {/* Atmospheric glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 grain-overlay pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-5"
        >
          <h2
            className="heading-gold text-4xl sm:text-5xl md:text-6xl font-light tracking-tight mb-3"
          >
            Begin.
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Face Yoga and Pranayama from ₹3,000/year each.
            Bundle both for ₹6,000/year. No contracts. Cancel anytime.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <Link href="/pricing">
            <Button variant="gold" className="px-8 py-5 text-base">
              See all plans
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-sm tracking-widest"
          style={{ fontFamily: "var(--font-devanagari)" }}
        >
          मुख मुद्रा
        </motion.p>
      </div>
    </section>
  );
}
