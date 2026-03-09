"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BedSVG from "@/components/ui/BedSVG";

const DEMO_PRESETS = [
  { name: "Nằm phẳng", head: 0, foot: 0 },
  { name: "Đọc sách", head: 45, foot: 15 },
  { name: "Xem TV", head: 35, foot: 15 },
  { name: "Ngồi dậy", head: 45, foot: 0 },
  { name: "Chống ngáy", head: 12, foot: 0 },
];

export default function HeroSection() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [headAngle, setHeadAngle] = useState(0);
  const [footAngle, setFootAngle] = useState(0);
  const [ledOn, setLedOn] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPresetIdx((i) => (i + 1) % DEMO_PRESETS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const target = DEMO_PRESETS[presetIdx];
    const steps = 30;
    let step = 0;
    const startHead = headAngle;
    const startFoot = footAngle;
    const timer = setInterval(() => {
      step++;
      const t = step / steps;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setHeadAngle(Math.round(startHead + (target.head - startHead) * ease));
      setFootAngle(Math.round(startFoot + (target.foot - startFoot) * ease));
      if (step >= steps) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [presetIdx]); // eslint-disable-line

  useEffect(() => {
    const t = setInterval(() => setLedOn((v) => !v), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-[#1A1200] via-[#0D0B00] to-[#0D0B00]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C9A84C]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — Text */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5">
            <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider">CÔNG NGHỆ ĐIỀU KHIỂN THÔNG MINH</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-light leading-tight">
            <span className="font-brand text-gold-gradient block text-6xl lg:text-7xl mb-2">SMARTFURNI</span>
            <span className="text-[#F5EDD6]/90">Giấc ngủ hoàn hảo</span>
            <br />
            <span className="text-[#F5EDD6]/60 text-4xl lg:text-5xl">trong tầm tay bạn</span>
          </h1>

          <p className="text-[#F5EDD6]/60 text-lg leading-relaxed max-w-md">
            Điều khiển góc đầu, góc chân, đèn LED và massage chỉ bằng một chạm.
            Kết nối Bluetooth, preset thông minh, theo dõi giấc ngủ chuyên sâu.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#9A7A2E] text-[#0D0B00] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Thử Dashboard ngay
            </Link>
            <a
              href="#download"
              className="px-6 py-3 rounded-full border border-[#C9A84C]/40 text-[#C9A84C] text-sm font-medium hover:border-[#C9A84C] transition-colors"
            >
              Tải ứng dụng
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-[#2E2800]">
            {[
              { value: "6+", label: "Chế độ preset" },
              { value: "BLE 5.0", label: "Kết nối" },
              { value: "iOS & Android", label: "Nền tảng" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-semibold text-[#C9A84C]">{stat.value}</div>
                <div className="text-xs text-[#F5EDD6]/50 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Bed Demo */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-full max-w-lg">
            {/* Glow background */}
            <div className="absolute inset-0 bg-gradient-radial from-[#C9A84C]/10 to-transparent rounded-3xl" />
            <div className="relative bg-[#1A1600]/60 border border-[#2E2800] rounded-3xl p-8 backdrop-blur-sm">
              <BedSVG
                headAngle={headAngle}
                footAngle={footAngle}
                ledOn={ledOn}
                ledColor="#C9A84C"
                size={380}
                className="w-full"
              />
            </div>
          </div>

          {/* Preset pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {DEMO_PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setPresetIdx(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  i === presetIdx
                    ? "bg-[#C9A84C] text-[#0D0B00]"
                    : "border border-[#2E2800] text-[#F5EDD6]/50 hover:border-[#C9A84C]/50"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <p className="text-xs text-[#F5EDD6]/30 text-center">
            Demo tương tác — nhấn để thay đổi tư thế giường
          </p>
        </div>
      </div>
    </section>
  );
}
