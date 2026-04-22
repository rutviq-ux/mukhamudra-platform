"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Music, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@ru/ui";

// Focus music player - OFF by default, respects user preference
export function FocusMusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [ducked, setDucked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const savedVolume = localStorage.getItem("focusMusicVolume");
    const savedPlaying = localStorage.getItem("focusMusicPlaying");
    
    if (savedVolume) setVolume(parseFloat(savedVolume));
    // Don't auto-play - respect "OFF by default" requirement
    // if (savedPlaying === "true") setIsPlaying(true);
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("focusMusicVolume", volume.toString());
    localStorage.setItem("focusMusicPlaying", isPlaying.toString());
  }, [volume, isPlaying]);

  // Handle audio
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying && !ducked) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else if (ducked) {
      audioRef.current.volume = isMuted ? 0 : volume * 0.2;
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, volume, isMuted, ducked]);

  // Listen for duck events (checkout, join class)
  useEffect(() => {
    const handleDuck = () => setDucked(true);
    const handleUnduck = () => setDucked(false);
    
    window.addEventListener("focus-music-duck", handleDuck);
    window.addEventListener("focus-music-unduck", handleUnduck);
    
    return () => {
      window.removeEventListener("focus-music-duck", handleDuck);
      window.removeEventListener("focus-music-unduck", handleUnduck);
    };
  }, []);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <>
      {/* Hidden audio element with placeholder music */}
      <audio
        ref={audioRef}
        loop
        src="/audio/focus-ambient.mp3"
        preload="none"
      />

      {/* Music player controls */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div
              key="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="bg-[var(--color-surface)] border border-border rounded-full transition-colors duration-500"
                aria-label="Open focus music player"
              >
                <Music className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="void-card p-3 min-w-[200px]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isPlaying ? "accent" : "ghost"}
                    size="icon"
                    onClick={togglePlay}
                    className="h-8 w-8"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <span className="text-xs">❚❚</span>
                    ) : (
                      <span className="text-xs">▶</span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="h-8 w-8"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-border rounded-full accent-primary"
                  aria-label="Volume"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                  aria-label="Close"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Focus Music
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// Helper to duck/unduck from other components
export function duckFocusMusic() {
  window.dispatchEvent(new CustomEvent("focus-music-duck"));
}

export function unduckFocusMusic() {
  window.dispatchEvent(new CustomEvent("focus-music-unduck"));
}
