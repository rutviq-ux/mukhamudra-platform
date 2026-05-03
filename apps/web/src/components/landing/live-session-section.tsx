"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const EASE_GALLERY = [0.22, 1, 0.36, 1] as const;

const leftFeatures = [
  {
    number: "01",
    title: "30-Minute \u201CSlow Beauty\u201D Sessions",
    description:
      "Live, expert-led 30-minute workouts three times a week. Build the perfect morning routine to awaken your body, or a relaxing night routine to melt away daily tension.",
  },
  {
    number: "02",
    title: "All Facial Concerns Covered",
    description:
      "Target the root cause of aging. From eliminating double chins and defining the jawline to smoothing nasolabial folds and lifting sagging skin naturally without fillers.",
  },
  {
    number: "03",
    title: "Multiple Modalities In One",
    description:
      "Go beyond basic face stretches. Master Face Yoga, Facial Gua Sha, Cupping, Osteopathy, and Acupressure to completely remodel your facial architecture and drain stagnant lymph.",
  },
];

const rightFeatures = [
  {
    number: "04",
    title: "Internal Metabolic Mastery",
    description:
      "We don\u2019t just treat the skin. Rewire your nervous system, drastically lower collagen-destroying cortisol, and naturally massage your thyroid through clinical Pranayama and Bandhas.",
  },
  {
    number: "05",
    title: "8-Stage Chakra Awakening",
    description:
      "Experience true Tantric Yoga. Follow a systematic, guided progression from the Root (Mooladhara) to the Command Center (Ajna) to clear energetic blockages and awaken your inner Shakti.",
  },
  {
    number: "06",
    title: "Flexible Mastery Paths",
    description:
      "Choose your path. Drop in monthly or commit to an Annual Mastery plan to focus purely on physical architecture, internal chemistry, or bridge both for the ultimate inside-out transformation.",
  },
];

/* Mock participant tiles for the Google Meet preview */
const participants = [
  { src: "/rutviq/IMG_4045.png", name: "Rutviq", host: true, position: "center 40%" },
  { src: "/meet_images/1.png", name: "Ananya", position: "center top" },
  { src: "/meet_images/2.png", name: "Priya", position: "center top" },
  { src: "/meet_images/3.png", name: "Meera", position: "center top" },
];

function FeatureCard({
  feature,
  index,
  side,
}: {
  feature: (typeof leftFeatures)[number];
  index: number;
  side: "left" | "right";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.7,
        delay: 0.15 + index * 0.1,
        ease: EASE_GALLERY,
      }}
      className="relative group"
    >
            {/* Large decorative number watermark */}
      <div
        className={`absolute -top-8 ${
          side === "left" ? "-right-3" : "-left-3"
        } text-[7rem] xl:text-[8rem] font-extralight leading-none text-primary/[0.07] group-hover:text-primary/[0.15] transition-all duration-1000 pointer-events-none select-none`}
        style={{ fontFamily: "var(--font-display)" }}
        aria-hidden="true"
      >
        {feature.number}
      </div>

            {/* Connector line extending into grid gap toward mockup */}
      <div
        className={`absolute top-5 ${
          side === "left" ? "left-full" : "right-full"
        } hidden lg:flex items-center ${
          side === "left" ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {/* Endpoint dot with subtle glow on hover */}
        <div className="relative flex-shrink-0 z-10">
          <div className="w-[9px] h-[9px] rounded-full transition-all duration-700 border-[1.5px] border-primary/30 bg-[var(--color-surface)] group-hover:border-primary/60 group-hover:bg-primary/20" />
          <div className="absolute -inset-1.5 rounded-full bg-primary/0 group-hover:bg-primary/[0.08] transition-all duration-700 blur-sm pointer-events-none" />
        </div>
        {/* Main gradient line */}
        <div
          className="h-px flex-shrink-0 transition-all duration-700 opacity-50 group-hover:opacity-100"
          style={{
            width: "clamp(2.5rem, 6vw, 5.5rem)",
            background:
              side === "left"
                ? "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 50%, transparent), color-mix(in srgb, var(--color-primary) 8%, transparent))"
                : "linear-gradient(to left, color-mix(in srgb, var(--color-primary) 50%, transparent), color-mix(in srgb, var(--color-primary) 8%, transparent))",
          }}
        />
        {/* Terminal dot — smaller, toward mockup */}
        <div className="w-[5px] h-[5px] rounded-full flex-shrink-0 bg-primary/10 group-hover:bg-primary/25 transition-all duration-700" />
      </div>

      {/* Content */}
      <div className={`space-y-2.5 ${side === "right" ? "lg:text-left" : "lg:text-right"}`}>
        <div className={`flex items-center gap-2.5 ${side === "right" ? "" : "lg:justify-end"}`}>
          <span className="text-[0.65rem] font-mono text-primary/40 tracking-widest">
            {feature.number}
          </span>
          <span className="w-5 h-px bg-primary/20" aria-hidden="true" />
          <h3
            className="text-sm md:text-[0.95rem] font-medium uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {feature.title}
          </h3>
        </div>
        <p className="text-[0.8rem] text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

function MeetMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.0, delay: 0.1, ease: EASE_GALLERY }}
      className="relative mx-auto w-full max-w-sm lg:max-w-none"
    >
      {/* Ambient glow behind the mockup */}
      <div
        className="absolute -inset-14 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, color-mix(in srgb, var(--color-primary) 4%, transparent) 50%, transparent 85%)",
        }}
      />

      {/* Browser chrome */}
      <div className="relative rounded-xl overflow-hidden border border-border shadow-[0_16px_80px_rgba(0,0,0,0.35)]">
        {/* Title bar */}
        <div className="bg-[#1a1a1a] px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-[#2a2a2a] rounded-md px-4 py-1 text-[0.55rem] text-[#888] tracking-wide flex items-center gap-2">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-[#28c840]">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.3" />
                <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              meet.google.com
            </div>
          </div>
        </div>

        {/* Meet interface */}
        <div className="bg-[#202124] p-3 md:p-4">
          {/* Video grid — 2×2 */}
          <div className="grid grid-cols-2 gap-2 md:gap-2.5">
            {participants.map((p, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-lg aspect-[4/3] ${
                  p.host ? "ring-1 ring-primary/40" : ""
                }`}
              >
                <Image
                  src={p.src}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ objectPosition: p.position }}
                  sizes="200px"
                  aria-hidden="true"
                />
                {/* Dark overlay for video-call feel */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* Name label */}
                <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                  {p.host && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  <span className="text-[0.5rem] text-white/80 tracking-wide">
                    {p.host ? `${p.name} (Host)` : p.name}
                  </span>
                </div>
                {/* Mute icon for non-host */}
                {!p.host && (
                  <div className="absolute top-1.5 right-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white/40">
                      <path d="M1 1L23 23M9 9V12C9 13.6569 10.3431 15 12 15C12.55 15 13.07 14.87 13.53 14.62M15 10.6V6C15 4.34315 13.6569 3 12 3C10.6195 3 9.46622 3.93888 9.1 5.2M12 19V22M8 22H16M17 12V13C17 13.34 16.97 13.67 16.92 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-[#333]">
            <div className="w-8 h-8 rounded-full bg-[#3c4043] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/80">
                <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M19 10V12C19 15.866 15.866 19 12 19M5 10V12C5 15.866 8.13401 19 12 19M12 19V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#3c4043] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/80">
                <path d="M15.75 10.5L20.47 7.31C21.02 6.93 21.75 7.33 21.75 8V16C21.75 16.67 21.02 17.07 20.47 16.69L15.75 13.5M4.5 17.25H13.5C14.74 17.25 15.75 16.24 15.75 15V9C15.75 7.76 14.74 6.75 13.5 6.75H4.5C3.26 6.75 2.25 7.76 2.25 9V15C2.25 16.24 3.26 17.25 4.5 17.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#ea4335] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M16.5 3.75L20.25 7.5L16.5 11.25M7.5 20.25L3.75 16.5L7.5 12.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#3c4043] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/80">
                <path d="M15 19C15 19 15.5 15 12 15C8.5 15 9 19 9 19M8.5 9.5H8.51M15.5 9.5H15.51M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* "LIVE" indicator */}
          <div className="absolute top-14 right-5 md:right-6 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[0.5rem] font-medium text-white/90 uppercase tracking-wider">
              Live
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const FLOATING_LABELS = [
  { num: "01", text: "Slow Beauty", top: "5%", side: "left" as const, delay: 0.5 },
  { num: "02", text: "All Concerns", top: "20%", side: "right" as const, delay: 0.65 },
  { num: "03", text: "Multi-Modal", top: "37%", side: "left" as const, delay: 0.8 },
  { num: "04", text: "Metabolic Mastery", top: "54%", side: "right" as const, delay: 0.95 },
  { num: "05", text: "Chakra Awakening", top: "70%", side: "left" as const, delay: 1.1 },
  { num: "06", text: "Flexible Paths", top: "86%", side: "right" as const, delay: 1.25 },
];

function PhoneMeetMockup({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`relative ${
        compact
          ? "mx-auto w-[170px] md:w-[200px]"
          : "w-full"
      }`}
      style={{ perspective: "1000px" }}
    >
      {/* Floating labels with leading lines — mobile only */}
      {!compact &&
        FLOATING_LABELS.map((label) => (
          <motion.div
            key={label.text}
            initial={{ opacity: 0, x: label.side === "left" ? -8 : 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: label.delay, ease: EASE_GALLERY }}
            className={`absolute z-40 flex items-center whitespace-nowrap ${
              label.side === "left" ? "left-0" : "right-0"
            }`}
            style={{ top: label.top }}
          >
            {label.side === "left" ? (
              <>
                {/* Pill */}
                <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-primary/25 rounded-full px-2.5 py-1.5 shadow-lg shadow-black/15 backdrop-blur-md">
                  <span
                    className="text-[0.5rem] font-mono text-primary/40 tracking-wider"
                  >
                    {label.num}
                  </span>
                  <span className="w-3 h-px bg-primary/15" />
                  <span
                    className="text-[0.55rem] font-medium uppercase tracking-[0.1em]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {label.text}
                  </span>
                </div>
                {/* Leading line */}
                <div
                  className="h-px flex-1 min-w-3"
                  style={{
                    background:
                      "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 35%, transparent), color-mix(in srgb, var(--color-primary) 8%, transparent))",
                  }}
                />
                {/* Endpoint dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />
              </>
            ) : (
              <>
                {/* Endpoint dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />
                {/* Leading line */}
                <div
                  className="h-px flex-1 min-w-3"
                  style={{
                    background:
                      "linear-gradient(to left, color-mix(in srgb, var(--color-primary) 35%, transparent), color-mix(in srgb, var(--color-primary) 8%, transparent))",
                  }}
                />
                {/* Pill */}
                <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-primary/25 rounded-full px-2.5 py-1.5 shadow-lg shadow-black/15 backdrop-blur-md">
                  <span
                    className="text-[0.5rem] font-mono text-primary/40 tracking-wider"
                  >
                    {label.num}
                  </span>
                  <span className="w-3 h-px bg-primary/15" />
                  <span
                    className="text-[0.55rem] font-medium uppercase tracking-[0.1em]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {label.text}
                  </span>
                </div>
              </>
            )}
          </motion.div>
        ))}

      <motion.div
        initial={{ opacity: 0, y: 24, rotateY: 0, rotateX: 0 }}
        whileInView={{ opacity: 1, y: 0, rotateY: compact ? -14 : -22, rotateX: compact ? 3 : 5 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.1, ease: EASE_GALLERY }}
        className={`relative ${compact ? "" : "mx-auto w-[200px]"}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Ambient glow */}
        <div
          className={`absolute ${compact ? "-inset-6" : "-inset-10"} pointer-events-none`}
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 80%)",
          }}
        />

      {/* iPhone 15-style device frame */}
      <div
        className={`relative bg-zinc-900 shadow-[0_0_2px_2px_rgba(255,255,255,0.1),0_20px_60px_rgba(0,0,0,0.35)] ${
          compact
            ? "border-[6px] md:border-8 rounded-[2rem] md:rounded-[2.4rem]"
            : "border-8 rounded-[2.8rem]"
        }`}
        style={{ aspectRatio: "9 / 19.5" }}
      >
        {/* Metallic rim overlay */}
        <div
          className={`absolute -inset-px pointer-events-none ${
            compact
              ? "border-[2px] rounded-[1.6rem] md:rounded-[2rem]"
              : "border-[3px] rounded-[2.3rem]"
          }`}
          style={{ borderColor: "rgba(113, 113, 122, 0.4)" }}
        />

        {/* Hardware buttons — iPhone 15 layout */}
        {/* Silent switch */}
        <div
          className={`absolute bg-zinc-900 rounded-l-md shadow-md ${
            compact
              ? "w-[4px] h-5 -left-[10px] md:-left-[12px]"
              : "w-[6px] h-7 -left-[14px]"
          }`}
          style={{ top: "12%" }}
        />
        {/* Volume up */}
        <div
          className={`absolute bg-zinc-900 rounded-l-md shadow-md ${
            compact
              ? "w-[4px] h-7 -left-[10px] md:-left-[12px]"
              : "w-[6px] h-10 -left-[14px]"
          }`}
          style={{ top: "20%" }}
        />
        {/* Volume down */}
        <div
          className={`absolute bg-zinc-900 rounded-l-md shadow-md ${
            compact
              ? "w-[4px] h-7 -left-[10px] md:-left-[12px]"
              : "w-[6px] h-10 -left-[14px]"
          }`}
          style={{ top: "30%" }}
        />
        {/* Power */}
        <div
          className={`absolute bg-zinc-900 rounded-r-md shadow-md ${
            compact
              ? "w-[4px] h-9 -right-[10px] md:-right-[12px]"
              : "w-[6px] h-12 -right-[14px]"
          }`}
          style={{ top: "24%" }}
        />

        {/* Screen */}
        <div
          className={`w-full h-full overflow-hidden bg-[#202124] relative ${
            compact
              ? "rounded-[1.3rem] md:rounded-[1.6rem]"
              : "rounded-[2.1rem]"
          }`}
        >
          {/* Dynamic island */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bg-zinc-900 rounded-full z-20 ${
              compact
                ? "w-[55px] h-[14px] md:w-[65px] md:h-[16px] top-[5px]"
                : "w-[80px] h-[20px] top-[6px]"
            }`}
          />

          {/* Video grid — fills the screen */}
          <div
            className={`absolute inset-x-0 bottom-0 px-1 ${
              compact ? "top-6 pb-9" : "top-8 pb-11"
            }`}
          >
            <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
              {participants.map((p, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden ${
                    compact ? "rounded-md" : "rounded-lg"
                  } ${p.host ? "ring-1 ring-primary/40" : ""}`}
                >
                  <Image
                    src={p.src}
                    alt=""
                    fill
                    className="object-cover"
                    style={{ objectPosition: p.position }}
                    sizes="140px"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-1 left-1.5 flex items-center gap-1">
                    {p.host && (
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                    )}
                    <span
                      className={`text-white/80 tracking-wide ${
                        compact ? "text-[0.3rem]" : "text-[0.4rem]"
                      }`}
                    >
                      {p.host ? `${p.name} (Host)` : p.name}
                    </span>
                  </div>
                  {!p.host && (
                    <div className="absolute top-1 right-1">
                      <svg
                        width={compact ? "6" : "8"}
                        height={compact ? "6" : "8"}
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-white/40"
                      >
                        <path
                          d="M1 1L23 23M9 9V12C9 13.6569 10.3431 15 12 15C12.55 15 13.07 14.87 13.53 14.62M15 10.6V6C15 4.34315 13.6569 3 12 3C10.6195 3 9.46622 3.93888 9.1 5.2M12 19V22M8 22H16M17 12V13C17 13.34 16.97 13.67 16.92 14"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Floating toolbar — Material 3 pill */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 flex items-center bg-[#3c4043]/90 backdrop-blur-md rounded-full ${
              compact
                ? "bottom-3 gap-1.5 px-2 py-1"
                : "bottom-4 gap-2 px-3 py-1.5"
            }`}
          >
            <div className={`rounded-full bg-white/10 flex items-center justify-center ${compact ? "w-5 h-5" : "w-6 h-6"}`}>
              <svg width={compact ? "9" : "11"} height={compact ? "9" : "11"} viewBox="0 0 24 24" fill="none" className="text-white/80">
                <path d="M12 2C10.34 2 9 3.34 9 5V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V5C15 3.34 13.66 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M19 10V12C19 15.87 15.87 19 12 19M5 10V12C5 15.87 8.13 19 12 19M12 19V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={`rounded-full bg-white/10 flex items-center justify-center ${compact ? "w-5 h-5" : "w-6 h-6"}`}>
              <svg width={compact ? "9" : "11"} height={compact ? "9" : "11"} viewBox="0 0 24 24" fill="none" className="text-white/80">
                <path d="M15.75 10.5L20.47 7.31C21.02 6.93 21.75 7.33 21.75 8V16C21.75 16.67 21.02 17.07 20.47 16.69L15.75 13.5M4.5 17.25H13.5C14.74 17.25 15.75 16.24 15.75 15V9C15.75 7.76 14.74 6.75 13.5 6.75H4.5C3.26 6.75 2.25 7.76 2.25 9V15C2.25 16.24 3.26 17.25 4.5 17.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={`rounded-full bg-[#ea4335] flex items-center justify-center ${compact ? "w-5 h-5" : "w-6 h-6"}`}>
              <svg width={compact ? "9" : "11"} height={compact ? "9" : "11"} viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M16.5 3.75L20.25 7.5L16.5 11.25M7.5 20.25L3.75 16.5L7.5 12.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Home indicator */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bg-white/20 rounded-full ${
              compact ? "bottom-1 w-12 h-[3px]" : "bottom-1.5 w-16 h-1"
            }`}
          />
        </div>
      </div>

      {/* LIVE indicator */}
      <div
        className={`absolute z-30 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 ${
          compact ? "top-6 md:top-8 right-0" : "top-8 sm:top-10 right-0"
        }`}
      >
        <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[0.4rem] font-medium text-white/90 uppercase tracking-wider">
          Live
        </span>
      </div>
    </motion.div>
    </div>
  );
}

export function LiveSessionSection() {
  return (
    <section className="aura-bg relative py-24 md:py-32 px-6 section-warm overflow-x-clip">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/1.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_GALLERY }}
          className="text-center mb-14"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            The experience
          </div>
          <h2
            className="heading-gold text-3xl sm:text-4xl md:text-[3.2rem] font-light tracking-tight"
          >
            Your Live Practice Studio
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            Not a pre-recorded library. Not a solo app. A real studio with a
            real teacher, three times a week, through your screen.
          </p>
        </motion.div>

        {/* ── Desktop: 3-column layout ── */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_minmax(320px,420px)_1fr] gap-10 xl:gap-14 items-center">
          {/* Left features */}
          <div className="space-y-14 pr-6 xl:pr-8">
            {leftFeatures.map((feature, i) => (
              <FeatureCard
                key={feature.number}
                feature={feature}
                index={i}
                side="left"
              />
            ))}
          </div>

          {/* Center mockup */}
          <MeetMockup />

          {/* Right features */}
          <div className="space-y-14 pl-6 xl:pl-8">
            {rightFeatures.map((feature, i) => (
              <FeatureCard
                key={feature.number}
                feature={feature}
                index={i}
                side="right"
              />
            ))}
          </div>
        </div>

        {/* ── Tablet (sm–lg): flanking phone layout ── */}
        <div className="hidden sm:grid lg:hidden sm:grid-cols-[1fr_auto_1fr] gap-3 md:gap-5 items-center">
          {/* Left features */}
          <div className="space-y-6 md:space-y-8">
            {leftFeatures.map((feature, i) => (
              <motion.div
                key={feature.number}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: EASE_GALLERY }}
                className="relative group text-right pr-4 md:pr-6"
              >
                {/* Connector */}
                <div className="absolute top-3 left-full flex items-center">
                  <div className="w-[5px] h-[5px] rounded-full border border-primary/25 bg-[var(--color-surface)] flex-shrink-0 z-10" />
                  <div
                    className="h-px flex-shrink-0"
                    style={{
                      width: "clamp(0.75rem, 3vw, 2rem)",
                      background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent)",
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="text-[0.55rem] font-mono text-primary/30 tracking-widest">{feature.number}</span>
                  <span className="w-3 h-px bg-primary/10" aria-hidden="true" />
                  <h3
                    className="text-[0.7rem] md:text-xs font-medium uppercase tracking-[0.06em]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {feature.title}
                  </h3>
                </div>
                <p className="text-[0.6rem] md:text-[0.65rem] text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Phone mockup */}
          <PhoneMeetMockup compact />

          {/* Right features */}
          <div className="space-y-6 md:space-y-8">
            {rightFeatures.map((feature, i) => (
              <motion.div
                key={feature.number}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: EASE_GALLERY }}
                className="relative group text-left pl-4 md:pl-6"
              >
                {/* Connector */}
                <div className="absolute top-3 right-full flex items-center flex-row-reverse">
                  <div className="w-[5px] h-[5px] rounded-full border border-primary/25 bg-[var(--color-surface)] flex-shrink-0 z-10" />
                  <div
                    className="h-px flex-shrink-0"
                    style={{
                      width: "clamp(0.75rem, 3vw, 2rem)",
                      background: "linear-gradient(to left, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent)",
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[0.55rem] font-mono text-primary/30 tracking-widest">{feature.number}</span>
                  <span className="w-3 h-px bg-primary/10" aria-hidden="true" />
                  <h3
                    className="text-[0.7rem] md:text-xs font-medium uppercase tracking-[0.06em]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {feature.title}
                  </h3>
                </div>
                <p className="text-[0.6rem] md:text-[0.65rem] text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Small mobile (<sm): stacked phone + list ── */}
        <div className="sm:hidden">
          <PhoneMeetMockup />

          {/* Features — compact numbered list */}
          <div className="mt-10 space-y-0">
            {[...leftFeatures, ...rightFeatures].map((feature, i) => (
              <motion.div
                key={feature.number}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.06,
                  ease: EASE_GALLERY,
                }}
                className="py-4 border-b border-primary/[0.07] last:border-b-0"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="text-2xl font-extralight text-primary/15 leading-none pt-0.5 select-none w-8 flex-shrink-0"
                    style={{ fontFamily: "var(--font-display)" }}
                    aria-hidden="true"
                  >
                    {feature.number}
                  </span>
                  <div className="space-y-1.5 min-w-0">
                    <h3
                      className="text-sm font-medium uppercase tracking-[0.06em]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
