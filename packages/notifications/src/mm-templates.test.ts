import { describe, expect, it } from "vitest";
import {
  firstName,
  joinTemplateForStartTime,
  meetCodeFromJoinUrl,
  programLabel,
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
});

describe("programLabel", () => {
  it("names the three programs", () => {
    expect(programLabel("FACE_YOGA")).toBe("Face Yoga");
    expect(programLabel("PRANAYAMA")).toBe("Pranayama");
    expect(programLabel("BUNDLE")).toBe("Face Yoga and Pranayama");
  });
});

describe("firstName", () => {
  it("uses the first word or there", () => {
    expect(firstName("Priya Sharma")).toBe("Priya");
    expect(firstName("  ")).toBe("there");
    expect(firstName(null)).toBe("there");
  });
});
