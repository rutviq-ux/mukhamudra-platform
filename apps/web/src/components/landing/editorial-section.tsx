"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";

const editorialHighlights = [
  {
    src: "/rutviq/transparent/rutviq_3465622324343052221_2024-09-26.png",
    title: "Neck & gaze",
    note: "The neck holds more tension than you realize. We start every session by releasing it.",
    result: "Better posture and sharper focus within days.",
  },
  {
    src: "/rutviq/transparent/rutviq_3234944317575961213_2023-11-13.png",
    title: "Breath depth",
    note: "Most people breathe at 30% capacity. We teach you to use the full range.",
    result: "Deeper exhales, calmer nervous system.",
  },
  {
    src: "/rutviq/transparent/rutviq_3431649970712297200_2024-08-10.png",
    title: "Jaw & facial tone",
    note: "Clenching, grinding, tension lines. The jaw stores years of stress. We work on releasing it.",
    result: "Visible jawline definition and less facial tension.",
  },
];

const editorialGallery = [
  {
    src: "/rutviq/transparent/rutviq_3431649970947248364_2024-08-10.png",
    alt: "Avant-garde editorial portrait with face jewelry",
    className: "col-span-2 h-80",
  },
  {
    src: "/rutviq/transparent/rutviq_3293821517309716405_2024-02-02.png",
    alt: "Crow pose demonstrating body mastery",
    className: "h-56",
  },
  {
    src: "/rutviq/transparent/rutviq_3218862424426478350_2023-10-22.png",
    alt: "Dynamic stretch showing flexibility",
    className: "h-56",
  },
  {
    src: "/rutviq/transparent/rutviq_3431649971031226582_2024-08-10.png",
    alt: "Blue-lit editorial portrait with chain jewelry",
    className: "col-span-2 h-64",
  },
];

const editorialOutcomes = [
  "Reduce facial tension",
  "Deepen your breath",
  "Sculpt your jawline",
];

export function EditorialSection() {
  return (
    <section className="aura-bg relative py-32 px-6 overflow-hidden section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/4.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center lg:text-left"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto lg:mx-0 mb-6">
            The method
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What we teach, and why it works.
          </h2>
          <p className="text-muted-foreground max-w-full lg:max-w-2xl mt-4">
            Everything above the neck is connected. Jaw tension affects breathing.
            Neck posture affects focus. Our method works on all of it together
            &mdash; not as separate exercises, but as one integrated practice.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link href="/pranayama">
              <Button variant="gold" className="px-8 py-5 text-base">
                Start with Pranayama
              </Button>
            </Link>
            <Link href="/pricing">
              <Button className="btn-ghost px-8 py-5 text-base">
                See All Plans
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {editorialOutcomes.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.46fr_0.54fr] gap-10 items-start">
          <div className="space-y-6">
            {editorialHighlights.map((item) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="void-card p-6"
              >
                <div className="flex items-center gap-3 mb-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {item.title}
                </div>
                <div className="relative overflow-hidden rounded-[4px] border border-border bg-muted mb-4">
                  <Image
                    src={item.src}
                    alt={item.title}
                    width={520}
                    height={640}
                    className="h-44 w-full object-cover"
                  />
                  <div className="image-edge-fog-card" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {item.note}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {item.result}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {editorialGallery.map((item, index) => (
              <motion.div
                key={item.src}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-[4px] border border-border bg-card ${item.className}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={720}
                  height={960}
                  className="h-full w-full object-cover"
                />
                <div className="image-edge-fog-card" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
