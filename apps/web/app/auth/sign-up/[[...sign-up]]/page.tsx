"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";
import { Loader2, Check } from "lucide-react";

/* Map checkout redirect paths → friendly product labels */
const PRODUCT_LABELS: Record<string, string> = {
  "/face-yoga": "Face Yoga",
  "/pranayama": "Pranayama",
  "/pricing": "your selected plan",
};

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url");
  const productLabel = redirectUrl ? PRODUCT_LABELS[redirectUrl] : null;
  const isCheckoutRedirect = !!productLabel;

  const [termsChecked, setTermsChecked] = useState(false);

  // Persist T&C acceptance so onboarding can skip the T&C step
  useEffect(() => {
    if (termsChecked) {
      try {
        sessionStorage.setItem("mm-terms-accepted", "1");
      } catch {}
    }
  }, [termsChecked]);

  const inputClasses =
    "flex h-10 w-full rounded-[4px] border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left: Form ── */}
      <div className="flex items-center justify-center px-6 py-16">
        <SignUp.Root path="/auth/sign-up">
          <Clerk.Loading>
            {(isGlobalLoading) => (
              <>
                {/* Step 1: Start */}
                <SignUp.Step name="start" className="w-full max-w-sm space-y-6">
                  <header>
                    {isCheckoutRedirect ? (
                      <>
                        <h1
                          className="text-3xl font-light tracking-tight"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          You&rsquo;re almost in
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2">
                          Create a free account to join {productLabel}. Takes 10 seconds.
                        </p>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-success flex-shrink-0" />
                            Free account &mdash; no payment at this step
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-success flex-shrink-0" />
                            You&rsquo;ll choose your plan next
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-success flex-shrink-0" />
                            Cancel anytime from your dashboard
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h1
                          className="text-3xl font-light tracking-tight"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Begin your journey
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2">
                          Create your account to start practicing
                        </p>
                      </>
                    )}
                  </header>

                  <Clerk.Connection name="google" asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      type="button"
                      disabled={isGlobalLoading || !termsChecked}
                    >
                      <Clerk.Loading scope="provider:google">
                        {(isLoading) =>
                          isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Clerk.Icon className="mr-2 h-4 w-4" />
                              Continue with Google
                            </>
                          )
                        }
                      </Clerk.Loading>
                    </Button>
                  </Clerk.Connection>
                  {!termsChecked && (
                    <p className="text-center text-[0.65rem] text-muted-foreground/70 -mt-2">
                      Please agree to the Terms &amp; Conditions below to sign up with Google
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    or
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <Clerk.Field name="firstName" className="space-y-1.5">
                      <Clerk.Label className="text-sm font-medium">
                        First name
                      </Clerk.Label>
                      <Clerk.Input
                        className={inputClasses}
                        placeholder="First name"
                      />
                      <Clerk.FieldError className="text-xs text-destructive" />
                    </Clerk.Field>

                    <Clerk.Field name="lastName" className="space-y-1.5">
                      <Clerk.Label className="text-sm font-medium">
                        Last name
                      </Clerk.Label>
                      <Clerk.Input
                        className={inputClasses}
                        placeholder="Last name"
                      />
                      <Clerk.FieldError className="text-xs text-destructive" />
                    </Clerk.Field>
                  </div>

                  <div className="space-y-3">
                    <Clerk.Field name="emailAddress" className="space-y-1.5">
                      <Clerk.Label className="text-sm font-medium">
                        Email address
                      </Clerk.Label>
                      <Clerk.Input
                        type="email"
                        required
                        className={inputClasses}
                        placeholder="you@example.com"
                      />
                      <Clerk.FieldError className="text-xs text-destructive" />
                    </Clerk.Field>

                    <Clerk.Field name="password" className="space-y-1.5">
                      <Clerk.Label className="text-sm font-medium">
                        Password
                      </Clerk.Label>
                      <Clerk.Input
                        type="password"
                        required
                        validatePassword
                        className={inputClasses}
                      />
                      <Clerk.FieldError className="text-xs text-destructive" />
                    </Clerk.Field>
                  </div>

                  {/* T&C checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsChecked}
                      onChange={(e) => setTermsChecked(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary flex-shrink-0"
                    />
                    <span className="text-[0.7rem] text-muted-foreground leading-snug">
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy-policy"
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      . Subscriptions are non-refundable &amp; non-transferable.
                    </span>
                  </label>

                  <div className="space-y-3">
                    <SignUp.Captcha className="empty:hidden" />
                    <SignUp.Action submit asChild>
                      <Button
                        className="w-full"
                        disabled={isGlobalLoading || !termsChecked}
                      >
                        <Clerk.Loading>
                          {(isLoading) =>
                            isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Create account"
                            )
                          }
                        </Clerk.Loading>
                      </Button>
                    </SignUp.Action>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Clerk.Link
                      navigate="sign-in"
                      className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                    >
                      Sign in
                    </Clerk.Link>
                  </p>
                </SignUp.Step>

                {/* Email verification */}
                <SignUp.Step name="verifications">
                  <SignUp.Strategy name="email_code">
                    <div className="w-full max-w-sm space-y-6">
                      <header>
                        <h1
                          className="text-2xl font-light tracking-tight"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Verify your email
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2">
                          Enter the code we sent to your email
                        </p>
                      </header>

                      <Clerk.Field name="code" className="space-y-4">
                        <Clerk.Label className="sr-only">
                          Verification code
                        </Clerk.Label>
                        <div className="flex justify-center">
                          <Clerk.Input
                            type="otp"
                            autoSubmit
                            className="flex justify-center has-[:disabled]:opacity-50"
                            render={({ value, status }) => (
                              <div
                                data-status={status}
                                className="relative flex h-11 w-10 items-center justify-center border-y border-r border-border bg-input text-sm transition-all first:rounded-l-[4px] first:border-l last:rounded-r-[4px] data-[status=cursor]:ring-2 data-[status=cursor]:ring-primary data-[status=selected]:ring-2 data-[status=selected]:ring-primary"
                              >
                                {value}
                              </div>
                            )}
                          />
                        </div>
                        <Clerk.FieldError className="text-xs text-destructive text-center" />
                        <div className="text-center">
                          <SignUp.Action
                            resend
                            asChild
                            fallback={({ resendableAfter }) => (
                              <Button
                                variant="link"
                                size="sm"
                                disabled
                                className="text-muted-foreground"
                              >
                                Resend code (
                                <span className="tabular-nums">
                                  {resendableAfter}
                                </span>
                                s)
                              </Button>
                            )}
                          >
                            <Button
                              variant="link"
                              size="sm"
                              type="button"
                              className="text-muted-foreground"
                            >
                              Didn&rsquo;t get a code? Resend
                            </Button>
                          </SignUp.Action>
                        </div>
                      </Clerk.Field>

                      <SignUp.Action submit asChild>
                        <Button className="w-full" disabled={isGlobalLoading}>
                          <Clerk.Loading>
                            {(isLoading) =>
                              isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Verify"
                              )
                            }
                          </Clerk.Loading>
                        </Button>
                      </SignUp.Action>
                    </div>
                  </SignUp.Strategy>
                </SignUp.Step>

                {/* Continue — Clerk routes here if it still needs
                    additional fields after email verification. */}
                <SignUp.Step name="continue" className="w-full max-w-sm space-y-6">
                  <header>
                    <h1
                      className="text-2xl font-light tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Almost there
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      Tell us a little about yourself
                    </p>
                  </header>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Clerk.Field name="firstName" className="space-y-2">
                        <Clerk.Label className="text-sm font-medium">
                          First name
                        </Clerk.Label>
                        <Clerk.Input
                          className={inputClasses}
                          placeholder="First name"
                        />
                        <Clerk.FieldError className="text-xs text-destructive" />
                      </Clerk.Field>

                      <Clerk.Field name="lastName" className="space-y-2">
                        <Clerk.Label className="text-sm font-medium">
                          Last name
                        </Clerk.Label>
                        <Clerk.Input
                          className={inputClasses}
                          placeholder="Last name"
                        />
                        <Clerk.FieldError className="text-xs text-destructive" />
                      </Clerk.Field>
                    </div>
                  </div>

                  <SignUp.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      <Clerk.Loading>
                        {(isLoading) =>
                          isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Continue"
                          )
                        }
                      </Clerk.Loading>
                    </Button>
                  </SignUp.Action>
                </SignUp.Step>

                {/* Persistent CAPTCHA container — must always be in the DOM
                    so Clerk can attach Smart CAPTCHA during OAuth callbacks,
                    not just when the "start" step is visible. */}
                <div id="clerk-captcha" />
              </>
            )}
          </Clerk.Loading>
        </SignUp.Root>
      </div>

      {/* ── Right: Editorial image ── */}
      <div className="relative hidden lg:flex items-center justify-center overflow-hidden bg-card">
        <Image
          src="/rutviq/transparent/rutviq_3234944317550855561_2023-11-13.png"
          alt="Rutviq demonstrating face yoga"
          width={500}
          height={700}
          className="h-[80vh] w-auto object-contain image-dissolve-portrait opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background" />
        <div className="absolute bottom-12 left-0 right-0 text-center px-8">
          <p
            className="text-xl font-light text-muted-foreground/60 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            &ldquo;Your face is your autobiography.
            <br />
            Let it tell a beautiful story.&rdquo;
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground/40">
            Mukha Mudra
          </p>
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none" />
      </div>
    </main>
  );
}
