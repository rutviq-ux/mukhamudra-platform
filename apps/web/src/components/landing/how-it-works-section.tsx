"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Video, Users, Sunrise, Moon, Film } from "lucide-react";

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

const cards = [
  {
    icon: Video,
    title: "Live sessions",
    detail: "3× per week via Google Meet, not pre-recorded videos",
    image: "/visual-library/editorial/rutviq_3590254535082153166_2025-03-17.jpeg",
    objectPosition: "center 40%",
    span: "md:col-span-7",
    tall: true,
  },
  {
    icon: Users,
    title: "Personal guidance",
    detail: "Small groups so I can correct your form in real time",
    image: "/visual-library/editorial/rutviq_3463350378971032885_2024-09-23.jpeg",
    objectPosition: "center 30%",
    span: "md:col-span-5",
    tall: true,
  },
  {
    icon: Sunrise,
    title: "Morning: Pranayama",
    detail: "Mon / Wed / Fri · 8 or 9 AM IST",
    image: "/visual-library/editorial/rutviq_3590254535090597207_2025-03-17.jpeg",
    objectPosition: "center 35%",
    span: "md:col-span-4",
    tall: false,
  },
  {
    icon: Moon,
    title: "Evening: Face Yoga",
    detail: "Mon / Wed / Fri · 9 or 10 PM IST",
    image: "/visual-library/editorial/rutviq_3474905198911758612_2024-10-09.jpeg",
    objectPosition: "center 30%",
    span: "md:col-span-4",
    tall: false,
  },
  {
    icon: Film,
    title: "Catch-up recordings",
    detail: "Missed a session? Watch the replay anytime",
    image: "/visual-library/editorial/rutviq_3590254534939403075_2025-03-17.jpeg",
    objectPosition: "center 25%",
    span: "md:col-span-4",
    tall: false,
  },
];

export function HowItWorksSection() {
  return (
    <section className="aura-bg relative py-24 md:py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/1.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_GALLERY }}
          className="text-center mb-12"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            The practice
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How we work with you
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-5">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  delay: 0.08 * i,
                  ease: EASE_GALLERY,
                }}
                className={`group relative overflow-hidden rounded-lg ${card.span} ${
                  i >= 2 && i <= 4 ? "col-span-2 sm:col-span-1" : "col-span-2"
                } ${card.tall ? "aspect-[4/3] md:aspect-[3/2]" : "aspect-[3/2] md:aspect-[4/3]"}`}
              >
                {/* Photo */}
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ objectPosition: card.objectPosition }}
                  sizes={card.tall ? "(max-width: 768px) 100vw, 58vw" : "(max-width: 768px) 50vw, 33vw"}
                  loading="lazy"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Content pinned to bottom */}
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 flex flex-col gap-2">
                  <div className="w-9 h-9 rounded-[4px] bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <h3
                    className="text-base md:text-lg font-light text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-xs md:text-sm text-white/70 leading-relaxed">
                    {card.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
