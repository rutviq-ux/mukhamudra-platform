import { describe, expect, it } from "vitest";
import { sheetRowNumbersForJoinUrlRecipients } from "@ru/google-workspace";
import { sessionJoinProductTypes } from "@/lib/sync-session-join-url";

describe("sessionJoinProductTypes", () => {
  it("includes bundle members on a pranayama session", () => {
    expect(sessionJoinProductTypes("PRANAYAMA")).toEqual([
      "PRANAYAMA",
      "BUNDLE",
    ]);
  });

  it("includes bundle members on a face yoga session", () => {
    expect(sessionJoinProductTypes("FACE_YOGA")).toEqual([
      "FACE_YOGA",
      "BUNDLE",
    ]);
  });
});

describe("sheetRowNumbersForJoinUrlRecipients", () => {
  it("matches new rows that only have a User Id and no Join URL cell", () => {
    const idCells = [
      ["user_old"],
      ["user_mid"],
      ["user_new_1"],
      ["user_new_2"],
    ];

    expect(
      sheetRowNumbersForJoinUrlRecipients(idCells, [], [
        "user_new_1",
        "user_new_2",
      ]),
    ).toEqual([4, 5]);
  });

  it("matches bundle rows by email when User Id lookup misses", () => {
    const idCells = [["other_id"], [""], ["bundle_user"]];
    const emailCells = [
      ["a@example.com"],
      ["bundle@example.com"],
      ["c@example.com"],
    ];

    expect(
      sheetRowNumbersForJoinUrlRecipients(
        idCells,
        emailCells,
        [],
        ["BUNDLE@example.com"],
      ),
    ).toEqual([3]);
  });

  it("does not overwrite a different Meet URL unless overwrite is requested", () => {
    const idCells = [["user_9pm"], ["user_10pm"]];
    const existingJoinUrls = [
      ["https://meet.google.com/aaa-bbbb-ccc"],
      [""],
    ];

    expect(
      sheetRowNumbersForJoinUrlRecipients(
        idCells,
        [],
        ["user_9pm", "user_10pm"],
        [],
        existingJoinUrls,
        "https://meet.google.com/xxx-yyyy-zzz",
      ),
    ).toEqual([3]);
  });

  it("replaces stale Meet URLs for every class when overwrite is on", () => {
    const idCells = [["user_8am"], ["user_empty"], ["user_9am"]];
    const existingJoinUrls = [
      ["https://meet.google.com/kam-bxu-esm"],
      [""],
      ["https://meet.google.com/hjd-ekoo-smx"],
    ];

    expect(
      sheetRowNumbersForJoinUrlRecipients(
        idCells,
        [],
        ["user_8am", "user_empty", "user_9am"],
        [],
        existingJoinUrls,
        "https://meet.google.com/hjd-ekoo-smx",
        true,
      ),
    ).toEqual([2, 3]);
  });

  it("does not rewrite a row whose Join URL is already this Meet", () => {
    const idCells = [["user_9pm"]];
    const existingJoinUrls = [["https://meet.google.com/aaa-bbbb-ccc"]];

    expect(
      sheetRowNumbersForJoinUrlRecipients(
        idCells,
        [],
        ["user_9pm"],
        [],
        existingJoinUrls,
        "https://meet.google.com/aaa-bbbb-ccc",
      ),
    ).toEqual([]);
  });
});
