import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Cinzel, DM_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { PostHogProvider } from "@/lib/posthog-provider";
import { FloatingControls } from "@/components/floating-controls";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/toaster";
import { NavigationProgress } from "@/components/navigation-progress";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { clerkAppearance } from "@/lib/clerk-appearance";

const themeInitScript = `(function(){try{var t=localStorage.getItem("mm-theme");if(t==="light")document.documentElement.classList.add("light")}catch(e){}})()`;


const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-display",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-wordmark",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "700"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mukha Mudra | Live Face Yoga & Pranayama",
    template: "%s | Mukha Mudra",
  },
  description:
    "Live face yoga sessions and daily pranayama classes. Join 100K+ practitioners transforming their face, breath, and focus.",
  openGraph: {
    title: "Mukha Mudra | Live Face Yoga & Pranayama",
    description:
      "Live face yoga sessions and daily pranayama classes. Join 100K+ practitioners.",
    type: "website",
    siteName: "Mukha Mudra",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mukha Mudra | Live Face Yoga & Pranayama",
    description:
      "Live face yoga sessions and daily pranayama classes. Join 100K+ practitioners.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1A1610" },
    { media: "(prefers-color-scheme: light)", color: "#F5EFE3" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <html lang={locale} suppressHydrationWarning className={`${cormorant.variable} ${cinzel.variable} ${dmSans.variable} ${notoDevanagari.variable}`}>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
          <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
          <link rel="manifest" href="/manifest.json" />
        </head>
        <body className="min-h-screen bg-background font-sans antialiased">
          <NextIntlClientProvider messages={messages}>
            <PostHogProvider>
              <NavigationProgress />
              <Nav />
              <FloatingControls />
              <SmoothScrollProvider>
                {children}
                <Footer />
              </SmoothScrollProvider>
              <Toaster />
            </PostHogProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
