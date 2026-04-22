/**
 * Clerk appearance config.
 *
 * The `variables` section uses static hex values because Clerk's theming engine
 * resolves them at init time (CSS variables aren't supported there).
 *
 * The `elements` section uses Tailwind classes with CSS variables, so they
 * respond to the html.light class toggle for theme switching.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#2E9E86",
    borderRadius: "4px",
    fontFamily: '"DM Sans", sans-serif',
  },
  elements: {
    card: "void-card !bg-[var(--color-card)] !border-[var(--color-border)] !text-[var(--color-foreground)]",
    headerTitle: "!text-[var(--color-foreground)]",
    headerSubtitle: "!text-[var(--color-muted-foreground)]",
    formFieldLabel: "!text-[var(--color-foreground)]",
    formFieldHintText: "!text-[var(--color-muted-foreground)]",
    formFieldInput:
      "!bg-[var(--color-input)] !text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]",
    formButtonPrimary:
      "!bg-[var(--color-primary)] !text-[var(--color-primary-foreground)] !uppercase !tracking-[0.15em] !font-medium",
    footerActionText: "!text-[var(--color-muted-foreground)]",
    footerActionLink: "!text-[var(--color-foreground)]",
  },
} as const;
