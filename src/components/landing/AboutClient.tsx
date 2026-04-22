"use client";

import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";
import Footer from "@/components/landing/Footer";
import { ScrollReveal, StaggerReveal } from "./ScrollReveal";

const stats = [
  { value: "2020", label: "Năm thành lập" },
  { value: "10.000+", label: "Khách hàng tin dùng" },
  { value: "50+", label: "Showroom toàn quốc" },
  { value: "5★", label: "Đánh giá trung bình" },
];

const values = [
  {
    icon: "🎯",
    title: "Chính xác",
    desc: "Mỗi chi tiết được thiết kế với độ chính xác cao nhất — từ góc điều chỉnh 1° đến độ êm ái của motor.",
  },
  {
    icon: "🌿",
    title: "Bền vững",
    desc: "Sử dụng vật liệu thân thiện môi trường, quy trình sản xuất tiết kiệm năng lượng và bao bì tái chế.",
  },
  {
    icon: "🤝",
    title: "Tin cậy",
    desc: "Bảo hành 5 năm toàn diện, hỗ trợ kỹ thuật 24/7 và cam kết đổi trả trong 30 ngày.",
  },
  {
    icon: "💡",
    title: "Đổi mới",
    desc: "Liên tục cập nhật tính năng qua OTA, tích hợp AI phân tích giấc ngủ và kết nối hệ sinh thái smart home.",
  },
];

const team = [
  {
    name: "Nguyễn Minh Khoa",
    role: "CEO & Co-founder",
    bio: "15 năm kinh nghiệm trong ngành nội thất cao cấp. Tốt nghiệp MBA tại RMIT Việt Nam.",
    avatar: "NK",
  },
  {
    name: "Trần Thị Lan Anh",
    role: "CTO & Co-founder",
    bio: "Kỹ sư phần mềm với 10 năm kinh nghiệm IoT và embedded systems. Tốt nghiệp ĐH Bách Khoa HCM.",
    avatar: "LA",
  },
  {
    name: "Lê Hoàng Nam",
    role: "Head of Design",
    bio: "Designer với tư duy human-centered. Từng làm việc tại các studio thiết kế hàng đầu Singapore.",
    avatar: "HN",
  },
  {
    name: "Phạm Thị Thu Hà",
    role: "Head of Sales",
    bio: "Chuyên gia phát triển thị trường B2B và B2C trong lĩnh vực nội thất và smart home.",
    avatar: "TH",
  },
];

const milestones = [
  { year: "2020", event: "Thành lập SmartFurni tại TP. Hồ Chí Minh với 5 thành viên sáng lập." },
  { year: "2021", event: "Ra mắt dòng sản phẩm SmartBed đầu tiên, kết nối Bluetooth 4.2." },
  { year: "2022", event: "Mở rộng ra Hà Nội và Đà Nẵng. Đạt 1.000 khách hàng đầu tiên." },
  { year: "2023", event: "Nâng cấp lên Bluetooth 5.0, ra mắt app iOS và Android với 50.000 lượt tải." },
  { year: "2024", event: "Tích hợp AI phân tích giấc ngủ, mở 50 showroom trên toàn quốc." },
  { year: "2025", event: "Ra mắt SmartFurni Pro với điều khiển giọng nói tiếng Việt và theo dõi sức khỏe." },
];

interface Props {
  theme: SiteTheme;
}

export default function AboutClient({ theme }: Props) {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6">
        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="max-w-4xl mx-auto text-center">
            {/* Section label — giống trang chủ */}
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-6 h-px bg-[#C9A84C]" />
              <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">{theme.pageAbout.heroBadge}</span>
              <span className="w-6 h-px bg-[#C9A84C]" />
            </div>
            {/* H1 — font-light + text-gold-gradient giống trang chủ */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-[#F5EDD6] leading-tight mb-6"
              dangerouslySetInnerHTML={{ __html: theme.pageAbout.heroTitle }}
            />
            <p className="text-base sm:text-lg text-[#F5EDD6]/50 leading-relaxed max-w-2xl mx-auto">
              {theme.pageAbout.heroSubtitle}
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-y border-[#2E2800]">
        <StaggerReveal baseDelay={0} step={100} variant="fadeUp" className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            { value: theme.pageAbout.stat1Number, label: theme.pageAbout.stat1Label },
            { value: theme.pageAbout.stat2Number, label: theme.pageAbout.stat2Label },
            { value: theme.pageAbout.stat3Number, label: theme.pageAbout.stat3Label },
            { value: theme.pageAbout.stat4Number, label: theme.pageAbout.stat4Label },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-brand text-3xl sm:text-4xl text-gold-gradient mb-2">{s.value}</div>
              <div className="text-xs sm:text-sm text-[#F5EDD6]/50">{s.label}</div>
            </div>
          ))}
        </StaggerReveal>
      </section>

      {/* Mission */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-16 items-center">
          <ScrollReveal variant="fadeRight" delay={0}>
            <div>
              {/* Section label — giống trang chủ */}
              <div className="inline-flex items-center gap-2 mb-5">
                <span className="w-6 h-px bg-[#C9A84C]" />
                <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">{theme.pageAbout.missionTitle}</span>
              </div>
              {/* H2 — font-light giống FeaturesSection trang chủ */}
              <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-6"
                dangerouslySetInnerHTML={{ __html: theme.pageAbout.missionTitle }}
              />
              <p className="text-[#F5EDD6]/50 leading-relaxed">
                {theme.pageAbout.missionText}
              </p>
            </div>
          </ScrollReveal>
          <StaggerReveal baseDelay={100} step={100} variant="fadeUp" className="grid grid-cols-2 gap-3 sm:gap-4">
            {values.map((v) => (
              <div key={v.title} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-4 sm:p-5 hover:border-[#C9A84C]/40 transition-colors group">
                <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{v.icon}</div>
                {/* Card heading — font-semibold giống trang chủ */}
                <h3 className="text-[#F5EDD6] font-semibold mb-1 sm:mb-2 text-sm group-hover:text-[#C9A84C] transition-colors">{v.title}</h3>
                {/* Card body — text-xs mờ giống trang chủ */}
                <p className="text-xs text-[#F5EDD6]/50 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[#0F0D00] border-y border-[#2E2800]">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal variant="fadeUp" delay={0}>
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-6 h-px bg-[#C9A84C]" />
                <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">Hành trình</span>
                <span className="w-6 h-px bg-[#C9A84C]" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6]">
                Từ ý tưởng <span className="text-gold-gradient">đến thực tế</span>
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fadeUp" delay={100}>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[52px] sm:left-[60px] top-0 bottom-0 w-px bg-gradient-to-b from-[#C9A84C] via-[#C9A84C]/40 to-transparent" />
              <div className="space-y-6 sm:space-y-8">
                {milestones.map((m) => (
                  <div key={m.year} className="flex gap-5 sm:gap-8 items-start">
                    <div className="flex-shrink-0 w-[52px] sm:w-[60px] text-right">
                      {/* Year — font-medium tracking-wider giống section label trang chủ */}
                      <span className="text-xs sm:text-sm font-medium text-[#C9A84C] tracking-wider">{m.year}</span>
                    </div>
                    <div className="relative flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#C9A84C] border-2 border-[#0D0B00] mt-1" />
                    </div>
                    <div className="flex-1 pb-2">
                      {/* Event — text mờ giống body trang chủ */}
                      <p className="text-sm sm:text-base text-[#F5EDD6]/50 leading-relaxed">{m.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Team */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal variant="fadeUp" delay={0}>
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-6 h-px bg-[#C9A84C]" />
                <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">{theme.pageAbout.teamTitle}</span>
                <span className="w-6 h-px bg-[#C9A84C]" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6]">
                {theme.pageAbout.teamSubtitle}
              </h2>
            </div>
          </ScrollReveal>
          <StaggerReveal baseDelay={100} step={100} variant="fadeUp" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-4 sm:p-6 text-center hover:border-[#C9A84C]/40 transition-colors group">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center text-[#0D0B00] font-bold text-sm sm:text-lg mx-auto mb-3 sm:mb-4 group-hover:scale-105 transition-transform">
                  {member.avatar}
                </div>
                {/* Name — font-semibold giống card heading trang chủ */}
                <h3 className="text-[#F5EDD6] font-semibold mb-1 text-sm sm:text-base group-hover:text-[#C9A84C] transition-colors">{member.name}</h3>
                {/* Role — text-xs vàng giống section label trang chủ */}
                <p className="text-xs text-[#C9A84C] font-medium mb-2 sm:mb-3">{member.role}</p>
                {/* Bio — text-xs mờ giống card body trang chủ */}
                <p className="text-xs text-[#F5EDD6]/40 leading-relaxed hidden sm:block">{member.bio}</p>
              </div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-[#2E2800]">
        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-4"
              dangerouslySetInnerHTML={{ __html: theme.pageAbout.ctaTitle }}
            />
            <p className="text-[#F5EDD6]/50 mb-8 leading-relaxed">
              {theme.pageAbout.ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-8 py-3 rounded-full bg-gradient-to-r from-[#E2C97E] to-[#9A7A2E] text-[#0D0B00] font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {theme.pageAbout.ctaButton}
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3 rounded-full border border-[#C9A84C]/40 text-[#C9A84C] text-sm font-medium hover:bg-[#C9A84C]/10 transition-colors"
              >
                Thử Dashboard
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <Footer theme={theme} variant="full" />
    </>
  );
}
