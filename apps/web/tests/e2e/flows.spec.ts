import { test, expect } from "@playwright/test";

const shouldRunAuth = process.env.E2E_RUN_AUTH === "true";

test("signup and onboarding flow", async ({ page }) => {
  test.skip(!shouldRunAuth, "Set E2E_RUN_AUTH=true to enable auth flow tests.");

  await page.goto("/auth/sign-in");
  await expect(page.locator("main")).toBeVisible();

  await page.goto("/onboarding");
  await expect(page.getByText("Welcome! Let's get started")).toBeVisible();
  await page.getByLabel("Full Name").fill("Test User");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Face Yoga").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Complete Setup" }).click();

  // After the server action completes, the user is redirected to the dashboard
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 });
});

test("face yoga checkout flow", async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error - stub Razorpay in tests
    window.Razorpay = function () {
      return { open: () => {} };
    };
  });

  await page.route("**/api/razorpay/checkout", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orderId: "order_1" }),
    })
  );

  await page.goto("/face-yoga");
  await page.getByText("Single Session").click();
  await page.getByRole("button", { name: /Pay ₹/i }).click();
  await expect(page.getByText("Face Yoga")).toBeVisible();
});

test("pranayama subscription flow", async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error - stub Razorpay in tests
    window.Razorpay = function () {
      return { open: () => {} };
    };
  });

  await page.route("**/api/razorpay/subscription", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ subscriptionId: "sub_1" }),
    })
  );

  await page.goto("/pranayama");
  await page.getByText("Morning Batch").click();
  await page.getByRole("button", { name: /Start Autopay/i }).click();
  await expect(page.getByText("Pranayama")).toBeVisible();
});

test("dashboard navigation requires auth", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/auth\/sign-in/);
});
