import { describe, expect, it } from "vitest";
import { CLASS_BCC_CHUNK, CLASS_FROM, CLASS_MAILBOX } from "./class-mail";

describe("class mail", () => {
  it("sends as classes@ with BCC batches under Resend's 50-recipient cap", () => {
    expect(CLASS_FROM).toBe("Mukha Mudra <classes@mukhamudra.com>");
    expect(CLASS_MAILBOX).toBe("classes@mukhamudra.com");
    expect(CLASS_BCC_CHUNK).toBe(49);
    expect(1 + CLASS_BCC_CHUNK).toBeLessThanOrEqual(50);
  });
});
