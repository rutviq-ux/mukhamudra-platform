"use client";

import { useState, useEffect } from "react";
import * as THREE from "three";

export type ThemeMode = "dark" | "light";

export const THEME_COLORS = {
  dark: {
    background: new THREE.Color("#081C17"),
    ambient: new THREE.Color("#0A1512"),
    primary: new THREE.Color("#2E9E86"),
    accent: new THREE.Color("#C4883A"),
    particle1: new THREE.Color("#F0E8D8"),
    particle2: new THREE.Color("#C4883A"),
    particle3: new THREE.Color("#2E9E86"),
    particle4: new THREE.Color("#F0E8D8"),
    emissive: new THREE.Color("#2E9E86"),
    surface: new THREE.Color("#F0E8D8"),
    vermillion: new THREE.Color("#C8302C"),
    ambientIntensity: 0.25,
    directionalIntensity: 0.2,
  },
  light: {
    background: new THREE.Color("#081C17"),
    ambient: new THREE.Color("#0A1512"),
    primary: new THREE.Color("#268A74"),
    accent: new THREE.Color("#C4883A"),
    particle1: new THREE.Color("#1A1208"),
    particle2: new THREE.Color("#C4883A"),
    particle3: new THREE.Color("#268A74"),
    particle4: new THREE.Color("#6B6155"),
    emissive: new THREE.Color("#268A74"),
    surface: new THREE.Color("#1A1208"),
    vermillion: new THREE.Color("#C8302C"),
    ambientIntensity: 0.25,
    directionalIntensity: 0.2,
  },
} as const;

function getCurrentTheme(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(getCurrentTheme);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      setTheme(detail);
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  return {
    theme,
    colors: THEME_COLORS[theme],
  };
}
