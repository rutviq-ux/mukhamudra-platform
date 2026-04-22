// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AttendanceToggle } from "../../../app/coach/attendance-toggle";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("AttendanceToggle", () => {
  it("sends attendance update", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AttendanceToggle
        sessionId="session_1"
        userId="user_1"
        initiallyChecked={false}
      />
    );

    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/coach/attendance",
      expect.objectContaining({ method: "POST" })
    );
  });
});
