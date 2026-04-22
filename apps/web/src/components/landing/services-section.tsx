"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";
import { Sparkles, Wind } from "lucide-react";
import type { MouseEvent } from "react";

interface ServiceCardProps {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  href: string;
  icon: React.ReactNode;
  accentColor: "gold" | "indigo";
  imageSrc: string;
  imageAlt: string;
  className?: string;
}

export function ServiceCard({
  title,
  subtitle,
  description,
  features,
  href,
  icon,
  accentColor,
  imageSrc,
  imageAlt,
  className = "",
}: ServiceCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    mouseX.set(x);
    mouseY.set(y);

    const rotateXValue = ((y - centerY) / centerY) * -3;
    const rotateYValue = ((x - centerX) / centerX) * 3;

    rotateX.set(rotateXValue);
    rotateY.set(rotateYValue);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const gradientColor =
    accentColor === "gold"
      ? "color-mix(in srgb, var(--color-primary) 20%, transparent)"
      : "color-mix(in srgb, var(--color-accent) 20%, transparent)";

  const background = useMotionTemplate`
    radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 80%)
  `;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`void-card relative p-8 md:p-10 group overflow-hidden ${className}`}
    >
      {/* Hover gradient effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background }}
      />

      <div className="relative z-10">
        <div className="relative mb-7 overflow-hidden rounded-[4px] border border-border bg-muted">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={720}
            height={540}
            className="h-48 w-full object-cover"
            priority={false}
          />
        </div>

        {/* Icon and title */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-14 h-14 rounded-[4px] bg-[var(--color-elevated)] border border-border flex items-center justify-center text-2xl ${
              accentColor === "gold" ? "text-primary" : "text-accent"
            }`}
          >
            {icon}
          </div>
          <div>
            <h3
              className="text-2xl md:text-3xl font-light mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
            <p className="text-muted-foreground/80 text-sm font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground/90 mb-6 leading-relaxed text-[0.95rem]">
          {description}
        </p>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex items-start gap-3 text-sm text-foreground/80"
            >
              <span
                className={`${
                  accentColor === "gold" ? "text-primary" : "text-accent"
                } mt-0.5 text-base`}
              >
                *
              </span>
              {feature}
            </motion.li>
          ))}
        </ul>

        {/* CTA */}
        <Link href={href}>
          <Button
            variant="gold"
            className="w-full py-6 text-base"
          >
            Explore {title}
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

export function ServicesSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/1.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-6">
            Two ways to practice
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How we work with you
          </h2>
        </motion.div>

        {/* Staggered layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:-translate-y-6 relative"
          >
            <ServiceCard
              title="Face Yoga"
              subtitle="Live group sessions 3x/week"
              description="7 techniques in one practice: Face Yoga, Gua Sha, Roller, Trataka, Osteopathy, Cupping, and Acupressure. Evening batches at 9 PM or 10 PM IST."
              features={[
                "30-min live sessions, Mon/Wed/Fri evenings",
                "7 techniques for sculpting, toning & relaxation",
                "Choose 9 PM or 10 PM batch",
                "From ₹3,000/year. Cancel anytime.",
              ]}
              href="/face-yoga"
              icon={<Sparkles className="w-7 h-7" />}
              accentColor="gold"
              imageSrc="/visual-library/editorial/rutviq_3234944317575961213_2023-11-13.jpeg"
              imageAlt="Portrait highlighting neck and collarbone posture"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:translate-y-6 relative"
          >
            <ServiceCard
              title="Pranayama"
              subtitle="Live breathwork 3x/week"
              description="An 8-stage progressive curriculum from Ajna to Sahasrara. Morning batches at 8 AM or 9 AM IST. Combining ancient techniques with modern science."
              features={[
                "30-min live sessions, Mon/Wed/Fri mornings",
                "8-stage progressive curriculum",
                "Choose 8 AM or 9 AM batch",
                "From ₹3,000/year. Cancel anytime.",
              ]}
              href="/pranayama"
              icon={<Wind className="w-7 h-7" />}
              accentColor="indigo"
              imageSrc="/visual-library/editorial/rutviq_3802728451409965951_2026-01-04.jpeg"
              imageAlt="Editorial portrait with calm posture and breath focus"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
