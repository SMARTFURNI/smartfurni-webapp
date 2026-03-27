"use client";
import { useState } from "react";
import Link from "next/link";
import BedSVG from "@/components/ui/BedSVG";
import { useBedStore, DEFAULT_PRESETS } from "@/lib/bed-store";
import { cn } from "@/lib/utils";

const LED_COLORS = [
  "#FFFFFF", "#FFD700", "#C9A84C", "#FF6B6B", "#FF8C42",
  "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F7DC6F",
];

const MASSAGE_LEVELS = [
  { level: 0 as const, label: "Tắt" },
  { level: 1 as const, label: "Nhẹ" },
  { level: 2 as const, label: "Vừa" },
  { level: 3 as const, label: "Mạnh" },
];

const TIMER_OPTIONS = [15, 30, 45, 60, 90];

export default function DashboardPage() {
  const store = useBedStore();
  const { state } = store;
  const [activeTab, setActiveTab] = useState<"control" | "light" | "massage" | "timer">("control");

  return (
    <div className="min-h-screen bg-[#0D0B00] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[#2E2800] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[#F5EDD6]/50 hover:text-[#C9A84C] transition-colors text-sm">
            ← Trang chủ
          </Link>
          <div className="w-px h-4 bg-[#2E2800]" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center">
              <span className="text-[#0D0B00] font-bold text-[9px]">SF</span>
            </div>
            <span className="font-brand text-sm tracking-wider text-[#E2C97E]">SMARTFURNI</span>
          </div>
        </div>

        {/* Connection toggle */}
        <button
          onClick={store.toggleConnect}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
            state.connected
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-[#1A1600] border border-[#2E2800] text-[#F5EDD6]/50 hover:border-[#C9A84C]/40"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", state.connected ? "bg-green-400 animate-pulse" : "bg-[#F5EDD6]/30")} />
          {state.connected ? "Đã kết nối" : "Chưa kết nối"}
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left — Bed Visualizer */}
        <div className="lg:w-1/2 xl:w-3/5 flex flex-col items-center justify-center p-8 border-b lg:border-b-0 lg:border-r border-[#2E2800]">
          {/* Bed card */}
          <div className="w-full max-w-xl">
            <div className="bg-[#1A1600] border border-[#2E2800] rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-medium text-[#F5EDD6]/70">Vị trí giường</h2>
                  <p className="text-xs text-[#F5EDD6]/30 mt-0.5">
                    {state.activePreset
                      ? DEFAULT_PRESETS.find((p) => p.id === state.activePreset)?.name ?? "Tùy chỉnh"
                      : "Tùy chỉnh"}
                  </p>
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <div className="text-xl font-light text-[#C9A84C]">{state.headAngle}°</div>
                    <div className="text-xs text-[#F5EDD6]/40">Đầu</div>
                  </div>
                  <div className="w-px bg-[#2E2800]" />
                  <div>
                    <div className="text-xl font-light text-[#C9A84C]">{state.footAngle}°</div>
                    <div className="text-xs text-[#F5EDD6]/40">Chân</div>
                  </div>
                </div>
              </div>

              <BedSVG
                headAngle={state.headAngle}
                footAngle={state.footAngle}
                ledOn={state.ledOn}
                ledColor={state.ledColor}
                size={460}
                className="w-full"
              />
            </div>
          </div>

          {/* Angle sliders */}
          <div className="w-full max-w-xl mt-6 grid grid-cols-2 gap-4">
            {[
              { label: "Góc đầu", value: state.headAngle, max: 70, onChange: store.setHeadAngle },
              { label: "Góc chân", value: state.footAngle, max: 45, onChange: store.setFootAngle },
            ].map((slider) => (
              <div key={slider.label} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-4">
                <div className="flex justify-between mb-3">
                  <span className="text-xs text-[#F5EDD6]/60">{slider.label}</span>
                  <span className="text-sm font-medium text-[#C9A84C]">{slider.value}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={slider.max}
                  value={slider.value}
                  onChange={(e) => slider.onChange(Number(e.target.value))}
                  className="w-full accent-[#C9A84C] cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-[#F5EDD6]/30">0°</span>
                  <span className="text-xs text-[#F5EDD6]/30">{slider.max}°</span>
                </div>
              </div>
            ))}
          </div>

          {/* Reset flat button */}
          <button
            onClick={store.resetFlat}
            className="mt-4 w-full max-w-xl flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#2E2800] text-[#F5EDD6]/50 text-sm hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all duration-200"
          >
            ⬛ Về vị trí phẳng
          </button>
        </div>

        {/* Right — Controls */}
        <div className="lg:w-1/2 xl:w-2/5 flex flex-col overflow-y-auto">
          {/* Tab navigation */}
          <div className="flex border-b border-[#2E2800] px-4 pt-4">
            {[
              { id: "control" as const, label: "Preset", icon: "🛏️" },
              { id: "light" as const, label: "Đèn LED", icon: "💡" },
              { id: "massage" as const, label: "Massage", icon: "🎵" },
              { id: "timer" as const, label: "Hẹn giờ", icon: "⏰" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all duration-200 -mb-px",
                  activeTab === tab.id
                    ? "border-[#C9A84C] text-[#C9A84C]"
                    : "border-transparent text-[#F5EDD6]/40 hover:text-[#F5EDD6]/70"
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 space-y-4">
            {/* Preset tab */}
            {activeTab === "control" && (
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-[#F5EDD6]/50 uppercase tracking-wider">Chế độ nhanh</h3>
                <div className="grid grid-cols-2 gap-3">
                  {DEFAULT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => store.applyPreset(preset)}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all duration-200",
                        state.activePreset === preset.id
                          ? "border-[#C9A84C] bg-[#C9A84C]/10"
                          : "border-[#2E2800] bg-[#1A1600] hover:border-[#C9A84C]/40"
                      )}
                    >
                      <div className="text-2xl mb-2">{preset.icon}</div>
                      <div className={cn("text-xs font-medium", state.activePreset === preset.id ? "text-[#C9A84C]" : "text-[#F5EDD6]/80")}>
                        {preset.name}
                      </div>
                      <div className="text-xs text-[#F5EDD6]/30 mt-0.5">
                        {preset.headAngle}° · {preset.footAngle}°
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Light tab */}
            {activeTab === "light" && (
              <div className="space-y-6">
                {/* Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1A1600] border border-[#2E2800]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <div className="text-sm font-medium text-[#F5EDD6]/80">Đèn LED</div>
                      <div className="text-xs text-[#F5EDD6]/40">{state.ledOn ? "Đang bật" : "Đã tắt"}</div>
                    </div>
                  </div>
                  <button
                    onClick={store.toggleLed}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all duration-300 relative",
                      state.ledOn ? "bg-[#C9A84C]" : "bg-[#2E2800]"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                      state.ledOn ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                {/* Color picker */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-[#F5EDD6]/50 uppercase tracking-wider">Màu sắc</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {LED_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => store.setLedColor(color)}
                        className={cn(
                          "w-full aspect-square rounded-xl transition-all duration-200",
                          state.ledColor === color && state.ledOn ? "ring-2 ring-white ring-offset-2 ring-offset-[#0D0B00] scale-110" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Brightness */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <h3 className="text-xs font-medium text-[#F5EDD6]/50 uppercase tracking-wider">Độ sáng</h3>
                    <span className="text-xs text-[#C9A84C]">{state.ledBrightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={state.ledBrightness}
                    onChange={(e) => store.setLedBrightness(Number(e.target.value))}
                    className="w-full accent-[#C9A84C] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Massage tab */}
            {activeTab === "massage" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1A1600] border border-[#2E2800]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎵</span>
                    <div>
                      <div className="text-sm font-medium text-[#F5EDD6]/80">Massage</div>
                      <div className="text-xs text-[#F5EDD6]/40">{state.massageOn ? "Đang chạy" : "Đã tắt"}</div>
                    </div>
                  </div>
                  <button
                    onClick={store.toggleMassage}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all duration-300 relative",
                      state.massageOn ? "bg-[#C9A84C]" : "bg-[#2E2800]"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                      state.massageOn ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-[#F5EDD6]/50 uppercase tracking-wider">Cường độ</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {MASSAGE_LEVELS.map((m) => (
                      <button
                        key={m.level}
                        onClick={() => store.setMassageLevel(m.level)}
                        className={cn(
                          "py-3 rounded-xl text-xs font-medium transition-all duration-200",
                          state.massageLevel === m.level
                            ? "bg-[#C9A84C] text-[#0D0B00]"
                            : "bg-[#1A1600] border border-[#2E2800] text-[#F5EDD6]/50 hover:border-[#C9A84C]/40"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {state.massageOn && (
                  <div className="p-4 rounded-2xl bg-[#C9A84C]/5 border border-[#C9A84C]/20">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-4 rounded-full bg-[#C9A84C] animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#C9A84C]">
                        Đang massage — {MASSAGE_LEVELS[state.massageLevel].label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timer tab */}
            {activeTab === "timer" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-[#F5EDD6]/50 uppercase tracking-wider">Hẹn giờ tắt</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {TIMER_OPTIONS.map((min) => (
                      <button
                        key={min}
                        onClick={() => store.setTimerMinutes(min)}
                        className={cn(
                          "py-3 rounded-xl text-xs font-medium transition-all duration-200",
                          state.timerMinutes === min
                            ? "bg-[#C9A84C] text-[#0D0B00]"
                            : "bg-[#1A1600] border border-[#2E2800] text-[#F5EDD6]/50 hover:border-[#C9A84C]/40"
                        )}
                      >
                        {min}p
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={store.toggleTimer}
                  className={cn(
                    "w-full py-4 rounded-2xl font-medium text-sm transition-all duration-200",
                    state.timerActive
                      ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                      : "bg-gradient-to-r from-[#C9A84C] to-[#9A7A2E] text-[#0D0B00] hover:opacity-90"
                  )}
                >
                  {state.timerActive ? `⏹ Hủy hẹn giờ (${state.timerMinutes} phút)` : `▶ Bắt đầu hẹn giờ ${state.timerMinutes} phút`}
                </button>

                {state.timerActive && (
                  <div className="p-4 rounded-2xl bg-[#C9A84C]/5 border border-[#C9A84C]/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
                      <span className="text-xs text-[#C9A84C]">
                        Giường sẽ về vị trí phẳng sau {state.timerMinutes} phút
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="border-t border-[#2E2800] px-6 py-4 flex items-center gap-4 text-xs text-[#F5EDD6]/30">
            <span>Đầu: {state.headAngle}°</span>
            <span>·</span>
            <span>Chân: {state.footAngle}°</span>
            <span>·</span>
            <span>Đèn: {state.ledOn ? "Bật" : "Tắt"}</span>
            <span>·</span>
            <span>Massage: {state.massageOn ? MASSAGE_LEVELS[state.massageLevel].label : "Tắt"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
