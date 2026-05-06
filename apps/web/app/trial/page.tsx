"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { submitLead } from "@/actions/leads";

const EASE = [0.22, 1, 0.36, 1] as const;

// Client-side validation matching the server schema
function validateField(
  name: string,
  value: string,
): string {
  switch (name) {
    case "name":
      if (!value.trim()) return "Name is required";
      if (value.trim().length > 100) return "Name is too long";
      return "";
    case "email":
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Please enter a valid email";
      return "";
    case "phone": {
      const cleaned = value.replace(/[\s\-()]/g, "");
      if (!cleaned) return "WhatsApp number is required";
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length < 6)
        return "Please enter a valid phone number";
      return "";
    }
    default:
      return "";
  }
}

function formatPhoneForApi(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${countryCode}${digits}`;
}

export default function TrialPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [apiError, setApiError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [countryCode, setCountryCode] = useState("+91");

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError("");

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const email = (fd.get("email") as string).trim();
    const phone = (fd.get("phone") as string).trim();

    // Validate all fields
    const errors = {
      name: validateField("name", name),
      email: validateField("email", email),
      phone: validateField("phone", phone),
    };
    setFieldErrors(errors);
    setTouched({ name: true, email: true, phone: true });

    if (Object.values(errors).some((e) => e)) return;

    startTransition(async () => {
      const result = await submitLead({
        name,
        email: email || undefined,
        phone: formatPhoneForApi(phone, countryCode),
        source: "trial",
      });

      if (!result.success) {
        setApiError(result.error || "Something went wrong");
        return;
      }

      setUnlocked(true);

      // Auto-play after a brief moment
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 600);
    });
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-lg bg-white/10 border text-sm text-white placeholder:text-white/40 outline-none transition-colors duration-300 ${
      touched[field] && fieldErrors[field]
        ? "border-red-400/60 focus:border-red-400"
        : "border-white/15 focus:border-white/30"
    }`;

  return (
    <main className="bg-background">
      <section className="relative">
        <div className="relative w-full max-w-5xl mx-auto mt-24 sm:mt-28 px-4 sm:px-8">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40">
            {/* Video — always rendered but hidden behind gate */}
            <video
              ref={videoRef}
              controls={unlocked}
              playsInline
              preload="auto"
              poster="/hero_videos/poster.png"
              onEnded={() => setHasEnded(true)}
              className="w-full h-full object-cover"
            >
              <source
                src="/hero_videos/trial_session.mp4"
                type="video/mp4"
              />
            </video>

            {/* ── Lead capture gate ── */}
            <AnimatePresence>
              {!unlocked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-6"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
                    className="w-full max-w-sm"
                  >
                    {/* Play icon hint */}
                    <div className="flex justify-center mb-6">
                      <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5 text-white/60 ml-0.5"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    <p
                      className="text-center text-lg sm:text-xl tracking-[0.04em] mb-1"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--color-heading-gold)",
                      }}
                    >
                      Watch a free trial session
                    </p>
                    <p className="text-center text-xs text-white/50 mb-6">
                      Enter your details to unlock the video
                    </p>

                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-1"
                      noValidate
                    >
                      {/* Name field */}
                      <div>
                        <input
                          name="name"
                          type="text"
                          placeholder="Your name"
                          autoComplete="name"
                          className={inputClass("name")}
                          onBlur={handleBlur}
                        />
                        {touched.name && fieldErrors.name && (
                          <p className="text-[11px] text-red-400/90 mt-1 ml-1">
                            {fieldErrors.name}
                          </p>
                        )}
                      </div>

                      {/* Email field */}
                      <div className="mt-2">
                        <input
                          name="email"
                          type="email"
                          placeholder="Email address (optional)"
                          autoComplete="email"
                          className={inputClass("email")}
                          onBlur={handleBlur}
                        />
                        {touched.email && fieldErrors.email && (
                          <p className="text-[11px] text-red-400/90 mt-1 ml-1">
                            {fieldErrors.email}
                          </p>
                        )}
                      </div>

                      {/* Phone field with country code */}
                      <div className="mt-2">
                        <div className="flex gap-0">
                          <div className="flex items-center shrink-0 rounded-l-lg bg-white/10 border border-r-0 border-white/15">
                            <select
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="px-3 py-3 bg-transparent text-sm text-white/70 outline-none cursor-pointer"
                            >
                              <option value="+91">🇮🇳 +91</option>
                              <option value="+1">🇺🇸 +1</option>
                              <option value="+44">🇬🇧 +44</option>
                              <option value="+61">🇦🇺 +61</option>
                              <option value="+49">🇩🇪 +49</option>
                              <option value="+971">🇦🇪 +971</option>
                              <option value="+65">🇸🇬 +65</option>
                              <option value="+60">🇲🇾 +60</option>
                              <option value="+64">🇳🇿 +64</option>
                              <option value="+353">🇮🇪 +353</option>
                              <option value="+41">🇨🇭 +41</option>
                              <option value="+33">🇫🇷 +33</option>
                              <option value="+966">🇸🇦 +966</option>
                              <option value="+974">🇶🇦 +974</option>
                              <option value="+27">🇿🇦 +27</option>
                              <option value="+55">🇧🇷 +55</option>
                              <option value="+52">🇲🇽 +52</option>
                              <option value="+48">🇵🇱 +48</option>
                            </select>
                          </div>
                          <input
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="WhatsApp number"
                            autoComplete="tel-national"
                            className={`flex-1 px-4 py-3 rounded-r-lg bg-white/10 border text-sm text-white placeholder:text-white/40 outline-none transition-colors duration-300 ${
                              touched.phone && fieldErrors.phone
                                ? "border-red-400/60 focus:border-red-400"
                                : "border-white/15 focus:border-white/30"
                            }`}
                            onBlur={handleBlur}
                          />
                        </div>
                        {touched.phone && fieldErrors.phone && (
                          <p className="text-[11px] text-red-400/90 mt-1 ml-1">
                            {fieldErrors.phone}
                          </p>
                        )}
                      </div>

                      {apiError && (
                        <p className="text-xs text-red-400 text-center mt-2">
                          {apiError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isPending}
                        className="mt-3 w-full py-3 rounded-full border border-white/20 backdrop-blur-sm bg-white/5 text-white/90 text-[0.8rem] uppercase tracking-[0.15em] font-medium transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg
                              className="w-4 h-4 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                            Unlocking...
                          </span>
                        ) : (
                          "Watch Now"
                        )}
                      </button>

                      <p className="text-[10px] text-white/30 text-center mt-3">
                        We&apos;ll send session details on WhatsApp.
                        No spam, ever.
                      </p>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Ended overlay ── */}
            {hasEnded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black/50 backdrop-blur-sm"
              >
                <p
                  className="text-2xl sm:text-3xl tracking-[0.04em]"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-heading-gold)",
                  }}
                >
                  Ready to begin?
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full border border-white/20 backdrop-blur-sm bg-white/5 text-[0.8rem] uppercase tracking-[0.2em] text-white/90 transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  Join Mukha Mudra
                  <span>&rarr;</span>
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* Context below video */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
          className="w-full max-w-5xl mx-auto px-4 sm:px-8 mt-8 sm:mt-10 pb-16"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p
                className="text-xl sm:text-2xl tracking-[0.04em]"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-heading-gold)",
                }}
              >
                Experience a session
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                This is what a live Mukha Mudra class feels like. 30 minutes of
                guided face yoga and breathwork, 3 times a week, through your
                screen.
              </p>
            </div>

            <Link
              href="/pricing"
              className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full border border-border bg-transparent text-[0.8rem] uppercase tracking-[0.2em] text-foreground/80 transition-all duration-500 hover:border-foreground/30 hover:text-foreground shrink-0"
            >
              See plans
              <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
