"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";

const EASE = [0.22, 1, 0.36, 1] as const;

const HERO_SLIDES = [
  { src: "/about/carousel/1.jpg", alt: "Rutviq in handstand pose", position: "center 80%" },
  { src: "/about/carousel/2.jpg", alt: "Rutviq arms raised, looking up", position: "center 35%" },
  { src: "/about/carousel/3.jpg", alt: "Rutviq one-arm handstand", position: "center 60%" },
  { src: "/about/carousel/4.jpg", alt: "Rutviq head tilted back close-up", position: "center 70%" },
  { src: "/about/carousel/5.jpg", alt: "Rutviq with fellow practitioners", position: "center 25%" },
  { src: "/about/carousel/6.jpg", alt: "Rutviq close portrait", position: "center 20%" },
  { src: "/about/carousel/7.jpg", alt: "Rutviq seated meditation", position: "center 15%" },
  { src: "/about/carousel/8.jpg", alt: "Rutviq face close-up", position: "center center" },
  { src: "/about/carousel/9.jpg", alt: "Rutviq guiding a student", position: "center 25%" },
  { src: "/about/carousel/10.jpg", alt: "Rutviq arm stretch pose", position: "center 40%" },
];

const SLIDE_INTERVAL = 4000;

export function AboutContent() {
  const [current, setCurrent] = useState(0);
  const [storyExpanded, setStoryExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const goTo = useCallback((index: number) => setCurrent(index), []);

  return (
    <main className="min-h-screen">
      {/* ── Hero Carousel ── */}
      <section className="relative h-[70vh] flex items-end justify-center overflow-hidden">
        {/* Cycling background images */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: EASE }}
            className="absolute inset-0"
          >
            <Image
              src={HERO_SLIDES[current]!.src}
              alt={HERO_SLIDES[current]!.alt}
              fill
              className="object-cover"
              style={{ objectPosition: HERO_SLIDES[current]!.position }}
              sizes="100vw"
              priority={current === 0}
            />
          </motion.div>
        </AnimatePresence>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, var(--color-background) 0%, transparent 60%)",
          }}
        />
        <div className="absolute inset-0 grain-overlay pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE }}
          className="relative z-10 text-center pb-12 px-6"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            The teacher
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Meet Rutviq
          </h1>

          {/* Slide indicators */}
          <div className="flex gap-1.5 justify-center mt-6">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1 rounded-full transition-all duration-500 cursor-pointer ${
                  i === current
                    ? "w-6 bg-primary/70"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Story ── */}
      <section className="relative py-24 md:py-32 px-6 section-warm">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-stretch">
            {/* Video */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
              className="relative flex-shrink-0"
            >
              <video
                src="/about/about.MP4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full md:w-[280px] max-h-[70vh] md:max-h-none md:h-full rounded-[4px] object-cover opacity-90 mx-auto"
              />
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
              className="space-y-6"
            >
              <h2
                className="text-2xl sm:text-3xl font-light"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Meet the Founder: Rutviq
              </h2>
              <div className="relative">
                <div className="space-y-5 text-muted-foreground leading-relaxed text-[0.95rem]">
                  <p>
                    My name is Rutviq, and I have been a devoted Yoga Teacher for
                    over 10 years. My journey began in a small town called
                    Davangere, my birth place. Coming from a humble farming
                    family &mdash; my father a farmer, my mother a farmer&apos;s
                    wife &mdash; I learned early on to love the rivers, villages,
                    and hills. I spent years traveling across Karnataka and Kerala,
                    learning ancient forms of yoga, meditation, and Kalaripayattu
                    directly from Swamis and gurus.
                  </p>
                  <p>
                    However, my internal landscape was often a battlefield. Growing
                    up as trans-non-binary, I was bullied simply for practicing and
                    embodying the unity of the masculine and feminine. In a world
                    where mental health struggles weren&apos;t viewed as
                    &ldquo;valid problems,&rdquo; I fought deeply with depression,
                    fear, and suicidal thoughts. Waking up every morning and
                    putting on my school uniform felt like preparing for war.
                  </p>
                  <p>
                    But I found my sanctuary in a spiritual school, and my
                    victories on my yoga mat. Through creating shapes with my arms
                    and legs, and finding courage in respiration, I discovered
                    grace in strength and resilience in silence. Yoga taught me to
                    surrender to hope when all I knew was the abyss of doubt. It
                    taught me that to yoke the mind, body, and breath is the
                    ultimate path to freedom.
                  </p>

                  {/* ── Expandable section ── */}
                  <AnimatePresence initial={false}>
                    {storyExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="overflow-hidden space-y-5"
                      >
                        <h3
                          className="text-lg sm:text-xl font-light text-foreground pt-2"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          The Birth of Mukha Mudra: Where Internal Peace Becomes
                          External Beauty
                        </h3>
                        <p>
                          As my practice deepened into the ancient texts, particularly
                          Patanjali&apos;s Yoga Sutras, I experienced a profound
                          realization. I learned that our internal emotional landscape is
                          directly mirrored in our physical features. The Sutras teach{" "}
                          <em>Ahimsa</em> (non-violence); I realized that holding onto
                          the violent expressions of fear, trauma, and anxiety physically
                          hardens and ages the face. Conversely, practicing{" "}
                          <em>Santosha</em> (inner contentment) naturally lifts the
                          cheeks and the corners of the mouth.
                        </p>
                        <p className="text-foreground font-medium">
                          I understood then that internal beauty is exactly what is
                          received as external beauty.
                        </p>
                        <p>
                          This epiphany became the mission and soul of Mukha Mudra. I
                          realized that true facial rejuvenation isn&apos;t just about
                          skincare; it is about clearing the deep, stagnant emotional
                          blockages we hold inside. By uniting physical movement with
                          breathwork, we don&apos;t just lift the face &mdash; we calm
                          the nervous system, release the heavy baggage of the mind, and
                          awaken our inner <em>Shakti</em> (vital energy).
                        </p>
                        <p>
                          Through Mukha Mudra, I offer this transformative practice to
                          people of all levels. We come to our mats expecting nothing,
                          and in turn, experience everything. If sharing my story and
                          this practice helps even one person make peace with themselves
                          and discover their radiant, authentic glow from the inside out,
                          then I have fulfilled my purpose.
                        </p>
                        <p className="text-foreground italic">
                          I hope this space fills you with courage, love, and light.
                        </p>
                        <p className="text-foreground font-medium">
                          Thank you,
                          <br />
                          Rutviq
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Read more with fade behind it */}
                <div className={`relative ${!storyExpanded ? "mt-0" : "mt-4"}`}>
                  {!storyExpanded && (
                    <div className="absolute bottom-full left-0 right-0 h-20 bg-gradient-to-t from-[var(--section-warm-bg,var(--color-background))] to-transparent pointer-events-none" />
                  )}
                  <button
                    onClick={() => setStoryExpanded(!storyExpanded)}
                    className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    {storyExpanded ? "Read less" : "Read more"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* ── Beauty as a blessing ── */}
      <section className="relative py-20 md:py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="void-card p-8 md:p-12 border-primary/20 text-center space-y-6"
          >
            <h3
              className="text-xl sm:text-2xl font-light"
              style={{ fontFamily: "var(--font-display)" }}
            >
              When beauty becomes a blessing
            </h3>
            <div className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-[0.95rem] space-y-4">
              <p>
                Beauty can become such a curse. It can make us do things
                we&apos;d never do in love, and somehow end up doing in the
                name of external validation &mdash; giving in to false
                perceptions that can be so momentary, so temporary.
              </p>
              <p>
                But beauty can also become a blessing. When we discern that
                our healthiest version is our most beautiful self, beauty
                stops becoming a burden, and becomes a beautiful blessing
                instead.
              </p>
              <p className="text-foreground font-medium">
                We at Mukha Mudra have created a course that is a compilation
                of methods, mudras, pranayama, and meditation techniques that
                shall not only improve your facial but your overall wellbeing
                &mdash; and through this practice, let&apos;s all celebrate
                the blessing that beauty can be.
              </p>
            </div>
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="mt-2">
                Begin your practice
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      {/* ── CTA ── */}
      <section className="relative py-20 md:py-24 px-6 section-warm">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="space-y-4"
          >
            <h2
              className="text-3xl sm:text-4xl font-light tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to practice?
            </h2>
            <p className="text-muted-foreground">
              Join our live sessions: face yoga, pranayama, or both.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/face-yoga">
              <Button variant="outline" className="rounded-[4px] px-6 py-4">
                Face Yoga
              </Button>
            </Link>
            <Link href="/pranayama">
              <Button variant="outline" className="rounded-[4px] px-6 py-4">
                Pranayama
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="gold" className="rounded-[4px] px-6 py-4">
                See all plans
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
