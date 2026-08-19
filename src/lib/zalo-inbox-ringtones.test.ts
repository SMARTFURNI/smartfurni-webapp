import { describe, expect, it } from "vitest";
import {
  DEFAULT_ZALO_SOUND_PREFERENCES,
  ZALO_RINGTONES,
  clampZaloSoundVolume,
  isZaloRingtoneId,
} from "./zalo-inbox-ringtones";

describe("Zalo Inbox ringtone preferences", () => {
  it("provides distinct selectable ringtone presets", () => {
    expect(ZALO_RINGTONES).toHaveLength(6);
    expect(new Set(ZALO_RINGTONES.map(item => item.id)).size).toBe(ZALO_RINGTONES.length);
    expect(isZaloRingtoneId(DEFAULT_ZALO_SOUND_PREFERENCES.ringtoneId)).toBe(true);
  });

  it("rejects unknown ringtone identifiers", () => {
    expect(isZaloRingtoneId("signature")).toBe(true);
    expect(isZaloRingtoneId("unknown-sound")).toBe(false);
    expect(isZaloRingtoneId(null)).toBe(false);
  });

  it("keeps saved volume within the supported range", () => {
    expect(clampZaloSoundVolume(-20)).toBe(0);
    expect(clampZaloSoundVolume(65.4)).toBe(65);
    expect(clampZaloSoundVolume(140)).toBe(100);
    expect(clampZaloSoundVolume("invalid")).toBe(DEFAULT_ZALO_SOUND_PREFERENCES.volume);
  });
});
