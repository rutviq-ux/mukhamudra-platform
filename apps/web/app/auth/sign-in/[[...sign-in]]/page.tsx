"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ru/ui";
import { Loader2 } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left: Form ── */}
      <div className="flex items-center justify-center px-6 py-16">
        <SignIn.Root path="/auth/sign-in">
          <Clerk.Loading>
            {(isGlobalLoading) => (
              <>
                {/* Step 1: Identifier + OAuth */}
                <SignIn.Step name="start" className="w-full max-w-sm space-y-8">
                  <header>
                    <h1
                      className="text-3xl font-light tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Welcome back
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      Sign in to continue your practice
                    </p>
                  </header>

                  <Clerk.Connection name="google" asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      type="button"
                      disabled={isGlobalLoading}
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

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    or
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <Clerk.Field name="identifier" className="space-y-2">
                    <Clerk.Label className="text-sm font-medium">
                      Email address
                    </Clerk.Label>
                    <Clerk.Input
                      type="email"
                      required
                      className="flex h-10 w-full rounded-[4px] border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="you@example.com"
                    />
                    <Clerk.FieldError className="text-xs text-destructive" />
                  </Clerk.Field>

                  <SignIn.Action submit asChild>
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
                  </SignIn.Action>

                  <p className="text-center text-sm text-muted-foreground">
                    New here?{" "}
                    <Clerk.Link
                      navigate="sign-up"
                      className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                    >
                      Create an account
                    </Clerk.Link>
                  </p>
                </SignIn.Step>

                {/* Step 2: Choose strategy */}
                <SignIn.Step
                  name="choose-strategy"
                  className="w-full max-w-sm space-y-6"
                >
                  <header>
                    <h1
                      className="text-2xl font-light tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Use another method
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      Choose how you'd like to sign in
                    </p>
                  </header>

                  <div className="space-y-3">
                    <SignIn.SupportedStrategy name="email_code" asChild>
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        disabled={isGlobalLoading}
                      >
                        Email code
                      </Button>
                    </SignIn.SupportedStrategy>
                    <SignIn.SupportedStrategy name="password" asChild>
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        disabled={isGlobalLoading}
                      >
                        Password
                      </Button>
                    </SignIn.SupportedStrategy>
                  </div>

                  <SignIn.Action navigate="previous" asChild>
                    <Button variant="ghost" className="w-full">
                      Go back
                    </Button>
                  </SignIn.Action>

                  <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link
                      href="/auth/sign-up"
                      className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                    >
                      Sign up
                    </Link>
                  </p>
                </SignIn.Step>

                {/* Step 3: Verifications */}
                <SignIn.Step name="verifications">
                  {/* Password */}
                  <SignIn.Strategy name="password">
                    <div className="w-full max-w-sm space-y-6">
                    <header>
                      <h1
                        className="text-2xl font-light tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Enter your password
                      </h1>
                      <p className="text-sm text-muted-foreground mt-2">
                        Welcome back, <SignIn.SafeIdentifier />
                      </p>
                    </header>

                    <Clerk.Field name="password" className="space-y-2">
                      <Clerk.Label className="text-sm font-medium">
                        Password
                      </Clerk.Label>
                      <Clerk.Input
                        type="password"
                        className="flex h-10 w-full rounded-[4px] border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <Clerk.FieldError className="text-xs text-destructive" />
                    </Clerk.Field>

                    <div className="space-y-3">
                      <SignIn.Action submit asChild>
                        <Button className="w-full" disabled={isGlobalLoading}>
                          <Clerk.Loading>
                            {(isLoading) =>
                              isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Sign in"
                              )
                            }
                          </Clerk.Loading>
                        </Button>
                      </SignIn.Action>
                      <div className="flex justify-between">
                        <SignIn.Action navigate="choose-strategy" asChild>
                          <Button variant="link" size="sm" type="button">
                            Use another method
                          </Button>
                        </SignIn.Action>
                        <SignIn.Action navigate="forgot-password" asChild>
                          <Button variant="link" size="sm" type="button">
                            Forgot password?
                          </Button>
                        </SignIn.Action>
                      </div>

                      <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link
                          href="/auth/sign-up"
                          className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                        >
                          Sign up
                        </Link>
                      </p>
                    </div>
                    </div>
                  </SignIn.Strategy>

                  {/* Email OTP */}
                  <SignIn.Strategy name="email_code">
                    <div className="w-full max-w-sm space-y-6">
                    <header>
                      <h1
                        className="text-2xl font-light tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Check your email
                      </h1>
                      <p className="text-sm text-muted-foreground mt-2">
                        We sent a code to <SignIn.SafeIdentifier />
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
                        <SignIn.Action
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
                            Didn't get a code? Resend
                          </Button>
                        </SignIn.Action>
                      </div>
                    </Clerk.Field>

                    <div className="space-y-3">
                      <SignIn.Action submit asChild>
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
                      </SignIn.Action>
                      <SignIn.Action navigate="choose-strategy" asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          type="button"
                        >
                          Use another method
                        </Button>
                      </SignIn.Action>

                      <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link
                          href="/auth/sign-up"
                          className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                        >
                          Sign up
                        </Link>
                      </p>
                    </div>
                    </div>
                  </SignIn.Strategy>
                </SignIn.Step>

                {/* Forgot password */}
                <SignIn.Step
                  name="forgot-password"
                  className="w-full max-w-sm space-y-6"
                >
                  <header>
                    <h1
                      className="text-2xl font-light tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Reset your password
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      We'll send a code to reset it
                    </p>
                  </header>

                  <SignIn.SupportedStrategy
                    name="reset_password_email_code"
                    asChild
                  >
                    <Button className="w-full" type="button">
                      Send reset code
                    </Button>
                  </SignIn.SupportedStrategy>

                  <SignIn.Action navigate="previous" asChild>
                    <Button variant="ghost" className="w-full">
                      Go back
                    </Button>
                  </SignIn.Action>
                </SignIn.Step>

                {/* Reset password */}
                <SignIn.Step
                  name="reset-password"
                  className="w-full max-w-sm space-y-6"
                >
                  <header>
                    <h1
                      className="text-2xl font-light tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      New password
                    </h1>
                  </header>

                  <Clerk.Field name="password" className="space-y-2">
                    <Clerk.Label className="text-sm font-medium">
                      New password
                    </Clerk.Label>
                    <Clerk.Input
                      type="password"
                      className="flex h-10 w-full rounded-[4px] border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    />
                    <Clerk.FieldError className="text-xs text-destructive" />
                  </Clerk.Field>

                  <Clerk.Field name="confirmPassword" className="space-y-2">
                    <Clerk.Label className="text-sm font-medium">
                      Confirm password
                    </Clerk.Label>
                    <Clerk.Input
                      type="password"
                      className="flex h-10 w-full rounded-[4px] border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    />
                    <Clerk.FieldError className="text-xs text-destructive" />
                  </Clerk.Field>

                  <SignIn.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      <Clerk.Loading>
                        {(isLoading) =>
                          isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Reset password"
                          )
                        }
                      </Clerk.Loading>
                    </Button>
                  </SignIn.Action>
                </SignIn.Step>

                {/* Passive CAPTCHA anchor for OAuth SSO callback —
                    Clerk looks for this during redirect handling */}
                <div id="clerk-captcha" />
              </>
            )}
          </Clerk.Loading>
        </SignIn.Root>
      </div>

      {/* ── Right: Editorial image ── */}
      <div className="relative hidden lg:flex items-center justify-center overflow-hidden bg-card">
        <Image
          src="/rutviq/transparent/rutviq_3213145758304368623_2023-10-14.png"
          alt="Rutviq in meditation"
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
            "The face is the mirror of the mind,
            <br />
            and eyes without speaking confess
            <br />
            the secrets of the heart."
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground/40">
            St. Jerome
          </p>
        </div>
        <div className="absolute inset-0 grain-overlay pointer-events-none" />
      </div>
    </main>
  );
}
