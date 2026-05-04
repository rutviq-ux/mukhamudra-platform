"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Face Yoga", href: "/face-yoga" },
  { label: "Pranayama", href: "/pranayama" },
  { label: "Blog", href: "/blog" },
];

/** Routes where the public nav should not render */
const HIDDEN_PREFIXES = ["/app", "/admin", "/auth", "/coach", "/onboarding"];

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

export function Nav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (hidden) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop & Mobile Top Bar ── */}
      <motion.nav
        ref={navRef}
        role="navigation"
        initial={false}
        animate={{
          paddingTop: scrolled ? 12 : 24,
          paddingBottom: scrolled ? 12 : 24,
        }}
        transition={{ duration: 0.6, ease: EASE_GALLERY }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10"
      >
        {/* Background layer — separate for blur + opacity animation */}
        <motion.div
          className="absolute inset-0 border-b border-border bg-surface backdrop-blur-xl"
          initial={false}
          animate={{ opacity: scrolled ? 0.95 : 0 }}
          transition={{ duration: 0.8, ease: EASE_GALLERY }}
        />

        <div className="relative flex items-center justify-between max-w-7xl mx-auto">
          {/* Wordmark */}
                              <Link href="/" className="relative z-50 group flex items-center gap-3">
            <Image
              src="/mukha_mudra_logos/mm_logo_t.png"
              alt="Mukha Mudra"
              width={32}
              height={32}
              className="transition-transform duration-500 group-hover:scale-105"
            />
            <span
              className="text-[0.8rem] md:text-[0.9rem] uppercase tracking-[0.35em] transition-opacity duration-500 group-hover:opacity-80"
              style={{
                fontFamily: "var(--font-wordmark)",
                color: "var(--color-heading-gold)",
              }}
            >
              Mukha Mudra
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-4">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative group py-1"
                >
                  <span
                    className={`text-[0.8rem] uppercase tracking-[0.18em] transition-colors duration-500 ${
                      active
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                  {/* Active indicator — thin gold underline */}
                  <motion.span
                    className="absolute -bottom-0.5 left-0 right-0 h-px bg-primary origin-left"
                    initial={false}
                    animate={{
                      scaleX: active ? 1 : 0,
                      opacity: active ? 1 : 0,
                    }}
                    transition={{ duration: 0.4, ease: EASE_GALLERY }}
                  />
                  {/* Hover underline for non-active */}
                  {!active && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-muted-foreground/30 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                  )}
                </Link>
              );
            })}

            {/* Separator dot */}
            <span className="w-[2px] h-[2px] rounded-full bg-border hidden" />

            {isSignedIn ? (
              <>
                <Link
                  href="/app"
                  className="text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2 rounded-full border border-border backdrop-blur-sm bg-foreground/5 text-foreground hover:border-foreground/30 hover:bg-foreground/10 transition-all duration-500 font-medium"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ redirectUrl: "/" })}
                  className="text-[0.75rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors duration-500"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="text-[0.75rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors duration-500"
                >
                  Sign In
                </Link>
                <Link
                  href="/pricing"
                  className="text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2 rounded-full border border-border backdrop-blur-sm bg-foreground/5 text-foreground hover:border-foreground/30 hover:bg-foreground/10 transition-all duration-500 font-medium"
                >
                  Join
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle — two-line editorial hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative z-50 w-8 h-8 flex flex-col items-center justify-center gap-[7px]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <motion.span
              animate={
                mobileOpen
                  ? { rotate: 45, y: 4, width: 18 }
                  : { rotate: 0, y: 0, width: 22 }
              }
              transition={{ duration: 0.4, ease: EASE_GALLERY }}
              className="block h-px bg-foreground origin-center"
              style={{ width: 22 }}
            />
            <motion.span
              animate={
                mobileOpen
                  ? { rotate: -45, y: -4, width: 18 }
                  : { rotate: 0, y: 0, width: 14 }
              }
              transition={{ duration: 0.4, ease: EASE_GALLERY }}
              className="block h-px bg-foreground origin-center"
              style={{ width: 14 }}
            />
          </button>
        </div>

        {/* Gold rule — reveals on scroll */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, var(--color-mm-gold) 50%, transparent 95%)",
          }}
          initial={false}
          animate={{ opacity: scrolled ? 0.25 : 0 }}
          transition={{ duration: 1, ease: EASE_GALLERY }}
        />
      </motion.nav>

      {/* ── Mobile Fullscreen Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_GALLERY }}
            className="fixed inset-0 z-40 bg-background"
          >
            {/* Grain texture layer */}
            <div className="absolute inset-0 grain-overlay pointer-events-none" />

            <div className="relative flex flex-col items-center justify-center h-full px-8">
              {/* Logo mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.15, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: EASE_GALLERY }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <Image
                  src="/mukha_mudra_logos/mm_logo_t.png"
                  alt=""
                  width={320}
                  height={320}
                  className="opacity-40"
                  aria-hidden="true"
                />
              </motion.div>

              {/* Nav items with gold rules between */}
              <div className="relative flex flex-col items-center">
                {navItems.map((item, index) => (
                  <div key={item.href} className="flex flex-col items-center">
                    {index > 0 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        transition={{
                          delay: index * 0.06,
                          duration: 0.6,
                          ease: EASE_GALLERY,
                        }}
                        className="w-12 h-px my-6"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
                          opacity: 0.4,
                        }}
                      />
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{
                        delay: 0.1 + index * 0.08,
                        duration: 0.6,
                        ease: EASE_GALLERY,
                      }}
                    >
                      <Link
                        href={item.href}
                        className={`text-[2rem] font-light uppercase tracking-[0.2em] transition-colors duration-500 ${
                          isActive(item.href)
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  </div>
                ))}

                {/* Devanagari accent */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="mt-12 text-sm text-muted-foreground tracking-widest"
                  style={{ fontFamily: "var(--font-devanagari)" }}
                >
                  मुख मुद्रा
                </motion.span>

                {/* CTA + Sign in */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mt-8 flex flex-col items-center gap-5"
                >
                  {isSignedIn ? (
                    <>
                      <Link
                        href="/app"
                        className="text-sm uppercase tracking-[0.15em] px-8 py-3 rounded-full border border-border backdrop-blur-sm bg-foreground/5 text-foreground hover:border-foreground/30 hover:bg-foreground/10 transition-all duration-500 font-medium"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => signOut({ redirectUrl: "/" })}
                        className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors duration-500"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/pricing"
                        className="text-sm uppercase tracking-[0.15em] px-8 py-3 rounded-full border border-border backdrop-blur-sm bg-foreground/5 text-foreground hover:border-foreground/30 hover:bg-foreground/10 transition-all duration-500 font-medium"
                      >
                        Join
                      </Link>
                      <Link
                        href="/auth/sign-in"
                        className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors duration-500"
                      >
                        Member Sign In
                      </Link>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
