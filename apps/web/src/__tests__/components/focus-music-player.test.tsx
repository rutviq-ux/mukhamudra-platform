// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FocusMusicPlayer } from "@/components/focus-music-player";

const playMock = vi.fn().mockResolvedValue(undefined);
const pauseMock = vi.fn();

Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: playMock,
});
Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: pauseMock,
});

describe("FocusMusicPlayer", () => {
  it("opens and toggles play", async () => {
    render(<FocusMusicPlayer />);

    const openButton = screen.getByLabelText("Open focus music player");
    await userEvent.click(openButton);

    const playButton = screen.getByLabelText("Play");
    await userEvent.click(playButton);

    expect(screen.getByLabelText("Pause")).toBeInTheDocument();
    expect(playMock).toHaveBeenCalled();
  });
});
