"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface Preset {
  id: string;
  name: string;
  icon: string;
  headAngle: number;
  footAngle: number;
  custom?: boolean;
}

export const DEFAULT_PRESETS: Preset[] = [
  { id: "flat", name: "Nằm phẳng", icon: "flat", headAngle: 0, footAngle: 0 },
  { id: "read", name: "Đọc sách", icon: "read", headAngle: 45, footAngle: 15 },
  { id: "tv", name: "Xem TV", icon: "tv", headAngle: 35, footAngle: 15 },
  { id: "situp", name: "Ngồi dậy", icon: "sit", headAngle: 55, footAngle: 0 },
  { id: "snore", name: "Chống ngáy", icon: "snore", headAngle: 12, footAngle: 0 },
  { id: "zero_g", name: "Không trọng lực", icon: "zero", headAngle: 26, footAngle: 26 },
];

export type MassageLevel = 0 | 1 | 2 | 3;
export type MassageMode = "wave" | "pulse" | "steady";

export interface BedRoutine {
  enabled: boolean;
  bedtime: string;
  wakeTime: string;
  sleepPresetId: string;
  wakePresetId: string;
  ledAtBedtime: boolean;
}

export interface BedState {
  headAngle: number;
  footAngle: number;
  ledOn: boolean;
  ledColor: string;
  ledBrightness: number;
  massageOn: boolean;
  massageLevel: MassageLevel;
  massageMode: MassageMode;
  connected: boolean;
  deviceName: string;
  batteryLevel: number;
  childLock: boolean;
  activePreset: string | null;
  customPresets: Preset[];
  timerMinutes: number;
  timerEndsAt: number | null;
  routine: BedRoutine;
  lastCommand: string;
  lastSyncedAt: number | null;
}

export const INITIAL_STATE: BedState = {
  headAngle: 0,
  footAngle: 0,
  ledOn: false,
  ledColor: "#D7B957",
  ledBrightness: 72,
  massageOn: false,
  massageLevel: 0,
  massageMode: "wave",
  connected: false,
  deviceName: "SmartFurni Bed",
  batteryLevel: 86,
  childLock: false,
  activePreset: "flat",
  customPresets: [],
  timerMinutes: 30,
  timerEndsAt: null,
  routine: {
    enabled: false,
    bedtime: "22:30",
    wakeTime: "06:30",
    sleepPresetId: "zero_g",
    wakePresetId: "read",
    ledAtBedtime: true,
  },
  lastCommand: "Sẵn sàng điều khiển",
  lastSyncedAt: null,
};

const STORAGE_KEY = "smartfurni-bed-controller-v2";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readStoredState(): BedState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const stored = JSON.parse(raw) as Partial<BedState>;
    return {
      ...INITIAL_STATE,
      ...stored,
      connected: false,
      timerEndsAt: stored.timerEndsAt && stored.timerEndsAt > Date.now() ? stored.timerEndsAt : null,
      routine: { ...INITIAL_STATE.routine, ...stored.routine },
      customPresets: Array.isArray(stored.customPresets) ? stored.customPresets.slice(0, 6) : [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function useBedStore() {
  const [state, setState] = useState<BedState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setState(readStoredState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!state.timerEndsAt) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [state.timerEndsAt]);

  useEffect(() => {
    if (!state.timerEndsAt || state.timerEndsAt > now) return;
    setState((current) => ({
      ...current,
      headAngle: 0,
      footAngle: 0,
      massageOn: false,
      massageLevel: 0,
      timerEndsAt: null,
      activePreset: "flat",
      lastCommand: "Hẹn giờ hoàn tất · giường đã về phẳng",
    }));
  }, [now, state.timerEndsAt]);

  useEffect(() => {
    if (!hydrated || !state.routine.enabled) return;
    const runRoutine = () => {
      const date = new Date();
      const currentTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      const dateKey = date.toISOString().slice(0, 10);
      const storageKey = `smartfurni-routine-${dateKey}-${currentTime}`;
      if (window.sessionStorage.getItem(storageKey)) return;

      const presetId = currentTime === state.routine.bedtime
        ? state.routine.sleepPresetId
        : currentTime === state.routine.wakeTime
          ? state.routine.wakePresetId
          : null;
      if (!presetId) return;
      const preset = [...DEFAULT_PRESETS, ...state.customPresets].find((item) => item.id === presetId);
      if (!preset) return;
      window.sessionStorage.setItem(storageKey, "1");
      setState((current) => ({
        ...current,
        headAngle: preset.headAngle,
        footAngle: preset.footAngle,
        activePreset: preset.id,
        ledOn: currentTime === current.routine.bedtime ? current.routine.ledAtBedtime : current.ledOn,
        lastCommand: currentTime === current.routine.bedtime ? "Đã chạy lịch đi ngủ" : "Đã chạy lịch thức dậy",
      }));
    };
    runRoutine();
    const tick = window.setInterval(runRoutine, 30_000);
    return () => window.clearInterval(tick);
  }, [hydrated, state.routine, state.customPresets]);

  const update = useCallback((change: (current: BedState) => BedState) => {
    setState((current) => {
      const next = change(current);
      return { ...next, lastSyncedAt: next.connected ? Date.now() : next.lastSyncedAt };
    });
  }, []);

  const setHeadAngle = useCallback((value: number) => {
    update((current) => current.childLock ? current : {
      ...current,
      headAngle: clamp(value, 0, 70),
      activePreset: null,
      lastCommand: `Đầu giường ${clamp(value, 0, 70)}°`,
    });
  }, [update]);

  const setFootAngle = useCallback((value: number) => {
    update((current) => current.childLock ? current : {
      ...current,
      footAngle: clamp(value, 0, 45),
      activePreset: null,
      lastCommand: `Chân giường ${clamp(value, 0, 45)}°`,
    });
  }, [update]);

  const applyPreset = useCallback((preset: Preset) => {
    update((current) => current.childLock ? current : {
      ...current,
      headAngle: preset.headAngle,
      footAngle: preset.footAngle,
      activePreset: preset.id,
      lastCommand: `Đã áp dụng · ${preset.name}`,
    });
  }, [update]);

  const resetFlat = useCallback(() => {
    update((current) => ({
      ...current,
      headAngle: 0,
      footAngle: 0,
      massageOn: false,
      massageLevel: 0,
      activePreset: "flat",
      lastCommand: "Dừng an toàn · giường về phẳng",
    }));
  }, [update]);

  const toggleLed = useCallback(() => {
    update((current) => ({ ...current, ledOn: !current.ledOn, lastCommand: `Đèn ngủ ${current.ledOn ? "đã tắt" : "đã bật"}` }));
  }, [update]);

  const setLedColor = useCallback((color: string) => {
    update((current) => ({ ...current, ledColor: color, ledOn: true, lastCommand: "Đã đổi màu đèn ngủ" }));
  }, [update]);

  const setLedBrightness = useCallback((value: number) => {
    update((current) => ({ ...current, ledBrightness: clamp(value, 10, 100), ledOn: true, lastCommand: `Độ sáng ${clamp(value, 10, 100)}%` }));
  }, [update]);

  const setMassageLevel = useCallback((level: MassageLevel) => {
    update((current) => ({ ...current, massageLevel: level, massageOn: level > 0, lastCommand: level > 0 ? `Massage mức ${level}` : "Đã tắt massage" }));
  }, [update]);

  const setMassageMode = useCallback((mode: MassageMode) => {
    update((current) => ({ ...current, massageMode: mode, massageOn: true, massageLevel: current.massageLevel || 1, lastCommand: "Đã đổi nhịp massage" }));
  }, [update]);

  const connectDevice = useCallback(() => {
    setState((current) => ({ ...current, connected: true, lastSyncedAt: Date.now(), lastCommand: "Đã kết nối bộ điều khiển" }));
  }, []);

  const disconnectDevice = useCallback(() => {
    setState((current) => ({ ...current, connected: false, lastCommand: "Đang dùng chế độ điều khiển cục bộ" }));
  }, []);

  const toggleChildLock = useCallback(() => {
    update((current) => ({ ...current, childLock: !current.childLock, lastCommand: current.childLock ? "Đã mở khóa điều khiển" : "Đã bật khóa trẻ em" }));
  }, [update]);

  const setTimerMinutes = useCallback((value: number) => {
    setState((current) => ({ ...current, timerMinutes: clamp(value, 5, 180) }));
  }, []);

  const startTimer = useCallback(() => {
    setNow(Date.now());
    update((current) => ({ ...current, timerEndsAt: Date.now() + current.timerMinutes * 60_000, lastCommand: `Hẹn giờ ${current.timerMinutes} phút` }));
  }, [update]);

  const cancelTimer = useCallback(() => {
    update((current) => ({ ...current, timerEndsAt: null, lastCommand: "Đã hủy hẹn giờ" }));
  }, [update]);

  const saveCurrentPreset = useCallback((name: string) => {
    const cleanName = name.trim().slice(0, 28);
    if (!cleanName) return false;
    const id = `custom-${Date.now()}`;
    update((current) => ({
      ...current,
      customPresets: [
        ...current.customPresets,
        { id, name: cleanName, icon: "custom", headAngle: current.headAngle, footAngle: current.footAngle, custom: true },
      ].slice(-6),
      activePreset: id,
      lastCommand: `Đã lưu preset · ${cleanName}`,
    }));
    return true;
  }, [update]);

  const deleteCustomPreset = useCallback((id: string) => {
    update((current) => ({
      ...current,
      customPresets: current.customPresets.filter((preset) => preset.id !== id),
      activePreset: current.activePreset === id ? null : current.activePreset,
      lastCommand: "Đã xóa preset tùy chỉnh",
    }));
  }, [update]);

  const updateRoutine = useCallback((routine: Partial<BedRoutine>) => {
    update((current) => ({ ...current, routine: { ...current.routine, ...routine }, lastCommand: "Đã cập nhật lịch tự động" }));
  }, [update]);

  const timerRemainingSeconds = useMemo(() => state.timerEndsAt ? Math.max(0, Math.ceil((state.timerEndsAt - now) / 1000)) : 0, [now, state.timerEndsAt]);
  const presets = useMemo(() => [...DEFAULT_PRESETS, ...state.customPresets], [state.customPresets]);

  return {
    state,
    hydrated,
    presets,
    timerRemainingSeconds,
    setHeadAngle,
    setFootAngle,
    applyPreset,
    resetFlat,
    toggleLed,
    setLedColor,
    setLedBrightness,
    setMassageLevel,
    setMassageMode,
    connectDevice,
    disconnectDevice,
    toggleChildLock,
    setTimerMinutes,
    startTimer,
    cancelTimer,
    saveCurrentPreset,
    deleteCustomPreset,
    updateRoutine,
  };
}
