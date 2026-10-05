import { describe, expect, it } from "vitest";
import { buildClassMailRaw, CLASS_FROM, CLASS_MAILBOX } from "./gmail-class-mail";

describe("buildClassMailRaw", () => {
  it("sends as classes@ and hides members on BCC", () => {
    const raw = buildClassMailRaw({
      from: CLASS_FROM,
      to: CLASS_MAILBOX,
      bcc: ["a@example.com", "b@example.com"],
      subject: "Your 9:00 AM Pranayama class",
      html: "<p>Hello,</p>",
    });

    expect(raw.startsWith(`From: ${CLASS_FROM}`)).toBe(true);
    expect(raw).toContain(`To: ${CLASS_MAILBOX}`);
    expect(raw).toContain("Bcc: a@example.com, b@example.com");
    expect(raw).not.toContain("To: a@example.com");
    expect(raw).toContain("Subject: Your 9:00 AM Pranayama class");
  });
});
