import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Mukha Mudra",
  description: "Privacy policy for Mukha Mudra services.",
};

const SECTIONS = [
  {
    title: "1. Information We Collect",
    items: [
      "Account Information: When you register, we collect your name, email address, phone number, and payment details necessary to process your enrollment.",
      "Session Data: We may record live sessions (audio and video) as outlined in our Terms & Conditions. Recordings may capture participant likenesses and voices.",
      "Usage Data: We automatically collect device type, browser information, IP address, and interaction data (pages visited, features used) to improve our platform.",
      "Communications: Messages you send us via email, WhatsApp, or our contact forms are stored to provide support and improve our services.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    items: [
      "Service Delivery: To manage your enrollment, grant access to live sessions and recordings, and communicate schedule changes or updates.",
      "Improvement & Analytics: To understand how participants use the platform, identify technical issues, and improve the overall experience.",
      "Marketing & Promotions: With your consent, to send class reminders, promotional offers, and educational content. You can opt out at any time.",
      "Legal Compliance: To comply with applicable laws, enforce our Terms & Conditions, and protect the rights and safety of Mukha Mudra and its participants.",
    ],
  },
  {
    title: "3. Information Sharing & Disclosure",
    items: [
      "Service Providers: We share data with trusted third-party services (payment processors, email providers, hosting platforms) strictly to operate and improve our services.",
      "Session Recordings: Recorded sessions may be shared publicly for marketing or educational purposes as described in our Terms & Conditions.",
      "Legal Requirements: We may disclose information if required by law, regulation, or legal process, or to protect the safety of our participants and platform.",
      "No Sale of Data: We do not sell, rent, or trade your personal information to third parties for their own marketing purposes.",
    ],
  },
  {
    title: "4. Data Security & Retention",
    items: [
      "Security Measures: We use industry-standard encryption, secure servers, and access controls to protect your personal information.",
      "Retention Period: We retain your data for as long as your account is active or as needed to provide services, comply with legal obligations, and resolve disputes.",
      "Account Deletion: You may request deletion of your account and associated data by contacting us at hello@mukhamudra.com. Some data may be retained as required by law.",
    ],
  },
  {
    title: "5. Your Rights & Choices",
    items: [
      "Access & Correction: You may request access to your personal data or ask us to correct inaccurate information at any time.",
      "Opt-Out: You can unsubscribe from marketing communications using the link in any email or by contacting us directly.",
      "Cookies: Our platform may use cookies and similar technologies for functionality and analytics. You can manage cookie preferences through your browser settings.",
      "Updates to This Policy: We may update this Privacy Policy from time to time. Continued use of our services after changes constitutes acceptance of the updated policy.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-4 pt-24 pb-8">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">Privacy Policy</span>
        </nav>

        <h1 className="text-3xl font-semibold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: March 2026
        </p>

        <p className="text-muted-foreground leading-relaxed mb-10">
          Mukha Mudra (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is
          committed to protecting your privacy. This policy explains how we
          collect, use, and safeguard your personal information when you use our
          website and services.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-medium mb-3">{section.title}</h2>
              <ul className="space-y-2.5">
                {section.items.map((item) => (
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
            For questions about this policy, contact us via WhatsApp or email
            at{" "}
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
