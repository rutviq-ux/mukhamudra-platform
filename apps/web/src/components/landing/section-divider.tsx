"use client";

import { motion } from "framer-motion";

interface SectionDividerProps {
  /** "rule" = gold gradient line, "space" = breathing room, "dot" = centered dot */
  variant?: "rule" | "space" | "dot";
  className?: string;
}

export function SectionDivider({
  variant = "rule",
  className = "",
}: SectionDividerProps) {
  if (variant === "space") {
    return <div className={`h-8 md:h-12 ${className}`} />;
  }

  if (variant === "dot") {
    return (
      <div className={`flex justify-center py-10 ${className}`}>
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-1.5 h-1.5 rounded-full bg-primary/50"
        />
      </div>
    );
  }

  return (
    <div className={`flex justify-center py-6 md:py-10 ${className}`}>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-20 md:w-28 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
          opacity: 0.3,
        }}
      />
    </div>
  );
}
