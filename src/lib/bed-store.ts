"use client";
import { useState, useCallback } from "react";

export interface Preset {
  id: string;
  name: string;
  icon: string;
  headAngle: number;
  footAngle: number;
}

export const DEFAULT_PRESETS: Preset[] = [
  { id: "flat", name: "Nằm phẳng", icon: "🛏️", headAngle: 0, footAngle: 0 },
  { id: "read", name: "Đọc sách", icon: "📖", headAngle: 45, footAngle: 15 },
  { id: "tv", name: "Xem TV", icon: "📺", headAngle: 35, footAngle: 15 },
  { id: "situp", name: "Ngồi dậy", icon: "🧘", headAngle: 45, footAngle: 0 },
  { id: "snore", name: "Chống ngáy", icon: "😴", headAngle: 12, footAngle: 0 },
  { id: "zero_g", name: "Không trọng lực", icon: "🚀", headAngle: 26, footAngle: 26 },
];

export interface BedState {
  headAngle: number;
  footAngle: number;
  ledOn: boolean;
  ledColor: string;
  ledBrightness: number;
  massageOn: boolean;
  massageLevel: 0 | 1 | 2 | 3;
  connected: boolean;
  activePreset: string | null;
  timerMinutes: number;
  timerActive: boolean;
}

export const INITIAL_STATE: BedState = {
  headAngle: 0,
  footAngle: 0,
  ledOn: false,
  ledColor: "#C9A84C",
  ledBrightness: 80,
  massageOn: false,
  massageLevel: 0,
  connected: false,
  activePreset: "flat",
  timerMinutes: 30,
  timerActive: false,
};

export function useBedStore() {
  const [state, setState] = useState<BedState>(INITIAL_STATE);

  const setHeadAngle = useCallback((v: number) => {
    setState((s) => ({ ...s, headAngle: Math.max(0, Math.min(70, v)), activePreset: null }));
  }, []);

  const setFootAngle = useCallback((v: number) => {
    setState((s) => ({ ...s, footAngle: Math.max(0, Math.min(45, v)), activePreset: null }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setState((s) => ({
      ...s,
      headAngle: preset.headAngle,
      footAngle: preset.footAngle,
      activePreset: preset.id,
    }));
  }, []);

  const resetFlat = useCallback(() => {
    setState((s) => ({ ...s, headAngle: 0, footAngle: 0, activePreset: "flat" }));
  }, []);

  const toggleLed = useCallback(() => {
    setState((s) => ({ ...s, ledOn: !s.ledOn }));
  }, []);

  const setLedColor = useCallback((color: string) => {
    setState((s) => ({ ...s, ledColor: color, ledOn: true }));
  }, []);

  const setLedBrightness = useCallback((v: number) => {
    setState((s) => ({ ...s, ledBrightness: v }));
  }, []);

  const toggleMassage = useCallback(() => {
    setState((s) => ({ ...s, massageOn: !s.massageOn, massageLevel: s.massageOn ? 0 : 1 }));
  }, []);

  const setMassageLevel = useCallback((level: 0 | 1 | 2 | 3) => {
    setState((s) => ({ ...s, massageLevel: level, massageOn: level > 0 }));
  }, []);

  const toggleConnect = useCallback(() => {
    setState((s) => ({ ...s, connected: !s.connected }));
  }, []);

  const toggleTimer = useCallback(() => {
    setState((s) => ({ ...s, timerActive: !s.timerActive }));
  }, []);

  const setTimerMinutes = useCallback((v: number) => {
    setState((s) => ({ ...s, timerMinutes: v }));
  }, []);

  return {
    state,
    setHeadAngle,
    setFootAngle,
    applyPreset,
    resetFlat,
    toggleLed,
    setLedColor,
    setLedBrightness,
    toggleMassage,
    setMassageLevel,
    toggleConnect,
    toggleTimer,
    setTimerMinutes,
  };
}
