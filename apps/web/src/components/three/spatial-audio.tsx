"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { PositionalAudio } from "@react-three/drei";
import * as THREE from "three";

interface SpatialAudioSourceProps {
  url: string;
  position?: [number, number, number];
  distance?: number;
  volume?: number;
  autoplay?: boolean;
}

/**
 * Spatial audio source within the R3F scene.
 * Audio position in 3D space creates immersive spatial effect.
 * Requires user interaction to start (browser autoplay policy).
 */
export function SpatialAudioSource({
  url,
  position = [0, 0, 0],
  distance = 5,
  volume = 0.3,
  autoplay = false,
}: SpatialAudioSourceProps) {
  const audioRef = useRef<THREE.PositionalAudio>(null);
  const hasInteracted = useRef(false);

  useEffect(() => {
    function onInteract() {
      hasInteracted.current = true;
      if (audioRef.current && autoplay && !audioRef.current.isPlaying) {
        audioRef.current.play();
      }
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
    }

    window.addEventListener("click", onInteract, { once: true });
    window.addEventListener("touchstart", onInteract, { once: true });

    return () => {
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
      if (audioRef.current?.isPlaying) {
        audioRef.current.stop();
      }
    };
  }, [autoplay]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setRefDistance(distance);
      audioRef.current.setVolume(volume);
    }
  }, [distance, volume]);

  return (
    <group position={position}>
      <PositionalAudio ref={audioRef} url={url} loop distance={distance} />
    </group>
  );
}

/**
 * Audio listener that follows the camera.
 * Only one listener should exist per scene.
 */
export function AudioListener() {
  const { camera } = useThree();
  const listenerRef = useRef<THREE.AudioListener | null>(null);

  useEffect(() => {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    listenerRef.current = listener;

    return () => {
      camera.remove(listener);
    };
  }, [camera]);

  return null;
}
