"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { submitLead } from "@/actions/leads";

const DELAY_MS = 15_000;
const SCROLL_THRESHOLD = 0.35;
const STORAGE_KEY = "mm_lead_popup_dismissed";

const EASE = [0.22, 1, 0.36, 1] as const;

const T = {
  assemblyIn: 0.1,
  flapOpen: 0.4,
  contentReveal: 0.7,
  contentOut: 0,
  flapClose: 0.2,
  assemblyOut: 0.5,
};

// ── Decorative sub-components ──

function GoldStar({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 10,
        height: 10,
        background: "#C4883A",
        clipPath: "polygon(50% 0%, 60% 35%, 100% 50%, 60% 65%, 50% 100%, 40% 65%, 0% 50%, 40% 35%)",
        opacity: 0.3,
      }}
    />
  );
}

function GoldRule({ width = "100%", opacity = 0.4, className = "" }: { width?: string; opacity?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        height: 1,
        width,
        margin: "0 auto",
        background: "linear-gradient(90deg, transparent, #C4883A, transparent)",
        opacity,
      }}
    />
  );
}

function Flourish() {
  return (
    <div
      className="flex items-center justify-center gap-2 my-2"
      style={{ color: "#C4883A", opacity: 0.35, fontSize: "0.45rem" }}
      aria-hidden="true"
    >
      <span>&bull;</span>
      <span style={{ fontSize: "0.55rem" }}>&loz;</span>
      <span>&bull;</span>
    </div>
  );
}

export function LeadPopup() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    let fired = false;
    const show = () => {
      if (fired) return;
      fired = true;
      setOpen(true);
    };

    const timer = setTimeout(show, DELAY_MS);

    const onScroll = () => {
      const scrollRatio =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollRatio >= SCROLL_THRESHOLD) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const phone = (fd.get("phone") as string).trim();

    // Client-side validation
    if (!name) {
      setError("Please enter your name");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit number");
      return;
    }

    startTransition(async () => {
      const result = await submitLead({
        name,
        phone: `+91${digits}`,
        source: "popup",
      });

      if (!result.success) {
        setError(result.error || "Something went wrong");
        return;
      }

      setSubmitted(true);
      localStorage.setItem(STORAGE_KEY, "1");

      setTimeout(() => setOpen(false), 3200);
    });
  };

  // ── Input styles (underline-only writing lines) ──

  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(196,136,58,0.25)",
    borderRadius: 0,
    color: "#1A1208",
    padding: "0.75rem 0.25rem",
    outline: "none",
    transition: "border-color 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s cubic-bezier(0.22,1,0.36,1)",
  };

  const inputFocusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderBottomColor = "rgba(196,136,58,0.6)";
      e.currentTarget.style.boxShadow = "0 1px 8px rgba(196,136,58,0.15)";
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderBottomColor = "rgba(196,136,58,0.25)";
      e.currentTarget.style.boxShadow = "none";
    },
  };

  // ── Shared form content ──

  const formContent = (
    <AnimatePresence mode="wait">
      {!submitted ? (
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Label with sparkle stars */}
          <p
            className="flex items-center justify-center gap-2 text-center mb-1"
            style={{
              color: "#9E7028",
              fontSize: "0.7rem",
              fontVariant: "small-caps",
              letterSpacing: "0.18em",
            }}
          >
            <GoldStar />
            <span>Free trial session</span>
            <GoldStar />
          </p>

          <Flourish />

          {/* Heading */}
          <h2
            className="text-center leading-snug mb-6"
            style={{
              fontFamily: "var(--font-display)",
              color: "#1A1208",
              fontSize: "clamp(1.5rem, 4.5vw, 1.85rem)",
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            Start Your Face Yoga
            <br />
            Ritual Today
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              name="name"
              type="text"
              required
              placeholder="Your name"
              className="w-full text-sm"
              style={inputStyle}
              {...inputFocusHandlers}
            />

            <div className="flex gap-3 items-end">
              <div
                className="flex items-center gap-1.5 shrink-0 pb-[0.75rem] text-sm"
                style={{
                  color: "#5C5347",
                  borderBottom: "1px solid rgba(196,136,58,0.25)",
                }}
              >
                <span className="text-base leading-none">🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                placeholder="10-digit WhatsApp number"
                className="w-full text-sm"
                style={inputStyle}
                {...inputFocusHandlers}
              />
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: "#C8302C" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full py-3.5 rounded-full text-[0.75rem] uppercase tracking-[0.15em] font-medium transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, rgba(196,136,58,0.12) 0%, rgba(176,122,46,0.08) 100%)",
                border: "1px solid rgba(196,136,58,0.3)",
                color: "#1A1208",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(196,136,58,0.22) 0%, rgba(176,122,46,0.15) 100%)";
                e.currentTarget.style.borderColor = "rgba(196,136,58,0.5)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(196,136,58,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(196,136,58,0.12) 0%, rgba(176,122,46,0.08) 100%)";
                e.currentTarget.style.borderColor = "rgba(196,136,58,0.3)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {isPending ? "Registering..." : "Register Now for Free \u2192"}
            </button>
          </form>

          {/* Social proof */}
          <div className="mt-5">
            <GoldRule width="60%" opacity={0.2} className="mb-3" />
            <p
              className="text-center tracking-wide"
              style={{
                color: "#5C5347",
                opacity: 0.5,
                fontSize: "0.65rem",
                fontVariant: "small-caps",
                letterSpacing: "0.15em",
              }}
            >
              500+ members practicing daily
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center py-4"
        >
          <GoldRule width="40%" opacity={0.3} className="mb-5" />

          <h2
            className="tracking-[0.03em] mb-2"
            style={{
              fontFamily: "var(--font-display)",
              color: "#9E7028",
              fontSize: "1.35rem",
              fontWeight: 400,
            }}
          >
            You&apos;re in!
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "#5C5347" }}>
            We&apos;ll send you the trial session on WhatsApp
          </p>

          {/* Wax seal */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4, type: "spring", stiffness: 200, damping: 15 }}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, #C8302C 0%, #8B1A17 100%)",
              boxShadow: "0 2px 8px rgba(139,26,23,0.5), inset 0 1px 2px rgba(255,255,255,0.2)",
            }}
          >
            <span
              className="text-lg text-white/90"
              style={{ fontFamily: "var(--font-devanagari)" }}
            >
              मु
            </span>
          </motion.div>

          {/* Devanagari brand text */}
          <p
            className="mt-4 text-sm tracking-widest"
            style={{
              fontFamily: "var(--font-devanagari)",
              color: "#5C5347",
              opacity: 0.3,
            }}
          >
            मुख मुद्रा
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Close button (naked X) ──

  const closeButton = (
    <button
      onClick={dismiss}
      className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-300"
      style={{ color: "rgba(92,83,71,0.5)", background: "transparent", border: "none" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(92,83,71,0.8)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(92,83,71,0.5)"; }}
      aria-label="Close"
    >
      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M1 1l12 12M13 1L1 13" />
      </svg>
    </button>
  );

  // ── Letter card (invitation-grade) ──

  const letterCard = (
    <div
      className="relative z-10"
      style={{
        background: "linear-gradient(135deg, #F0E8D8 0%, #E8DEC8 50%, #DDD2BD 100%)",
        border: "1px solid rgba(196,136,58,0.2)",
        borderRadius: "4px",
        boxShadow: "0 4px 20px rgba(26,18,8,0.2), 0 0 20px rgba(196,136,58,0.05)",
      }}
    >
      {closeButton}

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[4px]"
        style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Inner frame — gold double border */}
      <div
        className="absolute pointer-events-none rounded-[3px]"
        style={{
          inset: "10px",
          border: "1px solid rgba(196,136,58,0.12)",
        }}
      >
        {/* Corner ornaments */}
        <GoldStar className="absolute -top-[5px] -left-[5px]" />
        <GoldStar className="absolute -top-[5px] -right-[5px]" />
        <GoldStar className="absolute -bottom-[5px] -left-[5px]" />
        <GoldStar className="absolute -bottom-[5px] -right-[5px]" />
      </div>

      {/* Gold rule at top of letter */}
      <GoldRule className="mx-8 mt-6 mb-1" />

      {/* Letter content */}
      <motion.div
        className="px-6 sm:px-8 pt-3 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { delay: T.contentOut, duration: 0.2 } }}
        transition={{ delay: T.contentReveal, duration: 0.4 }}
      >
        {formContent}
      </motion.div>
    </div>
  );

  // ── Reduced motion ──

  if (reducedMotion) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={dismiss}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-[300px] sm:w-[360px]">
                {letterCard}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // ── Full envelope animation ──

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={dismiss}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          />

          {/* Centering wrapper */}
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none"
          >
            <div style={{ perspective: "1000px" }} className="pointer-events-auto">

              {/* Envelope assembly */}
              <motion.div
                className="relative w-[300px] sm:w-[360px]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { delay: T.assemblyOut, duration: 0.3 } }}
                transition={{ delay: T.assemblyIn, duration: 0.5, ease: EASE }}
              >

                {/* ── LETTER ── */}
                {letterCard}

                {/* ── ENVELOPE POCKET (behind letter) ── */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-[5]"
                  style={{
                    height: "100px",
                    background: "linear-gradient(170deg, #C4883A 0%, #B07A2E 40%, #9E7028 100%)",
                    border: "1px solid rgba(196,136,58,0.4)",
                    borderTop: "none",
                    borderRadius: "0 0 4px 4px",
                    boxShadow: "inset 0 4px 20px rgba(26,18,8,0.3)",
                    transform: "translateY(40px)",
                  }}
                >
                  {/* V-fold liner */}
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: "polygon(0 0, 50% 60%, 100% 0, 100% 100%, 0 100%)",
                      background: "rgba(240,232,216,0.08)",
                    }}
                  />
                </div>

                {/* ── FLAP (behind everything) ── */}
                <motion.div
                  className="absolute left-0 right-0 z-[1]"
                  style={{
                    bottom: "0px",
                    height: "70px",
                    transformOrigin: "bottom center",
                    transformStyle: "preserve-3d",
                    clipPath: "polygon(0% 100%, 50% 0%, 100% 100%)",
                    transform: "translateY(40px)",
                  }}
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: -170 }}
                  exit={{ rotateX: 0, transition: { delay: T.flapClose, duration: 0.35, ease: EASE } }}
                  transition={{ delay: T.flapOpen, duration: 0.6, ease: EASE }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(180deg, #B07A2E 0%, #C4883A 100%)",
                      backfaceVisibility: "hidden",
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(0deg, #8B6320 0%, #9E7028 100%)",
                      backfaceVisibility: "hidden",
                      transform: "rotateX(180deg)",
                    }}
                  />
                </motion.div>

              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
