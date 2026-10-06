import { describe, expect, it } from "vitest";
import {
  cancellationNoticePhrases,
  classNoticeEmailKey,
  firstName,
  formatInDate,
  formatInTime,
  isBulkClassEmail,
  isMmMessageTemplate,
  joinTemplateForStartTime,
  meetCodeFromJoinUrl,
  programLabel,
  sharedClassEmailHtml,
  welcomeTemplateForPlanName,
  welcomeTemplateForSlug,
} from "./mm-templates";

describe("meetCodeFromJoinUrl", () => {
  it("returns the meeting code", () => {
    expect(
      meetCodeFromJoinUrl("https://meet.google.com/abc-defg-hij"),
    ).toBe("abc-defg-hij");
  });

  it("ignores a query string", () => {
    expect(
      meetCodeFromJoinUrl("https://meet.google.com/abc-defg-hij?authuser=0"),
    ).toBe("abc-defg-hij");
  });

  it("rejects other hosts", () => {
    expect(meetCodeFromJoinUrl("https://www.mukhamudra.com/trial")).toBeNull();
    expect(meetCodeFromJoinUrl(null)).toBeNull();
  });
});

describe("joinTemplateForStartTime", () => {
  it("maps the four class slots", () => {
    expect(joinTemplateForStartTime("08:00")).toBe("mm_join_pranayama_8am");
    expect(joinTemplateForStartTime("09:00")).toBe("mm_join_pranayama_9am");
    expect(joinTemplateForStartTime("21:00")).toBe("mm_join_face_yoga_9pm");
    expect(joinTemplateForStartTime("22:00")).toBe("mm_join_face_yoga_10pm");
  });

  it("skips other times", () => {
    expect(joinTemplateForStartTime("18:00")).toBeNull();
  });
});

describe("welcomeTemplateForSlug", () => {
  it("uses one template for monthly and annual", () => {
    expect(welcomeTemplateForSlug("face-annual")).toBe("mm_welcome_face_yoga");
    expect(welcomeTemplateForSlug("face-monthly")).toBe("mm_welcome_face_yoga");
    expect(welcomeTemplateForSlug("pranayama-monthly")).toBe(
      "mm_welcome_pranayama",
    );
    expect(welcomeTemplateForSlug("bundle-annual")).toBe("mm_welcome_bundle");
    expect(welcomeTemplateForSlug("recording-addon")).toBeNull();
  });

  it("maps plan display names", () => {
    expect(welcomeTemplateForPlanName("Face Yoga Annual")).toBe(
      "mm_welcome_face_yoga",
    );
    expect(welcomeTemplateForPlanName("Bundle Annual")).toBe("mm_welcome_bundle");
    expect(welcomeTemplateForPlanName("Pranayama Monthly")).toBe(
      "mm_welcome_pranayama",
    );
    expect(welcomeTemplateForPlanName("Recording Access")).toBeNull();
  });
});

describe("programLabel", () => {
  it("names the three programs", () => {
    expect(programLabel("FACE_YOGA")).toBe("Face Yoga");
    expect(programLabel("PRANAYAMA")).toBe("Pranayama");
    expect(programLabel("BUNDLE")).toBe("Face Yoga and Pranayama");
  });
});

describe("isMmMessageTemplate", () => {
  it("marks the new notices and leaves older templates alone", () => {
    expect(isMmMessageTemplate("mm_join_pranayama_8am")).toBe(true);
    expect(isMmMessageTemplate("mm_welcome_face_yoga_email")).toBe(true);
    expect(isMmMessageTemplate("payment_success")).toBe(false);
  });
});

describe("bulk class email", () => {
  it("groups a class notice and removes the personal greeting", () => {
    const body =
      "<p>Namaste Priya,</p><p>Due to unforeseen personal reasons, the live Face Yoga session on 2 October 2026 at 10:00 PM will not be held.</p><!-- mm_no_live_session:cmtltykr60003if04ntez2vcu -->";
    expect(isBulkClassEmail("mm_no_live_session_email")).toBe(true);
    expect(isBulkClassEmail("mm_join_face_yoga_9pm_email")).toBe(true);
    expect(isBulkClassEmail("payment_success")).toBe(false);
    expect(classNoticeEmailKey(body)).toBe(
      "mm_no_live_session:cmtltykr60003if04ntez2vcu",
    );
    expect(sharedClassEmailHtml(body)).toBe(
      "<p>Namaste,</p><p>Due to unforeseen personal reasons, the live Face Yoga session on 2 October 2026 at 10:00 PM will not be held.</p>",
    );
  });
});

describe("cancellationNoticePhrases", () => {
  it("keeps the 8:00 and 9:00 notices from matching each other", () => {
    const eight = cancellationNoticePhrases({
      classType: "Pranayama",
      date: "7 October 2026",
      time: "8:00 AM",
      legacyType: "8 AM Batch",
    });
    const nineBody =
      "<p>Due to unforeseen personal reasons, the live Pranayama session on 7 October 2026 at 9:00 AM will not be held.</p>";
    expect(nineBody.includes(eight[0])).toBe(false);
    expect(nineBody.includes("live Pranayama session on 7 October 2026 at 9:00 AM")).toBe(
      true,
    );
  });
});

describe("cancellation schedule", () => {
  it("formats the class date and time in India", () => {
    const startsAt = new Date("2026-10-02T16:30:00.000Z");
    expect(formatInDate(startsAt)).toBe("2 October 2026");
    expect(formatInTime(startsAt)).toBe("10:00 PM");
  });
});

describe("firstName", () => {
  it("uses the first word or there", () => {
    expect(firstName("Priya Sharma")).toBe("Priya");
    expect(firstName("  ")).toBe("there");
    expect(firstName(null)).toBe("there");
  });
});
