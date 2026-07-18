"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_BED_DEVICE_PROFILE_ID, getBedDeviceProfile, type BedZone } from "./bed-device-profiles";
import type { BedTransport, SmartBedTelemetry } from "./smart-bed-device";

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

export interface BedUserProfile {
  id: string;
  name: string;
  zone: BedZone;
  preferredPresetId: string;
  maxHeadAngle: number;
  maxFootAngle: number;
}

export interface BedSafetySettings {
  maxHeadAngle: number;
  maxFootAngle: number;
  obstructionAlerts: boolean;
  overloadAlerts: boolean;
  caregiverAlerts: boolean;
  holdToMove: boolean;
}

export interface BedSleepSettings {
  antiSnoreEnabled: boolean;
  antiSnoreRaiseDegrees: number;
  outOfBedAlerts: boolean;
  smartAlarmEnabled: boolean;
  smartAlarmWindowMinutes: number;
  healthSyncEnabled: boolean;
}

export interface BedSleepSession {
  id: string;
  date: string;
  durationMinutes: number;
  score: number;
  movements: number;
  snoreMinutes: number;
  outOfBedEvents: number;
  source: "sensor" | "simulator";
}

export interface BedRoutine {
  enabled: boolean;
  bedtime: string;
  wakeTime: string;
  sleepPresetId: string;
  wakePresetId: string;
  ledAtBedtime: boolean;
  days: number[];
  gradualWakeMinutes: number;
  massageAtBedtime: boolean;
  massageMinutes: number;
  ledAtWake: boolean;
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
  deviceId: string;
  firmware: string;
  connectionTransport: BedTransport | null;
  deviceProfileId: string;
  activeZone: BedZone;
  batteryLevel: number;
  temperature: number | null;
  childLock: boolean;
  activePreset: string | null;
  customPresets: Preset[];
  timerMinutes: number;
  timerEndsAt: number | null;
  routine: BedRoutine;
  profiles: BedUserProfile[];
  activeUserProfileId: string;
  safety: BedSafetySettings;
  sleepSettings: BedSleepSettings;
  sleepSessions: BedSleepSession[];
  sensorStatus: "unavailable" | "ready" | "active";
  obstructionDetected: boolean;
  overloadDetected: boolean;
  occupancyDetected: boolean | null;
  connectionQuality: number | null;
  motorCycles: number;
  lastDeviceError: string;
  lastCommand: string;
  lastSyncedAt: number | null;
}

export const INITIAL_STATE: BedState = {
  headAngle: 45,
  footAngle: 30,
  ledOn: false,
  ledColor: "#D7B957",
  ledBrightness: 72,
  massageOn: false,
  massageLevel: 0,
  massageMode: "wave",
  connected: false,
  deviceName: "SmartFurni Bed",
  deviceId: "",
  firmware: "",
  connectionTransport: null,
  deviceProfileId: DEFAULT_BED_DEVICE_PROFILE_ID,
  activeZone: "all",
  batteryLevel: 86,
  temperature: null,
  childLock: false,
  activePreset: null,
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
    days: [1, 2, 3, 4, 5, 6, 0],
    gradualWakeMinutes: 15,
    massageAtBedtime: false,
    massageMinutes: 15,
    ledAtWake: true,
  },
  profiles: [
    { id: "owner", name: "Tôi", zone: "all", preferredPresetId: "zero_g", maxHeadAngle: 70, maxFootAngle: 45 },
  ],
  activeUserProfileId: "owner",
  safety: {
    maxHeadAngle: 70,
    maxFootAngle: 45,
    obstructionAlerts: true,
    overloadAlerts: true,
    caregiverAlerts: false,
    holdToMove: false,
  },
  sleepSettings: {
    antiSnoreEnabled: false,
    antiSnoreRaiseDegrees: 8,
    outOfBedAlerts: false,
    smartAlarmEnabled: false,
    smartAlarmWindowMinutes: 20,
    healthSyncEnabled: false,
  },
  sleepSessions: [],
  sensorStatus: "unavailable",
  obstructionDetected: false,
  overloadDetected: false,
  occupancyDetected: null,
  connectionQuality: null,
  motorCycles: 0,
  lastDeviceError: "",
  lastCommand: "Tư thế demo mặc định · Đầu 45° · Chân 30°",
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
      connectionTransport: null,
      activeZone: stored.activeZone === "left" || stored.activeZone === "right" ? stored.activeZone : "all",
      timerEndsAt: stored.timerEndsAt && stored.timerEndsAt > Date.now() ? stored.timerEndsAt : null,
      routine: { ...INITIAL_STATE.routine, ...stored.routine },
      profiles: Array.isArray(stored.profiles) && stored.profiles.length ? stored.profiles.slice(0, 6) : INITIAL_STATE.profiles,
      safety: { ...INITIAL_STATE.safety, ...stored.safety },
      sleepSettings: { ...INITIAL_STATE.sleepSettings, ...stored.sleepSettings },
      sleepSessions: Array.isArray(stored.sleepSessions) ? stored.sleepSessions.slice(0, 30) : [],
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

      if (!state.routine.days.includes(date.getDay())) return;
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
        massageOn: currentTime === current.routine.bedtime ? current.routine.massageAtBedtime : current.massageOn,
        massageLevel: currentTime === current.routine.bedtime && current.routine.massageAtBedtime ? 1 : current.massageLevel,
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
      headAngle: clamp(value, 0, Math.min(getBedDeviceProfile(current.deviceProfileId).capabilities.maxHeadAngle, current.safety.maxHeadAngle)),
      activePreset: null,
      lastCommand: `Đầu giường ${clamp(value, 0, Math.min(getBedDeviceProfile(current.deviceProfileId).capabilities.maxHeadAngle, current.safety.maxHeadAngle))}°`,
    });
  }, [update]);

  const setFootAngle = useCallback((value: number) => {
    update((current) => current.childLock ? current : {
      ...current,
      footAngle: clamp(value, 0, Math.min(getBedDeviceProfile(current.deviceProfileId).capabilities.maxFootAngle, current.safety.maxFootAngle)),
      activePreset: null,
      lastCommand: `Chân giường ${clamp(value, 0, Math.min(getBedDeviceProfile(current.deviceProfileId).capabilities.maxFootAngle, current.safety.maxFootAngle))}°`,
    });
  }, [update]);

  const applyPreset = useCallback((preset: Preset) => {
    update((current) => current.childLock ? current : {
      ...current,
      headAngle: clamp(preset.headAngle, 0, current.safety.maxHeadAngle),
      footAngle: clamp(preset.footAngle, 0, current.safety.maxFootAngle),
      activePreset: preset.id,
      motorCycles: current.motorCycles + 1,
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

  const connectDevice = useCallback((details?: { deviceName?: string; deviceId?: string; transport?: BedTransport; firmware?: string }) => {
    setState((current) => ({
      ...current,
      connected: true,
      deviceName: details?.deviceName || current.deviceName,
      deviceId: details?.deviceId || current.deviceId,
      connectionTransport: details?.transport || current.connectionTransport,
      firmware: details?.firmware || current.firmware,
      lastSyncedAt: Date.now(),
      lastCommand: "Đã kết nối bộ điều khiển",
    }));
  }, []);

  const disconnectDevice = useCallback(() => {
    setState((current) => ({ ...current, connected: false, connectionTransport: null, lastCommand: "Đã ngắt kết nối thiết bị" }));
  }, []);

  const selectDeviceProfile = useCallback((profileId: string) => {
    const profile = getBedDeviceProfile(profileId);
    update((current) => ({
      ...current,
      deviceProfileId: profile.id,
      activeZone: profile.capabilities.dualZone ? current.activeZone : "all",
      headAngle: clamp(current.headAngle, 0, profile.capabilities.maxHeadAngle),
      footAngle: profile.capabilities.foot ? clamp(current.footAngle, 0, profile.capabilities.maxFootAngle) : 0,
      ledOn: profile.capabilities.led ? current.ledOn : false,
      massageOn: profile.capabilities.massage ? current.massageOn : false,
      massageLevel: profile.capabilities.massage ? current.massageLevel : 0,
      lastCommand: `Đã chọn ${profile.shortName}`,
    }));
  }, [update]);

  const setActiveZone = useCallback((zone: BedZone) => {
    update((current) => ({ ...current, activeZone: zone, lastCommand: zone === "all" ? "Điều khiển toàn bộ" : zone === "left" ? "Điều khiển bên trái" : "Điều khiển bên phải" }));
  }, [update]);

  const applyDeviceTelemetry = useCallback((telemetry: SmartBedTelemetry) => {
    setState((current) => ({
      ...current,
      connected: telemetry.online ?? current.connected,
      deviceId: telemetry.deviceId || current.deviceId,
      deviceName: telemetry.deviceName || current.deviceName,
      firmware: telemetry.firmware || current.firmware,
      batteryLevel: typeof telemetry.batteryLevel === "number" ? clamp(telemetry.batteryLevel, 0, 100) : current.batteryLevel,
      temperature: typeof telemetry.temperature === "number" ? telemetry.temperature : current.temperature,
      headAngle: typeof telemetry.headAngle === "number" ? clamp(telemetry.headAngle, 0, getBedDeviceProfile(current.deviceProfileId).capabilities.maxHeadAngle) : current.headAngle,
      footAngle: typeof telemetry.footAngle === "number" ? clamp(telemetry.footAngle, 0, getBedDeviceProfile(current.deviceProfileId).capabilities.maxFootAngle) : current.footAngle,
      ledOn: telemetry.ledOn ?? current.ledOn,
      ledColor: telemetry.ledColor || current.ledColor,
      ledBrightness: typeof telemetry.ledBrightness === "number" ? clamp(telemetry.ledBrightness, 10, 100) : current.ledBrightness,
      massageLevel: typeof telemetry.massageLevel === "number" ? clamp(telemetry.massageLevel, 0, 3) as MassageLevel : current.massageLevel,
      massageOn: typeof telemetry.massageLevel === "number" ? telemetry.massageLevel > 0 : current.massageOn,
      obstructionDetected: telemetry.obstructionDetected ?? current.obstructionDetected,
      overloadDetected: telemetry.overloadDetected ?? current.overloadDetected,
      occupancyDetected: telemetry.occupancyDetected ?? current.occupancyDetected,
      sensorStatus: telemetry.sensorStatus ?? current.sensorStatus,
      connectionQuality: typeof telemetry.connectionQuality === "number" ? clamp(telemetry.connectionQuality, 0, 100) : current.connectionQuality,
      motorCycles: typeof telemetry.motorCycles === "number" ? Math.max(0, Math.round(telemetry.motorCycles)) : current.motorCycles,
      lastDeviceError: telemetry.errorCode || current.lastDeviceError,
      lastSyncedAt: Date.now(),
    }));
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

  const updateSafety = useCallback((safety: Partial<BedSafetySettings>) => {
    update((current) => {
      const nextSafety = { ...current.safety, ...safety };
      return {
        ...current,
        safety: nextSafety,
        headAngle: clamp(current.headAngle, 0, nextSafety.maxHeadAngle),
        footAngle: clamp(current.footAngle, 0, nextSafety.maxFootAngle),
        lastCommand: "Đã cập nhật giới hạn an toàn",
      };
    });
  }, [update]);

  const updateSleepSettings = useCallback((settings: Partial<BedSleepSettings>) => {
    update((current) => ({ ...current, sleepSettings: { ...current.sleepSettings, ...settings }, lastCommand: "Đã cập nhật chăm sóc giấc ngủ" }));
  }, [update]);

  const addProfile = useCallback((name: string) => {
    const cleanName = name.trim().slice(0, 30);
    if (!cleanName) return false;
    update((current) => {
      if (current.profiles.length >= 6) return current;
      const id = `profile-${Date.now()}`;
      return {
        ...current,
        profiles: [...current.profiles, { id, name: cleanName, zone: "all", preferredPresetId: "zero_g", maxHeadAngle: current.safety.maxHeadAngle, maxFootAngle: current.safety.maxFootAngle }],
        activeUserProfileId: id,
        lastCommand: `Đã tạo hồ sơ · ${cleanName}`,
      };
    });
    return true;
  }, [update]);

  const activateProfile = useCallback((profileId: string) => {
    update((current) => {
      const profile = current.profiles.find((item) => item.id === profileId);
      if (!profile) return current;
      return {
        ...current,
        activeUserProfileId: profileId,
        activeZone: profile.zone,
        safety: { ...current.safety, maxHeadAngle: profile.maxHeadAngle, maxFootAngle: profile.maxFootAngle },
        lastCommand: `Đã chọn hồ sơ · ${profile.name}`,
      };
    });
  }, [update]);

  const addSimulatorSleepSession = useCallback(() => {
    const date = new Date();
    const seed = date.getDate() + state.sleepSessions.length;
    const session: BedSleepSession = {
      id: `sleep-${Date.now()}`,
      date: date.toISOString(),
      durationMinutes: 420 + (seed % 40),
      score: 78 + (seed % 14),
      movements: 14 + (seed % 8),
      snoreMinutes: 8 + (seed % 9),
      outOfBedEvents: seed % 3,
      source: "simulator",
    };
    update((current) => ({ ...current, sleepSessions: [session, ...current.sleepSessions].slice(0, 30), lastCommand: "Đã tạo báo cáo mô phỏng" }));
  }, [state.sleepSessions.length, update]);

  const hydrateCloudPreferences = useCallback((incoming: Partial<BedState>) => {
    setState((current) => ({
      ...current,
      routine: { ...current.routine, ...(incoming.routine || {}) },
      profiles: Array.isArray(incoming.profiles) && incoming.profiles.length ? incoming.profiles.slice(0, 6) : current.profiles,
      activeUserProfileId: incoming.activeUserProfileId || current.activeUserProfileId,
      safety: { ...current.safety, ...(incoming.safety || {}) },
      sleepSettings: { ...current.sleepSettings, ...(incoming.sleepSettings || {}) },
      sleepSessions: Array.isArray(incoming.sleepSessions) ? incoming.sleepSessions.slice(0, 30) : current.sleepSessions,
      customPresets: Array.isArray(incoming.customPresets) ? incoming.customPresets.slice(0, 6) : current.customPresets,
    }));
  }, []);

  const cloudPreferences = useMemo(() => ({
    routine: state.routine,
    profiles: state.profiles,
    activeUserProfileId: state.activeUserProfileId,
    safety: state.safety,
    sleepSettings: state.sleepSettings,
    sleepSessions: state.sleepSessions,
    customPresets: state.customPresets,
  }), [state.routine, state.profiles, state.activeUserProfileId, state.safety, state.sleepSettings, state.sleepSessions, state.customPresets]);

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
    selectDeviceProfile,
    setActiveZone,
    applyDeviceTelemetry,
    toggleChildLock,
    setTimerMinutes,
    startTimer,
    cancelTimer,
    saveCurrentPreset,
    deleteCustomPreset,
    updateRoutine,
    updateSafety,
    updateSleepSettings,
    addProfile,
    activateProfile,
    addSimulatorSleepSession,
    hydrateCloudPreferences,
    cloudPreferences,
  };
}
