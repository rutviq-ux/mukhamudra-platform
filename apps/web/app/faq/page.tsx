"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FAQS } from "@/lib/faqs";

const EASE = [0.22, 1, 0.36, 1] as const;

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

export default function FaqPage() {
  const categories: string[] = [];
  for (const f of FAQS) {
    if (!categories.includes(f.category)) categories.push(f.category);
  }

  return (
    <main className="bg-background min-h-screen">
      <section className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        <div className="mb-12">
          <div className="tag-pill uppercase tracking-[0.25em] mb-5">
            Resources
          </div>
          <h1
            className="text-4xl md:text-5xl leading-[1.1] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Frequently Asked
            <br />
            <span className="heading-gold">Questions</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-lg">
            Everything you need to know about the practice, results, and
            keeping it up. Still have questions?{" "}
            <a
              href="mailto:rutviq@mukhamudra.com"
              className="text-accent hover:underline"
            >
              Reach out to us
            </a>
            .
          </p>
        </div>

        <div className="space-y-12">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground/60 mb-2">
                {cat}
              </h2>
              <div>
                {FAQS.filter((f) => f.category === cat).map((f) => (
                  <FaqItem key={f.q} q={f.q} a={f.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-10 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link
            href="/face-yoga"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Explore Face Yoga
          </Link>
          <Link href="/pricing" className="text-accent hover:underline ml-auto">
            See plans &amp; join &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}
