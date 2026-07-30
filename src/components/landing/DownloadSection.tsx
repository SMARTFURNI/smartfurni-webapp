"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Bluetooth,
  Check,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme } from "@/lib/theme-store";

interface Props {
  theme: SiteTheme;
}

const FW_MAP: Record<string, string> = {
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

const SMART_BED_APP_URL = "/go/bed-app";

const APP_BENEFITS = [
  {
    icon: Bluetooth,
    title: "Điều khiển tư thế",
    description: "Nâng đầu, nâng chân và trở về mặt phẳng ngay trên điện thoại.",
  },
  {
    icon: Wifi,
    title: "Đồng bộ thiết bị",
    description: "Lưu tư thế yêu thích, lịch ngủ và thiết bị SmartFurni của bạn.",
  },
  {
    icon: ShieldCheck,
    title: "Bảo mật tài khoản",
    description: "Dữ liệu thiết bị được bảo vệ và chỉ hiển thị trong tài khoản của bạn.",
  },
];

const INSTALL_STEPS = [
  "Mở camera trên điện thoại",
  "Quét mã QR và đăng nhập",
  "Chọn “Thêm vào màn hình chính”",
];

export default function DownloadSection({ theme }: Props) {
  const dl = theme.homepageSections?.download;
  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const textColor = theme?.colors.text ?? "#F5EDD6";

  return (
    <section id="download" className="overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal variant="fadeUp" delay={0}>
          <div
            className="relative overflow-hidden rounded-[28px] border shadow-[0_28px_90px_rgba(0,0,0,.32)]"
            style={{
              borderColor: `${primary}45`,
              background:
                "linear-gradient(135deg, rgba(24,27,34,.98) 0%, rgba(35,27,16,.98) 58%, rgba(20,20,19,.99) 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute -left-28 -top-40 h-96 w-96 rounded-full blur-3xl"
              style={{ backgroundColor: `${primary}12` }}
            />
            <div
              className="pointer-events-none absolute -bottom-52 right-0 h-[430px] w-[430px] rounded-full blur-3xl"
              style={{ backgroundColor: `${secondary}18` }}
            />

            <div className="relative grid lg:grid-cols-[1.14fr_.86fr]">
              <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
                <div
                  className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2"
                  style={{
                    borderColor: `${primary}42`,
                    backgroundColor: `${primary}10`,
                    color: dl?.badge?.color ?? primary,
                  }}
                >
                  <Smartphone size={15} />
                  <span
                    className="text-[10px] uppercase tracking-[.2em]"
                    style={{
                      fontSize: dl?.badge ? `${Math.min(dl.badge.fontSize, 12)}px` : "10px",
                      fontWeight: dl?.badge ? FW_MAP[dl.badge.fontWeight] : "600",
                    }}
                  >
                    {dl?.badge?.text ?? "Ứng dụng SmartFurni Bed"}
                  </span>
                </div>

                <h2
                  className="max-w-2xl text-balance leading-[1.08]"
                  style={{
                    color: dl?.title?.color ?? textColor,
                    fontSize: dl?.title
                      ? `clamp(32px, 4.5vw, ${Math.max(dl.title.fontSize, 48)}px)`
                      : "clamp(32px, 4.5vw, 52px)",
                    fontWeight: dl?.title ? FW_MAP[dl.title.fontWeight] : "300",
                  }}
                >
                  {dl?.title?.text ?? "Điều khiển giường ngay trên điện thoại"}
                </h2>

                <p
                  className="mt-5 max-w-xl text-sm leading-7 sm:text-base"
                  style={{
                    color: `${dl?.subtitle?.color ?? textColor}B8`,
                    fontWeight: dl?.subtitle ? FW_MAP[dl.subtitle.fontWeight] : "400",
                  }}
                >
                  {dl?.subtitle?.text ??
                    "Quét mã để mở SmartFurni Bed, điều khiển thiết bị, lưu tư thế yêu thích và cài lịch nghỉ ngơi."}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {APP_BENEFITS.map((benefit) => {
                    const Icon = benefit.icon;
                    return (
                      <div
                        key={benefit.title}
                        className="rounded-2xl border p-4"
                        style={{
                          borderColor: `${primary}24`,
                          backgroundColor: "rgba(5, 7, 10, .24)",
                        }}
                      >
                        <span
                          className="mb-3 grid h-9 w-9 place-items-center rounded-xl"
                          style={{ color: primary, backgroundColor: `${primary}13` }}
                        >
                          <Icon size={17} />
                        </span>
                        <h3 className="text-sm font-semibold" style={{ color: textColor }}>
                          {benefit.title}
                        </h3>
                        <p className="mt-1.5 text-[11px] leading-5" style={{ color: `${textColor}80` }}>
                          {benefit.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={SMART_BED_APP_URL}
                    prefetch={false}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition-transform hover:-translate-y-0.5"
                    style={{
                      color: "#171205",
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                      boxShadow: `0 14px 36px ${primary}20`,
                    }}
                  >
                    Mở ứng dụng trên điện thoại
                    <ArrowUpRight size={17} />
                  </Link>
                  <span className="inline-flex items-center justify-center gap-2 text-xs sm:justify-start" style={{ color: `${textColor}72` }}>
                    <Check size={14} style={{ color: primary }} />
                    Không cần tải tệp APK
                  </span>
                </div>
              </div>

              <div
                className="relative flex items-center justify-center border-t px-5 py-9 sm:px-10 sm:py-12 lg:border-l lg:border-t-0 lg:px-12"
                style={{ borderColor: `${primary}22` }}
              >
                <div className="w-full max-w-[340px]">
                  <div
                    className="rounded-[26px] border p-4 shadow-[0_24px_65px_rgba(0,0,0,.28)] sm:p-5"
                    style={{
                      borderColor: `${primary}38`,
                      background: "linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.025))",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 px-1 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <QrCode size={16} style={{ color: primary }} />
                          <span className="text-[10px] font-bold uppercase tracking-[.17em]" style={{ color: primary }}>
                            Quét để cài app
                          </span>
                        </div>
                        <p className="mt-1 text-xs" style={{ color: `${textColor}80` }}>
                          Dùng camera điện thoại
                        </p>
                      </div>
                      <span
                        className="rounded-full border px-2.5 py-1 text-[9px] font-semibold"
                        style={{
                          borderColor: `${primary}2F`,
                          color: `${textColor}A8`,
                          backgroundColor: `${primary}0C`,
                        }}
                      >
                        iPhone & Android
                      </span>
                    </div>

                    <Link
                      href={SMART_BED_APP_URL}
                      prefetch={false}
                      aria-label="Quét hoặc mở ứng dụng SmartFurni Bed"
                      className="group relative mx-auto block w-full max-w-[278px] overflow-hidden rounded-[20px] bg-[#fffdf7] p-3.5 sm:p-4"
                    >
                      <Image
                        src="/qr/smartfurni-bed-app.png"
                        width={1600}
                        height={1600}
                        sizes="(max-width: 640px) 68vw, 246px"
                        alt="Mã QR tải và cài ứng dụng SmartFurni Bed"
                        className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.015]"
                      />
                    </Link>

                    <div className="mt-5 space-y-3 px-1 pb-1">
                      {INSTALL_STEPS.map((step, index) => (
                        <div key={step} className="flex items-center gap-3">
                          <span
                            className="grid h-6 w-6 flex-none place-items-center rounded-full text-[10px] font-bold"
                            style={{ color: "#171205", backgroundColor: primary }}
                          >
                            {index + 1}
                          </span>
                          <span className="text-xs" style={{ color: `${textColor}B5` }}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="mt-4 text-center text-[10px] leading-5" style={{ color: `${textColor}66` }}>
                    Ứng dụng web SmartFurni được cài trực tiếp từ trình duyệt và luôn tự động cập nhật phiên bản mới.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
