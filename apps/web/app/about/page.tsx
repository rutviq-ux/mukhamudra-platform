import type { Metadata } from "next";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About Rutviq | Mukha Mudra",
  description:
    "Meet Rutviq, founder of Mukha Mudra. A devoted yoga teacher for over 10 years, combining ancient yoga, breathwork, and meditation to transform faces and minds from the inside out.",
};

export default function AboutPage() {
  return <AboutContent />;
}
