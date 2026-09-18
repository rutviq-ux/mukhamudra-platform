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
});
