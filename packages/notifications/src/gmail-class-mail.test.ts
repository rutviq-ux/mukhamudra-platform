import { describe, expect, it } from "vitest";
import { buildClassMailRaw, CLASS_FROM, CLASS_MAILBOX, GMAIL_BCC_CHUNK } from "./gmail-class-mail";

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

  it("folds a long BCC only between addresses", () => {
    const addresses = Array.from({ length: 8 }, (_, i) => `member${i}@example.com`);
    const raw = buildClassMailRaw({
      from: CLASS_FROM,
      to: CLASS_MAILBOX,
      bcc: addresses,
      subject: "Your 9:00 PM Face Yoga class",
      html: "<p>Your 9:00 PM Face Yoga class starts in 15 minutes.</p>",
    });

    const header = raw.split("\r\n\r\n")[0] ?? "";
    expect(header.replace(/\r\n[ \t]/g, " ")).toContain(`Bcc: ${addresses.join(", ")}`);

    const bccLines: string[] = [];
    for (const line of header.split("\r\n")) {
      if (line.startsWith("Bcc:")) {
        bccLines.push(line);
        continue;
      }
      if (bccLines.length > 0 && line.startsWith(" ")) {
        bccLines.push(line);
        continue;
      }
      if (bccLines.length > 0) break;
    }

    expect(bccLines.length).toBeGreaterThan(1);
    const folded = bccLines.flatMap((line) =>
      line.replace(/^Bcc:\s*/, "").trim().replace(/,$/, "").split(", ").filter(Boolean),
    );
    expect(folded).toEqual(addresses);
    for (const line of bccLines) {
      expect(line.length).toBeLessThanOrEqual(78);
    }
  });

  it("sends at most 50 members on one class email", () => {
    expect(GMAIL_BCC_CHUNK).toBe(50);
  });
});
