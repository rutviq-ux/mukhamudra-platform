// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewsletterForm } from "@/components/newsletter-form";

vi.mock("@/lib/posthog-provider", () => ({
  trackEvent: {
    newsletterSubscribeClicked: vi.fn(),
    newsletterSubscribed: vi.fn(),
  },
}));

describe("NewsletterForm", () => {
  it("submits and shows success message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Subscribed!" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<NewsletterForm />);

    const input = screen.getByPlaceholderText("you@example.com");
    await userEvent.type(input, "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(await screen.findByText("Subscribed!")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
  });
});
