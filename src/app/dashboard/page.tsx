"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  Armchair,
  BatteryMedium,
  BedDouble,
  Bluetooth,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gamepad2,
  Home,
  LampDesk,
  Lightbulb,
  LockKeyhole,
  MoonStar,
  Palette,
  Pause,
  Play,
  Radio,
  Router,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  SunMedium,
  TimerReset,
  Trash2,
  Tv,
  Unplug,
  Vibrate,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import BedSVG from "@/components/ui/BedSVG";
import { DEFAULT_PRESETS, type MassageLevel, type MassageMode, type Preset, useBedStore } from "@/lib/bed-store";
import { BED_DEVICE_PROFILES, getBedDeviceProfile } from "@/lib/bed-device-profiles";
import { useSmartBedDevice, type BedTransport } from "@/lib/use-smart-bed-device";
import { cn } from "@/lib/utils";
import "./smart-bed.css";

type ViewId = "control" | "presets" | "comfort" | "routine";

const LED_COLORS = ["#F5EDD6", "#D7B957", "#F0A35E", "#EC6F6F", "#8D7AF4", "#5DA8F5", "#55D6C2", "#7FD179"];
const TIMER_OPTIONS = [15, 30, 45, 60, 90];
const MASSAGE_LEVELS: Array<{ level: MassageLevel; label: string }> = [
  { level: 0, label: "Tắt" },
  { level: 1, label: "Nhẹ" },
  { level: 2, label: "Vừa" },
  { level: 3, label: "Mạnh" },
];
const MASSAGE_MODES: Array<{ id: MassageMode; label: string }> = [
  { id: "wave", label: "Làn sóng" },
  { id: "pulse", label: "Nhịp" },
  { id: "steady", label: "Liên tục" },
];

const NAV_ITEMS: Array<{ id: ViewId; label: string; icon: typeof Gamepad2 }> = [
  { id: "control", label: "Điều khiển", icon: Gamepad2 },
  { id: "presets", label: "Tư thế", icon: BedDouble },
  { id: "comfort", label: "Tiện nghi", icon: Sparkles },
  { id: "routine", label: "Lịch ngủ", icon: Clock3 },
];

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function PresetIcon({ preset }: { preset: Preset }) {
  const Icon = preset.icon === "read" ? BookOpen
    : preset.icon === "tv" ? Tv
      : preset.icon === "sit" ? Armchair
        : preset.icon === "snore" ? MoonStar
          : preset.icon === "zero" ? Zap
            : preset.icon === "custom" ? Save
              : BedDouble;
  return <Icon size={20} strokeWidth={1.8} />;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" className={cn("bed-toggle", checked && "is-on")} onClick={onChange} aria-label={label} aria-pressed={checked}>
      <span />
    </button>
  );
}

function AngleControl({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <section className={cn("bed-angle-card", disabled && "is-disabled")}>
      <div className="bed-angle-card__top">
        <div>
          <span className="bed-eyebrow">{label}</span>
          <strong>{value}<small>°</small></strong>
        </div>
        <div className="bed-angle-steps">
          <button type="button" onClick={() => onChange(value - 5)} disabled={disabled || value <= 0} aria-label={`Hạ ${label.toLowerCase()}`}><ChevronDown size={18} /></button>
          <button type="button" onClick={() => onChange(value + 5)} disabled={disabled || value >= max} aria-label={`Nâng ${label.toLowerCase()}`}><ChevronUp size={18} /></button>
        </div>
      </div>
      <input
        className="bed-range"
        type="range"
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-progress": `${(value / max) * 100}%` } as CSSProperties}
        aria-label={label}
      />
      <div className="bed-range-labels"><span>0°</span><span>{max}°</span></div>
    </section>
  );
}

function SettingRow({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action: ReactNode }) {
  return (
    <div className="bed-setting-row">
      <div className="bed-setting-row__icon">{icon}</div>
      <div className="bed-setting-row__copy"><strong>{title}</strong><span>{description}</span></div>
      <div className="bed-setting-row__action">{action}</div>
    </div>
  );
}

export default function DashboardPage() {
  const store = useBedStore();
  const { state } = store;
  const device = useSmartBedDevice(store.applyDeviceTelemetry);
  const profile = useMemo(() => getBedDeviceProfile(state.deviceProfileId), [state.deviceProfileId]);
  const [activeView, setActiveView] = useState<ViewId>("control");
  const [showConnection, setShowConnection] = useState(false);
  const [connectionTransport, setConnectionTransport] = useState<BedTransport>("bluetooth");
  const [showAdvancedConnection, setShowAdvancedConnection] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activePreset = store.presets.find((preset) => preset.id === state.activePreset);
  const controlsLocked = state.childLock;

  useEffect(() => {
    if (device.connection.status !== "connected" || !device.connection.transport) {
      if (state.connected) store.disconnectDevice();
      return;
    }
    store.connectDevice({
      deviceName: device.connection.deviceName,
      deviceId: device.connection.deviceId,
      transport: device.connection.transport,
    });
    void fetch("/api/bed/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hardwareId: device.connection.deviceId,
        name: device.connection.deviceName,
        profileId: state.deviceProfileId,
        transport: device.connection.transport,
        firmware: state.firmware,
      }),
    });
  }, [device.connection.status, device.connection.transport, device.connection.deviceId, device.connection.deviceName]);

  useEffect(() => {
    if (device.connection.status !== "connected") return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      void device.send({
        type: "sync_state",
        zone: state.activeZone,
        profileId: state.deviceProfileId,
        headAngle: state.headAngle,
        footAngle: state.footAngle,
        led: { on: state.ledOn, color: state.ledColor, brightness: state.ledBrightness },
        massage: { on: state.massageOn, level: state.massageLevel, mode: state.massageMode },
        childLock: state.childLock,
      });
    }, 110);
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [device.connection.status, state.activeZone, state.deviceProfileId, state.headAngle, state.footAngle, state.ledOn, state.ledColor, state.ledBrightness, state.massageOn, state.massageLevel, state.massageMode, state.childLock]);

  useEffect(() => {
    if (device.connection.status !== "connected") return;
    void device.send({ type: "set_routine", ...state.routine });
  }, [device.connection.status, state.routine]);

  const connect = async (transport: BedTransport) => {
    setConnectionTransport(transport);
    const connected = await device.connect(transport);
    if (connected) {
      setShowConnection(false);
      setToast(transport === "bluetooth" || transport === "native" ? "Đã kết nối Bluetooth" : transport === "wifi" ? "Đã kết nối Wi‑Fi Gateway" : "Đã bật thiết bị mô phỏng");
    }
  };

  const savePreset = () => {
    if (!store.saveCurrentPreset(presetName)) {
      setToast("Hãy nhập tên tư thế trước khi lưu");
      return;
    }
    setPresetName("");
    setToast("Đã lưu tư thế mới");
  };

  return (
    <main className="smart-bed-app">
      <div className="smart-bed-grid" aria-hidden="true" />

      <header className="smart-bed-header">
        <div className="smart-bed-header__inner">
          <Link href="/" className="smart-bed-brand" aria-label="Về trang chủ SmartFurni">
            <span className="smart-bed-brand__icon"><Home size={22} strokeWidth={1.6} /></span>
            <span><b>SMARTFURNI</b><small>SMART BED CONTROL</small></span>
          </Link>
          <div className="smart-bed-header__status">
            <button type="button" className={cn("device-pill", device.connection.status === "connected" && "is-connected", device.connection.status === "error" && "is-error")} onClick={() => setShowConnection(true)} aria-label={device.connection.status === "connected" ? `Thiết bị ${device.connection.deviceName} đã kết nối` : "Kết nối giường"}>
              {device.connection.transport === "wifi" ? <Wifi size={15} /> : device.connection.status === "connected" ? <Bluetooth size={15} /> : <WifiOff size={15} />}
              <span>{device.connection.status === "connected" ? device.connection.deviceName : device.connection.status === "error" ? "Lỗi kết nối" : "Kết nối giường"}</span>
              <i />
            </button>
            <Link href="/admin/choose-module" className="smart-bed-home-link" aria-label="Trung tâm điều hành"><Settings2 size={19} /></Link>
          </div>
        </div>
      </header>

      <div className="smart-bed-shell">
        <section className="smart-bed-overview">
          <div className="smart-bed-overview__copy">
            <div className="bed-kicker"><Radio size={14} /> {profile.family === "electric_mattress" ? "NỆM THÔNG MINH" : "GIƯỜNG CÔNG THÁI HỌC"}</div>
            <h1>Chào buổi tối</h1>
            <p>{profile.shortName} · Điều chỉnh tư thế và tiện nghi để cơ thể thư giãn đúng cách.</p>
          </div>
          <div className="smart-bed-metrics">
            <span><BatteryMedium size={17} /> {state.batteryLevel}%</span>
            <span><ShieldCheck size={17} /> {state.childLock ? "Đang khóa" : "An toàn"}</span>
          </div>
        </section>

        <nav className="smart-bed-tabs" aria-label="Chức năng điều khiển">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button type="button" key={item.id} className={cn(activeView === item.id && "is-active")} onClick={() => setActiveView(item.id)}>
                <Icon size={17} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="smart-bed-layout">
          <section className="bed-visual-panel">
            <div className="bed-visual-panel__header">
              <div>
                <span className="bed-eyebrow">TRẠNG THÁI HIỆN TẠI</span>
                <h2>{activePreset?.name ?? "Tư thế tùy chỉnh"}</h2>
              </div>
              <span className={cn("bed-live-badge", device.connection.status === "connected" && "is-live")}><i />{device.connection.status === "connected" ? device.connection.transport === "simulator" ? "Mô phỏng" : "Trực tuyến" : "Chưa kết nối"}</span>
            </div>

            <div className="bed-visual-stage">
              <div className="bed-visual-glow" style={{ opacity: state.ledOn ? state.ledBrightness / 100 : 0, background: state.ledColor }} />
              <BedSVG headAngle={state.headAngle} footAngle={state.footAngle} ledOn={state.ledOn} ledColor={state.ledColor} size={520} className="bed-visual-svg" />
            </div>

            <div className="bed-position-summary">
              <div><span>Đầu giường</span><strong>{state.headAngle}°</strong></div>
              <div className="bed-position-summary__line" />
              <div><span>Chân giường</span><strong>{state.footAngle}°</strong></div>
            </div>

            <div className="bed-command-status"><Check size={14} /><span>{state.lastCommand}</span></div>
          </section>

          <section className="bed-control-panel">
            {activeView === "control" && (
              <div className="bed-view">
                <div className="bed-view__heading"><div><span className="bed-eyebrow">ĐIỀU KHIỂN CHÍNH</span><h2>Điều chỉnh tư thế</h2></div>{state.childLock && <span className="bed-warning"><LockKeyhole size={13} /> Đã khóa</span>}</div>
                {profile.capabilities.dualZone && (
                  <div className="bed-zone-switch" aria-label="Vùng điều khiển">
                    <button type="button" className={state.activeZone === "all" ? "is-active" : ""} onClick={() => store.setActiveZone("all")}>Toàn bộ</button>
                    <button type="button" className={state.activeZone === "left" ? "is-active" : ""} onClick={() => store.setActiveZone("left")}>Bên trái</button>
                    <button type="button" className={state.activeZone === "right" ? "is-active" : ""} onClick={() => store.setActiveZone("right")}>Bên phải</button>
                  </div>
                )}
                <div className="bed-angle-grid">
                  <AngleControl label="Đầu giường" value={state.headAngle} max={profile.capabilities.maxHeadAngle} disabled={controlsLocked || !profile.capabilities.head} onChange={store.setHeadAngle} />
                  {profile.capabilities.foot && <AngleControl label="Chân giường" value={state.footAngle} max={profile.capabilities.maxFootAngle} disabled={controlsLocked} onChange={store.setFootAngle} />}
                </div>
                <button type="button" className="bed-flat-action" onClick={() => { store.resetFlat(); void device.send({ type: "stop_flat", zone: state.activeZone }); setToast("Đang đưa giường về vị trí phẳng"); }}>
                  <RotateCcw size={19} /><span><b>Dừng & về phẳng</b><small>Luôn hoạt động kể cả khi đang khóa</small></span>
                </button>
                <SettingRow
                  icon={<LockKeyhole size={20} />}
                  title="Khóa trẻ em"
                  description="Ngăn thao tác góc giường ngoài ý muốn"
                  action={<Toggle checked={state.childLock} onChange={store.toggleChildLock} label="Khóa trẻ em" />}
                />
                <div className="bed-mini-presets">
                  {DEFAULT_PRESETS.slice(0, 3).map((preset) => (
                    <button type="button" key={preset.id} onClick={() => store.applyPreset(preset)} disabled={controlsLocked} className={cn(state.activePreset === preset.id && "is-active")}>
                      <PresetIcon preset={preset} /><span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeView === "presets" && (
              <div className="bed-view">
                <div className="bed-view__heading"><div><span className="bed-eyebrow">MỘT CHẠM</span><h2>Tư thế yêu thích</h2></div><span className="bed-count">{store.presets.length} chế độ</span></div>
                <div className="bed-preset-grid">
                  {store.presets.map((preset) => (
                    <button type="button" key={preset.id} disabled={controlsLocked} onClick={() => store.applyPreset(preset)} className={cn("bed-preset-card", state.activePreset === preset.id && "is-active")}>
                      <span className="bed-preset-card__icon"><PresetIcon preset={preset} /></span>
                      <span className="bed-preset-card__copy"><b>{preset.name}</b><small>Đầu {preset.headAngle}° · Chân {preset.footAngle}°</small></span>
                      {preset.custom && <span role="button" tabIndex={0} className="bed-preset-delete" aria-label={`Xóa ${preset.name}`} onClick={(event) => { event.stopPropagation(); store.deleteCustomPreset(preset.id); }} onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); store.deleteCustomPreset(preset.id); } }}><Trash2 size={14} /></span>}
                    </button>
                  ))}
                </div>
                <div className="bed-save-preset">
                  <div><Save size={19} /><span><b>Lưu tư thế hiện tại</b><small>Đầu {state.headAngle}° · Chân {state.footAngle}°</small></span></div>
                  <div className="bed-save-preset__form"><input value={presetName} onChange={(event) => setPresetName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && savePreset()} placeholder="Ví dụ: Thư giãn" maxLength={28} /><button type="button" onClick={savePreset}>Lưu</button></div>
                </div>
              </div>
            )}

            {activeView === "comfort" && (
              <div className="bed-view">
                <div className="bed-view__heading"><div><span className="bed-eyebrow">KHÔNG GIAN THƯ GIÃN</span><h2>Đèn & massage</h2></div></div>
                {!profile.capabilities.led && !profile.capabilities.massage && <div className="bed-capability-note"><ShieldCheck size={19} /><span><b>{profile.shortName}</b><small>Model này tập trung điều khiển tư thế và không cấu hình đèn hoặc massage.</small></span></div>}
                {profile.capabilities.led && <>
                <SettingRow icon={<Lightbulb size={20} />} title="Đèn ngủ dưới gầm" description={state.ledOn ? `Đang bật · ${state.ledBrightness}%` : "Đang tắt"} action={<Toggle checked={state.ledOn} onChange={store.toggleLed} label="Đèn ngủ" />} />
                <div className="bed-comfort-card">
                  <div className="bed-card-label"><Palette size={16} /><span>Màu ánh sáng</span></div>
                  <div className="bed-color-grid">{LED_COLORS.map((color) => <button type="button" key={color} onClick={() => store.setLedColor(color)} className={cn(state.ledColor === color && state.ledOn && "is-active")} style={{ backgroundColor: color }} aria-label={`Màu ${color}`} />)}</div>
                  <div className="bed-slider-row"><LampDesk size={17} /><input className="bed-range" type="range" min={10} max={100} value={state.ledBrightness} onChange={(event) => store.setLedBrightness(Number(event.target.value))} style={{ "--range-progress": `${state.ledBrightness}%` } as CSSProperties} /><b>{state.ledBrightness}%</b></div>
                </div>
                </>}
                {profile.capabilities.massage && <>
                <SettingRow icon={<Vibrate size={20} />} title="Massage thư giãn" description={state.massageOn ? `Đang chạy · mức ${state.massageLevel}` : "Đang tắt"} action={<Toggle checked={state.massageOn} onChange={() => store.setMassageLevel(state.massageOn ? 0 : 1)} label="Massage" />} />
                <div className="bed-comfort-card">
                  <div className="bed-segmented">{MASSAGE_LEVELS.map((item) => <button type="button" key={item.level} onClick={() => store.setMassageLevel(item.level)} className={cn(state.massageLevel === item.level && "is-active")}>{item.label}</button>)}</div>
                  <div className="bed-mode-grid">{MASSAGE_MODES.map((mode) => <button type="button" key={mode.id} onClick={() => store.setMassageMode(mode.id)} className={cn(state.massageMode === mode.id && state.massageOn && "is-active")}><Vibrate size={16} /><span>{mode.label}</span></button>)}</div>
                </div>
                </>}
              </div>
            )}

            {activeView === "routine" && (
              <div className="bed-view">
                <div className="bed-view__heading"><div><span className="bed-eyebrow">TỰ ĐỘNG HÓA</span><h2>Lịch ngủ thông minh</h2></div><Toggle checked={state.routine.enabled} onChange={() => store.updateRoutine({ enabled: !state.routine.enabled })} label="Lịch ngủ" /></div>
                <div className="bed-routine-grid">
                  <label className="bed-time-card"><span className="bed-time-card__icon"><MoonStar size={20} /></span><span><small>GIỜ ĐI NGỦ</small><input type="time" value={state.routine.bedtime} onChange={(event) => store.updateRoutine({ bedtime: event.target.value })} /></span></label>
                  <label className="bed-time-card"><span className="bed-time-card__icon is-wake"><SunMedium size={20} /></span><span><small>GIỜ THỨC DẬY</small><input type="time" value={state.routine.wakeTime} onChange={(event) => store.updateRoutine({ wakeTime: event.target.value })} /></span></label>
                </div>
                <div className="bed-routine-selects">
                  <label><span>Tư thế khi đi ngủ</span><select value={state.routine.sleepPresetId} onChange={(event) => store.updateRoutine({ sleepPresetId: event.target.value })}>{store.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
                  <label><span>Tư thế khi thức dậy</span><select value={state.routine.wakePresetId} onChange={(event) => store.updateRoutine({ wakePresetId: event.target.value })}>{store.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
                </div>
                <SettingRow icon={<LampDesk size={20} />} title="Bật đèn dịu khi đi ngủ" description="Giữ ánh sáng hiện tại khi lịch bắt đầu" action={<Toggle checked={state.routine.ledAtBedtime} onChange={() => store.updateRoutine({ ledAtBedtime: !state.routine.ledAtBedtime })} label="Đèn theo lịch" />} />
                <div className="bed-timer-card">
                  <div className="bed-timer-card__head"><div><TimerReset size={21} /><span><b>Hẹn giờ về phẳng</b><small>Tự tắt massage khi hoàn tất</small></span></div>{state.timerEndsAt && <strong>{formatCountdown(store.timerRemainingSeconds)}</strong>}</div>
                  <div className="bed-timer-options">{TIMER_OPTIONS.map((minutes) => <button type="button" key={minutes} onClick={() => store.setTimerMinutes(minutes)} className={cn(state.timerMinutes === minutes && "is-active")}>{minutes}p</button>)}</div>
                  <button type="button" className={cn("bed-timer-action", state.timerEndsAt && "is-running")} onClick={state.timerEndsAt ? store.cancelTimer : store.startTimer}>{state.timerEndsAt ? <><Pause size={18} /> Hủy hẹn giờ</> : <><Play size={18} /> Bắt đầu {state.timerMinutes} phút</>}</button>
                </div>
                <p className="bed-routine-note"><ShieldCheck size={15} /> Lịch tự động được lưu trên thiết bị này và chạy khi ứng dụng đang mở.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <nav className="smart-bed-mobile-nav" aria-label="Điều hướng ứng dụng">
        {NAV_ITEMS.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={cn(activeView === item.id && "is-active")} onClick={() => setActiveView(item.id)}><Icon size={20} /><span>{item.label}</span></button>; })}
      </nav>

      {showConnection && (
        <div className="bed-modal-backdrop" role="presentation" onMouseDown={() => device.connection.status !== "connecting" && setShowConnection(false)}>
          <section className="bed-connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="bed-modal-close" onClick={() => setShowConnection(false)} aria-label="Đóng"><X size={19} /></button>
            <div className="bed-connection-modal__title">
              <span className="bed-connection-modal__icon">{device.connection.transport === "wifi" ? <Router size={27} /> : <Bluetooth size={27} />}</span>
              <div><span className="bed-eyebrow">THIẾT BỊ SMARTFURNI</span><h2 id="connection-title">{device.connection.status === "connected" ? device.connection.deviceName : "Kết nối bộ điều khiển"}</h2></div>
            </div>
            {device.connection.status === "connected" ? (
              <>
                <div className="bed-connected-summary">
                  <div><span>Kênh kết nối</span><b>{device.connection.transport === "wifi" ? "Wi‑Fi Gateway" : device.connection.transport === "native" ? "Bluetooth ứng dụng" : device.connection.transport === "simulator" ? "Mô phỏng" : "Web Bluetooth"}</b></div>
                  <div><span>Model</span><b>{profile.shortName}</b></div>
                  <div><span>Độ trễ</span><b>{device.connection.lastLatencyMs ?? 0} ms</b></div>
                  <div><span>Pin điều khiển</span><b>{state.batteryLevel}%</b></div>
                </div>
                <div className="bed-device-details"><span><ShieldCheck size={17} /> Trạng thái</span><b className="is-online">Đang trực tuyến</b></div>
                <button type="button" className="bed-connect-secondary" onClick={async () => { await device.disconnect(); store.disconnectDevice(); setShowConnection(false); }}> <Unplug size={18} /> Ngắt kết nối</button>
              </>
            ) : (
              <>
                <p className="bed-connection-intro">Chọn đúng dòng sản phẩm và phương thức kết nối. Ứng dụng chỉ gửi lệnh trong giới hạn an toàn của model đã chọn.</p>
                <label className="bed-profile-select">
                  <span>Dòng sản phẩm đang sử dụng</span>
                  <select value={state.deviceProfileId} onChange={(event) => store.selectDeviceProfile(event.target.value)}>
                    <optgroup label="Giường Công Thái Học">
                      {BED_DEVICE_PROFILES.filter((item) => item.family === "ergonomic_bed").map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
                    </optgroup>
                    <optgroup label="Nệm Thông Minh Điều Chỉnh Điện">
                      {BED_DEVICE_PROFILES.filter((item) => item.family === "electric_mattress").map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
                    </optgroup>
                  </select>
                </label>
                <div className="bed-transport-grid">
                  {device.connection.nativeBridgeAvailable && <button type="button" onClick={() => setConnectionTransport("native")} className={connectionTransport === "native" ? "is-active" : ""}><span><Bluetooth size={20} /></span><b>Bluetooth App</b><small>iPhone & Android</small></button>}
                  <button type="button" onClick={() => setConnectionTransport("bluetooth")} className={connectionTransport === "bluetooth" ? "is-active" : ""}><span><Bluetooth size={20} /></span><b>Bluetooth</b><small>{device.connection.bluetoothSupported ? "Chrome / Android" : "Không hỗ trợ trên trình duyệt này"}</small></button>
                  <button type="button" onClick={() => setConnectionTransport("wifi")} className={connectionTransport === "wifi" ? "is-active" : ""}><span><Router size={20} /></span><b>Wi‑Fi</b><small>Gateway trong nhà</small></button>
                  <button type="button" onClick={() => setConnectionTransport("simulator")} className={connectionTransport === "simulator" ? "is-active" : ""}><span><Gamepad2 size={20} /></span><b>Trải nghiệm</b><small>Không cần thiết bị</small></button>
                </div>
                {connectionTransport === "wifi" && (
                  <div className="bed-wifi-config">
                    <label><span>Địa chỉ Gateway</span><input value={device.config.wifiGatewayUrl} onChange={(event) => device.setConfig({ ...device.config, wifiGatewayUrl: event.target.value })} placeholder="https://bed-gateway.local" inputMode="url" /></label>
                    <label><span>Mã truy cập (nếu có)</span><input type="password" value={device.config.wifiApiToken} onChange={(event) => device.setConfig({ ...device.config, wifiApiToken: event.target.value })} placeholder="••••••••" /></label>
                  </div>
                )}
                {(connectionTransport === "bluetooth" || connectionTransport === "native") && (
                  <div className="bed-advanced-block">
                    <button type="button" onClick={() => setShowAdvancedConnection(!showAdvancedConnection)}>Cấu hình giao thức <ChevronDown size={15} /></button>
                    {showAdvancedConnection && <div className="bed-advanced-fields">
                      <label><span>Tên thiết bị bắt đầu bằng</span><input value={device.config.deviceNamePrefix} onChange={(event) => device.setConfig({ ...device.config, deviceNamePrefix: event.target.value })} /></label>
                      <label><span>Service UUID</span><input value={device.config.bleServiceUuid} onChange={(event) => device.setConfig({ ...device.config, bleServiceUuid: event.target.value })} /></label>
                      <label><span>Write UUID</span><input value={device.config.bleWriteCharacteristicUuid} onChange={(event) => device.setConfig({ ...device.config, bleWriteCharacteristicUuid: event.target.value })} /></label>
                      <label><span>Notify UUID</span><input value={device.config.bleNotifyCharacteristicUuid} onChange={(event) => device.setConfig({ ...device.config, bleNotifyCharacteristicUuid: event.target.value })} /></label>
                    </div>}
                  </div>
                )}
                {device.connection.error && <div className="bed-connection-error">{device.connection.error}</div>}
                <button type="button" className="bed-connect-primary" disabled={device.connection.status === "connecting"} onClick={() => void connect(connectionTransport)}>{device.connection.status === "connecting" ? <><span className="bed-spinner" /> Đang kết nối...</> : <>{connectionTransport === "wifi" ? <Router size={18} /> : connectionTransport === "simulator" ? <Gamepad2 size={18} /> : <Bluetooth size={18} />} Kết nối {connectionTransport === "wifi" ? "Wi‑Fi" : connectionTransport === "simulator" ? "mô phỏng" : "Bluetooth"}</>}</button>
              </>
            )}
            <small className="bed-connection-note">Bluetooth trên iPhone hoạt động trong app SmartFurni. Khi dùng website trên iPhone, hãy chọn Wi‑Fi Gateway.</small>
            <button type="button" className="bed-account-logout" onClick={async () => { await fetch("/api/bed/auth", { method: "DELETE" }); window.location.href = "/smart-bed/login"; }}>Đăng xuất tài khoản điều khiển</button>
            <button type="button" className="bed-account-delete" onClick={async () => {
              if (!window.confirm("Xóa tài khoản điều khiển, thiết bị đã ghép đôi và toàn bộ dữ liệu liên quan? Thao tác này không thể hoàn tác.")) return;
              const response = await fetch("/api/bed/account", { method: "DELETE" });
              if (response.ok) window.location.href = "/smart-bed/login";
              else setToast("Chưa thể xóa tài khoản. Vui lòng thử lại.");
            }}>Xóa tài khoản và dữ liệu</button>
          </section>
        </div>
      )}

      {toast && <div className="bed-toast"><Check size={16} />{toast}</div>}
    </main>
  );
}
