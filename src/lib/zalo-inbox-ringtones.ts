export const ZALO_RINGTONE_IDS = [
  "signature",
  "zalo-soft",
  "crystal",
  "double-chime",
  "wood",
  "priority",
] as const;

export type ZaloRingtoneId = (typeof ZALO_RINGTONE_IDS)[number];

export interface ZaloRingtoneDefinition {
  id: ZaloRingtoneId;
  name: string;
  description: string;
  accent: string;
}

export interface ZaloSoundPreferences {
  soundEnabled: boolean;
  ringtoneId: ZaloRingtoneId;
  volume: number;
}

export const DEFAULT_ZALO_SOUND_PREFERENCES: ZaloSoundPreferences = {
  soundEnabled: true,
  ringtoneId: "signature",
  volume: 55,
};

export const ZALO_RINGTONES: ZaloRingtoneDefinition[] = [
  { id: "signature", name: "SmartFurni", description: "Gọn, rõ và cân bằng", accent: "#2563EB" },
  { id: "zalo-soft", name: "Zalo nhẹ", description: "Hai nốt êm, dễ nghe", accent: "#0EA5E9" },
  { id: "crystal", name: "Pha lê", description: "Trong trẻo, hiện đại", accent: "#8B5CF6" },
  { id: "double-chime", name: "Nhịp đôi", description: "Ngắn, nhận biết nhanh", accent: "#10B981" },
  { id: "wood", name: "Chuông gỗ", description: "Trầm, ít gây giật mình", accent: "#B7791F" },
  { id: "priority", name: "Ưu tiên", description: "Nổi bật cho môi trường ồn", accent: "#E11D48" },
];

export function isZaloRingtoneId(value: unknown): value is ZaloRingtoneId {
  return typeof value === "string" && (ZALO_RINGTONE_IDS as readonly string[]).includes(value);
}

export function clampZaloSoundVolume(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_ZALO_SOUND_PREFERENCES.volume;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

type Tone = {
  frequency: number;
  endFrequency?: number;
  duration: number;
  delay: number;
  type?: OscillatorType;
};

const TONES: Record<ZaloRingtoneId, Tone[]> = {
  signature: [
    { frequency: 880, endFrequency: 660, duration: 0.28, delay: 0, type: "sine" },
  ],
  "zalo-soft": [
    { frequency: 659, duration: 0.16, delay: 0, type: "sine" },
    { frequency: 784, duration: 0.22, delay: 0.13, type: "sine" },
  ],
  crystal: [
    { frequency: 1047, duration: 0.18, delay: 0, type: "sine" },
    { frequency: 1319, duration: 0.24, delay: 0.11, type: "sine" },
    { frequency: 1568, duration: 0.3, delay: 0.23, type: "sine" },
  ],
  "double-chime": [
    { frequency: 880, duration: 0.13, delay: 0, type: "sine" },
    { frequency: 880, duration: 0.17, delay: 0.19, type: "sine" },
  ],
  wood: [
    { frequency: 523, endFrequency: 440, duration: 0.22, delay: 0, type: "triangle" },
    { frequency: 392, endFrequency: 349, duration: 0.28, delay: 0.16, type: "triangle" },
  ],
  priority: [
    { frequency: 784, duration: 0.16, delay: 0, type: "triangle" },
    { frequency: 988, duration: 0.16, delay: 0.16, type: "triangle" },
    { frequency: 1319, duration: 0.28, delay: 0.32, type: "triangle" },
  ],
};

/**
 * Tạo chuông ngay trên trình duyệt bằng Web Audio. Không tải hoặc lưu file âm
 * thanh nên các lần phát không làm tăng dung lượng Railway.
 */
export async function playZaloRingtone(
  context: AudioContext,
  ringtoneId: ZaloRingtoneId,
  volume: number,
): Promise<void> {
  if (context.state === "suspended") await context.resume();
  const normalizedVolume = clampZaloSoundVolume(volume) / 100;
  const master = context.createGain();
  master.gain.setValueAtTime(Math.max(0.0001, normalizedVolume * 0.36), context.currentTime);
  master.connect(context.destination);

  const tones = TONES[ringtoneId] || TONES.signature;
  let latestStop = context.currentTime;
  for (const tone of tones) {
    const start = context.currentTime + tone.delay;
    const stop = start + tone.duration;
    latestStop = Math.max(latestStop, stop);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = tone.type || "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    if (tone.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, stop);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(1, start + Math.min(0.018, tone.duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, stop);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(stop + 0.02);
  }

  window.setTimeout(() => master.disconnect(), Math.max(100, (latestStop - context.currentTime + 0.1) * 1000));
}
