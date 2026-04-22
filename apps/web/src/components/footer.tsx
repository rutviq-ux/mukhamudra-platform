import Image from "next/image";
import Link from "next/link";
import { FooterVisibility } from "@/components/footer-visibility";

const PRODUCT_LINKS = [
  { label: "Face Yoga", href: "/face-yoga" },
  { label: "Pranayama", href: "/pranayama" },
  { label: "Pricing", href: "/pricing" },
];

const RESOURCE_LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Member Area", href: "/app" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/mukhamudra",
    icon: InstagramIcon,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@mukhamudra",
    icon: YouTubeIcon,
  },
];

export function Footer() {
  return (
    <FooterVisibility>
      <footer className="relative py-20 px-6 overflow-hidden">
        <div className="gold-rule mb-16" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            {/* ── Brand column ── */}
            <div className="md:col-span-1 flex flex-col items-center md:items-start gap-3">
                            <div className="flex items-center gap-3">
                <Image
                  src="/mukha_mudra_logos/mm_logo_t.png"
                  alt="Mukha Mudra"
                  width={40}
                  height={40}
                />
                <span
                  className="text-[0.85rem] uppercase tracking-[0.35em]"
                  style={{
                    fontFamily: "var(--font-wordmark)",
                    color: "var(--color-heading-gold)",
                  }}
                >
                  Mukha Mudra
                </span>
              </div>
              <span
                className="text-sm text-muted-foreground"
                style={{ fontFamily: "var(--font-devanagari)" }}
              >
                मुख मुद्रा
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px] text-center md:text-left mt-2">
                Live face yoga &amp; pranayama. 3x/week, 30 min, group
                sessions.
              </p>
            </div>

            {/* ── Practice column ── */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/60">
                Practice
              </p>
              <nav className="flex flex-col items-center md:items-start gap-3">
                {PRODUCT_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-500"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* ── Resources column ── */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/60">
                Resources
              </p>
              <nav className="flex flex-col items-center md:items-start gap-3">
                {RESOURCE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-500"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* ── Connect column ── */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/60">
                Connect
              </p>
              <nav className="flex flex-col items-center md:items-start gap-3">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-500"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </a>
                ))}
                <a
                  href="mailto:hello@mukhamudra.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-500"
                >
                  hello@mukhamudra.com
                </a>
              </nav>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div className="mt-16 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Mukha Mudra. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Hubli-Dharwad, Karnataka, India
            </p>
          </div>
        </div>
      </footer>
    </FooterVisibility>
  );
}

/* ── Inline SVG icons (avoids pulling in a full icon library for 2 icons) ── */

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" />
    </svg>
  );
}
