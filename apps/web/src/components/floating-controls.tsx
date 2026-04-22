"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { FocusMusicPlayer } from "./focus-music-player";

const HIDDEN_ON = ["/face-yoga", "/pranayama"];

export function FloatingControls() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2">
      <ThemeToggle />
      <FocusMusicPlayer />
    </div>
  );
}
