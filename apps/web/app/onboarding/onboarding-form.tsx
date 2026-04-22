"use client";

import { useState, useEffect, useRef, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@/actions/user";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Bell,
  ArrowRight,
  Sparkles,
  MessageSquare,
  ScrollText,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from "@ru/ui";

interface OnboardingFormProps {
  initialName: string;
  initialPhone: string;
  initialTimezone: string;
  initialGoal: string;
  termsAlreadyAccepted: boolean;
}

const ALL_STEPS = [
  { id: "profile", title: "Profile", icon: User },
  { id: "goals", title: "Goals", icon: Sparkles },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "terms", title: "Terms", icon: ScrollText },
];

const TERMS_SUMMARY = [
  {
    title: "Exercise-Based Practice",
    detail:
      "Mukha Mudra is an exercise-based wellness practice, not a cosmetic treatment, medical procedure, or therapy. Results depend on individual consistency.",
  },
  {
    title: "Strictly Non-Refundable",
    detail:
      "All subscriptions are strictly non-refundable once activated. You may cancel anytime but access continues until the billing period ends. No partial refunds.",
  },
  {
    title: "Non-Transferable",
    detail:
      "Your membership is personal and cannot be transferred, shared, or resold to another person under any circumstances.",
  },
  {
    title: "No Influence on Services",
    detail:
      "Purchasing a subscription does not entitle you to influence product decisions, class formats, schedules, or business operations. Rutviq retains full creative control.",
  },
  {
    title: "Recording Consent",
    detail:
      "Sessions may be recorded. By attending, you consent to being recorded. Recordings are for personal use only and may not be redistributed.",
  },
  {
    title: "Health Disclaimer",
    detail:
      "Consult a healthcare professional before participating if you have medical conditions. You participate at your own risk.",
  },
];

const COUNTRY_CODES = [
  { code: "+91", label: "IN +91", flag: "🇮🇳" },
  { code: "+1", label: "US +1", flag: "🇺🇸" },
  { code: "+44", label: "UK +44", flag: "🇬🇧" },
  { code: "+971", label: "AE +971", flag: "🇦🇪" },
  { code: "+65", label: "SG +65", flag: "🇸🇬" },
  { code: "+61", label: "AU +61", flag: "🇦🇺" },
  { code: "+49", label: "DE +49", flag: "🇩🇪" },
];

/** Split a stored phone like "+919876543210" into { countryCode, localNumber } */
function parsePhone(phone: string): { countryCode: string; localNumber: string } {
  if (!phone) return { countryCode: "+91", localNumber: "" };
  // Try matching known country codes (longest first)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const cc of sorted) {
    if (phone.startsWith(cc.code)) {
      return { countryCode: cc.code, localNumber: phone.slice(cc.code.length) };
    }
  }
  // Fallback: strip leading + and assume first digits are code
  return { countryCode: "+91", localNumber: phone.replace(/^\+/, "") };
}

export function OnboardingForm({
  initialName,
  initialPhone,
  initialTimezone,
  initialGoal,
  termsAlreadyAccepted,
}: OnboardingFormProps) {
  const router = useRouter();

  // Check if terms were accepted during sign-up (sessionStorage flag)
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("mm-terms-accepted")) {
        setSignupTermsAccepted(true);
        sessionStorage.removeItem("mm-terms-accepted");
      }
    } catch {}
  }, []);

  const termsSkipped = termsAlreadyAccepted || signupTermsAccepted;

  // Build steps array — skip T&C if already accepted on product page or sign-up
  const steps = useMemo(
    () => (termsSkipped ? ALL_STEPS.filter((s) => s.id !== "terms") : ALL_STEPS),
    [termsSkipped],
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);

  const parsed = parsePhone(initialPhone);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [formData, setFormData] = useState({
    name: initialName,
    localPhone: parsed.localNumber,
    timezone: initialTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    goal: initialGoal,
    whatsappOptIn: false,
    marketingOptIn: false,
    termsAccepted: termsSkipped,
  });

  const nextStep = () => {
    setError(null);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setError(null);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (!termsSkipped && !formData.termsAccepted) {
      setError("You must accept the Terms & Conditions to continue.");
      return;
    }

    setError(null);

    // Combine country code + local number
    const fullPhone = formData.localPhone
      ? `${countryCode}${formData.localPhone.replace(/^0+/, "")}`
      : undefined;

    startTransition(async () => {
      const result = await updateUserProfile({
        name: formData.name,
        phone: fullPhone,
        timezone: formData.timezone,
        goal: formData.goal as "face-yoga" | "pranayama" | "both" | undefined,
        whatsappOptIn: formData.whatsappOptIn,
        marketingOptIn: formData.marketingOptIn,
        termsAccepted: formData.termsAccepted || termsSkipped,
      });

      if (result.success) {
        router.push("/app");
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    });
  };

  const currentStepDef = steps[currentStep]!;
  const StepIcon = currentStepDef.icon;

  const stepTitles: Record<string, string> = {
    profile: "Welcome! Let\u2019s get started",
    goals: "What\u2019s your focus?",
    notifications: "Stay in the loop",
    terms: "Terms & Conditions",
  };

  const stepDescriptions: Record<string, string> = {
    profile: "First, tell us a bit about yourself.",
    goals: "We\u2019ll tailor your experience based on your goals.",
    notifications: "Never miss a session with our notifications.",
    terms: "Please review and accept our terms to continue.",
  };

  // Determine if "Continue" button should be disabled for current step
  const isNextDisabled =
    isPending ||
    (currentStepDef.id === "profile" && !formData.name.trim()) ||
    (currentStepDef.id === "goals" && !formData.goal) ||
    (currentStepDef.id === "terms" && !formData.termsAccepted);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-background to-background/50">
      <div className="max-w-full w-full">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-3 bg-primary/50" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card glass className="p-8">
              <CardHeader className="p-0 mb-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                  <StepIcon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-semibold">
                  {stepTitles[currentStepDef.id]}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  {stepDescriptions[currentStepDef.id]}
                </p>
              </CardHeader>

              <CardContent className="p-0 space-y-6">
                {/* ── Step: Profile ── */}
                {currentStepDef.id === "profile" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        maxLength={100}
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Phone Number{" "}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      </Label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[90px]"
                          aria-label="Country code"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code} value={cc.code}>
                              {cc.flag} {cc.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          id="phone"
                          className="flex-1"
                          placeholder="98765 43210"
                          inputMode="tel"
                          maxLength={15}
                          value={formData.localPhone}
                          onChange={(e) => {
                            // Only allow digits and spaces
                            const cleaned = e.target.value.replace(/[^\d\s]/g, "");
                            setFormData({ ...formData, localPhone: cleaned });
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For WhatsApp session reminders &amp; account recovery
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                        <span className="opacity-60">🌍</span>
                        {formData.timezone}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Detected automatically. Session times will show in your local time.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Step: Goals ── */}
                {currentStepDef.id === "goals" && (
                  <div className="grid gap-4">
                    {[
                      {
                        id: "face-yoga",
                        title: "Face Yoga",
                        desc: "Anti-aging & natural glow",
                      },
                      {
                        id: "pranayama",
                        title: "Pranayama",
                        desc: "Breathing & stress relief",
                      },
                      {
                        id: "both",
                        title: "Both",
                        desc: "Holistic wellness approach",
                      },
                    ].map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() =>
                          setFormData({ ...formData, goal: goal.id })
                        }
                        className={`text-left p-4 rounded-xl border transition-all ${
                          formData.goal === goal.id
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/50 border-transparent hover:border-muted-foreground/20"
                        }`}
                      >
                        <h4 className="font-medium">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {goal.desc}
                        </p>
                      </button>
                    ))}
                    {initialGoal && (
                      <p className="text-xs text-muted-foreground text-center">
                        Pre-selected based on your subscription
                      </p>
                    )}
                  </div>
                )}

                {/* ── Step: Notifications ── */}
                {currentStepDef.id === "notifications" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">
                            WhatsApp Reminders
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Session links and updates
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.whatsappOptIn}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, whatsappOptIn: checked })
                        }
                      />
                    </div>
                    {formData.whatsappOptIn && !formData.localPhone && (
                      <p className="text-xs text-muted-foreground px-4">
                        💡 Go back to Step 1 to add your phone number for
                        WhatsApp reminders.
                      </p>
                    )}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                      <div className="flex items-start gap-3">
                        <Bell className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">
                            Email Newsletter
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tips, blog posts, and news
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.marketingOptIn}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, marketingOptIn: checked })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* ── Step: Terms & Conditions (only if not already accepted) ── */}
                {currentStepDef.id === "terms" && (
                  <div className="space-y-5">
                    {/* Key terms summary cards */}
                    <div className="space-y-3">
                      {TERMS_SUMMARY.map((term) => (
                        <div
                          key={term.title}
                          className="p-4 rounded-xl bg-muted/50 space-y-1"
                        >
                          <p className="text-sm font-medium">{term.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {term.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Read full terms link */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowFullTerms(true)}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        Read full Terms & Conditions
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Acceptance checkbox */}
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-border cursor-pointer hover:border-primary/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            termsAccepted: e.target.checked,
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        I have read and agree to the{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowFullTerms(true);
                          }}
                          className="text-primary hover:underline"
                        >
                          Terms & Conditions
                        </button>
                        . I understand that subscriptions are non-refundable and
                        non-transferable.
                      </span>
                    </label>
                  </div>
                )}
              </CardContent>

              {error && (
                <p className="text-sm text-destructive mt-4 text-center">
                  {error}
                </p>
              )}

              <div className="flex gap-4 mt-8">
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    size="lg"
                    className="flex-1"
                    onClick={prevStep}
                    disabled={isPending}
                  >
                    Back
                  </Button>
                )}
                <Button
                  variant="default"
                  size="lg"
                  className="flex-[2] group"
                  disabled={isNextDisabled}
                  onClick={nextStep}
                >
                  {isPending ? (
                    "Finishing..."
                  ) : (
                    <>
                      {currentStep === steps.length - 1
                        ? termsSkipped
                          ? "Complete Setup"
                          : "Accept & Complete Setup"
                        : "Continue"}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>

      {/* ── Full Terms Dialog ── */}
      <AnimatePresence>
        {showFullTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowFullTerms(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-[4px] border border-border bg-background shadow-2xl"
            >
              {/* Dialog header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold">Terms & Conditions</h2>
                <button
                  onClick={() => setShowFullTerms(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              {/* Scrollable content */}
              <div
                ref={termsScrollRef}
                className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
              >
                <p className="text-xs text-muted-foreground">
                  Last updated: February 2026
                </p>

                <TermsContent />
              </div>

              {/* Dialog footer */}
              <div className="px-6 py-4 border-t border-border flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowFullTerms(false)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  className="flex-[2]"
                  onClick={() => {
                    setFormData({ ...formData, termsAccepted: true });
                    setShowFullTerms(false);
                  }}
                >
                  I Accept
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ─── Full T&C Content (shared with /terms page) ─── */

function TermsContent() {
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="font-medium mb-2">
          1. Nature of Services & Philosophy
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          Mukha Mudra is an exercise-based wellness practice rooted in yogic
          philosophy. It is not a cosmetic treatment, medical procedure, therapy,
          or spa service. Our sessions include Face Yoga, Gua Sha, Roller
          Therapy, Trataka, Osteopathy, Cupping, Acupressure, and Pranayama,
          all conducted live online via Google Meet and led by trained
          instructors. Results vary by individual and depend on consistency,
          lifestyle, and personal biology. We do not guarantee specific outcomes.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">2. Subscription Plans</h3>
        <p className="text-muted-foreground leading-relaxed">
          Access to live sessions requires an active subscription. Plans are
          available on monthly and annual billing cycles. Annual plans offer
          significant savings compared to monthly billing. Bundle plans provide
          access to both Face Yoga and Pranayama sessions across all available
          batches. All prices are in Indian Rupees (INR) and inclusive of
          applicable taxes.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">3. Payments & Billing</h3>
        <p className="text-muted-foreground leading-relaxed">
          Payments are processed securely through Razorpay. Subscriptions
          auto-renew at the end of each billing period unless cancelled prior to
          renewal. Monthly subscriptions renew every 30 days. Annual
          subscriptions renew every 365 days. You will be notified before renewal
          via WhatsApp or email.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">4. Refund Policy</h3>
        <p className="text-muted-foreground leading-relaxed">
          <strong>All subscriptions are strictly non-refundable.</strong> Once a
          subscription is activated, no refunds (full or partial) will be
          issued under any circumstances. You may cancel your subscription at any
          time from your billing dashboard, and access will continue until the
          end of your current billing period. By subscribing, you acknowledge and
          accept this no-refund policy.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">5. Non-Transferability</h3>
        <p className="text-muted-foreground leading-relaxed">
          Your membership is personal and non-transferable. It cannot be shared,
          gifted, resold, or transferred to another person under any
          circumstances. Each subscription is tied to a single account and a
          single individual. Violation of this clause may result in immediate
          termination of your membership without refund.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">6. No Influence on Services</h3>
        <p className="text-muted-foreground leading-relaxed">
          Purchasing a subscription does not entitle you to influence, direct, or
          have a say in product decisions, class formats, session content,
          scheduling, instructor selection, or any business operations of Mukha
          Mudra. Rutviq and the Mukha Mudra team retain full creative and
          operational control over all services. Feedback is welcome but does not
          constitute an obligation to act.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">7. Recording Access Add-on</h3>
        <p className="text-muted-foreground leading-relaxed">
          The Recording Access add-on is available exclusively to annual plan
          subscribers. It provides access to session recordings for one year from
          the date of purchase. Recordings are hosted on Google Drive and
          accessible through your member dashboard. The add-on does not
          auto-renew and must be repurchased annually.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">8. Session Attendance & Conduct</h3>
        <p className="text-muted-foreground leading-relaxed">
          Group sessions run on a fixed weekly schedule (Monday, Wednesday,
          Friday). Missed sessions are not rescheduled, credited, or refunded.
          Consistent attendance is encouraged for best results. Participants must
          maintain a respectful environment during live sessions and in WhatsApp
          community groups. Harassment, spam, or disruptive behaviour will result
          in immediate removal without refund. Session recordings and materials
          are for personal use only and may not be redistributed, reposted, or
          used commercially.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">9. Health Disclaimer</h3>
        <p className="text-muted-foreground leading-relaxed">
          Our sessions are designed for general wellness and are not a substitute
          for medical advice, diagnosis, or treatment. If you have any medical
          conditions, injuries, or concerns, consult a healthcare professional
          before participating. Mukha Mudra, its instructors, and affiliates are
          not liable for any injuries, adverse effects, or health consequences
          arising from participation. You participate entirely at your own risk.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">10. Privacy & Data</h3>
        <p className="text-muted-foreground leading-relaxed">
          We collect your name, email, phone number, and payment information to
          provide our services. Your data is stored securely and never sold to
          third parties. Sessions may be recorded. By attending a live session,
          you consent to being recorded. Recordings may include your video and
          audio feed. WhatsApp messages are used solely for service
          communications and session reminders.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">11. Modifications</h3>
        <p className="text-muted-foreground leading-relaxed">
          Mukha Mudra reserves the right to modify these terms, pricing, session
          schedules, or service offerings at any time. Significant changes will
          be communicated via WhatsApp or email at least 7 days in advance.
          Continued use of our services after changes constitutes acceptance of
          the updated terms.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">12. Governing Law</h3>
        <p className="text-muted-foreground leading-relaxed">
          These terms are governed by the laws of India. Any disputes arising
          from or related to these terms or our services shall be subject to the
          exclusive jurisdiction of the courts in Hubli-Dharwad, Karnataka,
          India.
        </p>
      </section>
    </div>
  );
}
