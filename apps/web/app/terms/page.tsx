import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | Mukha Mudra",
  description: "Terms and conditions for Mukha Mudra services.",
};

const TERMS = [
  {
    title: "1. Payment & Refund Policy",
    items: [
      "Non-Refundable Fees: All fees paid for Mukha Mudra classes or programs are strictly non-refundable and non-transferable under any circumstances.",
      "No Fee Adjustments: Fees paid for a specific course or batch cannot be adjusted, transferred, or carried forward to any other program, course, or future batch.",
      "No Transfer of Admission: Enrollment is valid only for the registered participant. Transferring admission from one person to another is not permitted.",
    ],
  },
  {
    title: "2. Session Delivery & Scheduling",
    items: [
      "Teacher Substitution: Mukha Mudra reserves the right to substitute the primary teacher with a different qualified instructor at any time without prior notice.",
      "Access to Recordings: In instances where a live teacher is unavailable, participants will be provided with access to recorded sessions to ensure their practice remains uninterrupted.",
      "Right to Modify: We reserve the right to modify class schedules, program structure, or content if necessary.",
    ],
  },
  {
    title: "3. Marketing & Media Consent",
    items: [
      "Session Recording: Participants acknowledge and agree that Mukha Mudra may record any and all live sessions.",
      "Usage Rights: Mukha Mudra reserves the right to use these recordings, including participant audio or video, for marketing, promotional, or educational purposes across various platforms.",
    ],
  },
  {
    title: "4. Practice, Consistency & Results",
    items: [
      "Practice-Based Discipline: Face Yoga is a discipline rooted in exercise and awareness. Results are not guaranteed and depend entirely on committed, regular daily practice.",
      "Individual Variation: Results differ for each person based on age, skin type, muscle tone, lifestyle, stress levels, and overall health.",
      "No Product Influence: Our philosophy focuses on natural muscle activation. Results are not dependent on, nor do we promote, the use of specific skincare or cosmetic products.",
    ],
  },
  {
    title: "5. Medical Disclaimer & Responsibility",
    items: [
      "Not a Medical Treatment: Mukha Mudra is not a medical, therapeutic, or cosmetic treatment and does not replace professional medical advice or intervention.",
      "Consultation Advised: Participants with existing medical conditions, recent facial procedures, or skin sensitivities must consult a healthcare professional before enrolling.",
      "Participant Responsibility: By enrolling, you agree to practice mindfully and take full responsibility for your own physical well-being while following the guidance shared during sessions.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 pt-24 pb-8">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">Terms & Conditions</span>
        </nav>

        <h1 className="text-3xl font-semibold mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: March 2026
        </p>

        <div className="space-y-8">
          {TERMS.map((term) => (
            <section key={term.title}>
              <h2 className="text-lg font-medium mb-3">{term.title}</h2>
              <ul className="space-y-2.5">
                {term.items.map((item) => (
                  <li
                    key={item.slice(0, 30)}
                    className="text-muted-foreground leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary/20"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            For questions about these terms, contact us via WhatsApp or email at{" "}
            <a
              href="mailto:hello@mukhamudra.com"
              className="text-primary hover:underline"
            >
              hello@mukhamudra.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
