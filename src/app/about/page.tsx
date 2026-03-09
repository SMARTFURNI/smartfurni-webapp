"use client";

import Link from "next/link";

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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0D0B00] text-[#F5EDD6]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2E2800] bg-[#0D0B00]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center text-[#0D0B00] font-bold text-sm">
              SF
            </div>
            <span className="font-brand text-[#C9A84C] tracking-widest text-sm uppercase">SmartFurni</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Trang chủ</Link>
            <Link href="/about" className="text-sm text-[#C9A84C] border-b border-[#C9A84C] pb-0.5">Giới thiệu</Link>
            <Link href="/contact" className="text-sm text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Liên hệ</Link>
            <Link href="/dashboard" className="text-sm px-4 py-2 rounded-full border border-[#C9A84C40] text-[#C9A84C] hover:bg-[#C9A84C15] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] text-[#C9A84C] uppercase mb-4">Về chúng tôi</p>
          <h1 className="font-brand text-5xl md:text-6xl text-[#E2C97E] mb-6 leading-tight">
            Tái định nghĩa<br />giấc ngủ Việt Nam
          </h1>
          <p className="text-lg text-[#9A8A6A] leading-relaxed max-w-2xl mx-auto">
            SmartFurni được thành lập với sứ mệnh đưa công nghệ điều khiển thông minh vào từng gia đình Việt Nam — 
            giúp mỗi người có được giấc ngủ sâu, phục hồi sức khỏe và bắt đầu ngày mới tràn đầy năng lượng.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-[#2E2800]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.value} className="text-center">
              <div className="font-brand text-4xl text-[#C9A84C] mb-2">{s.value}</div>
              <div className="text-sm text-[#9A8A6A]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs tracking-[0.3em] text-[#C9A84C] uppercase mb-4">Sứ mệnh</p>
            <h2 className="font-brand text-4xl text-[#E2C97E] mb-6">
              Công nghệ phục vụ<br />con người
            </h2>
            <p className="text-[#9A8A6A] leading-relaxed mb-4">
              Chúng tôi tin rằng công nghệ thông minh không chỉ dành cho những ngôi nhà sang trọng. 
              SmartFurni được thiết kế để bất kỳ ai cũng có thể trải nghiệm sự thoải mái và tiện nghi 
              của một chiếc giường điều chỉnh thông minh.
            </p>
            <p className="text-[#9A8A6A] leading-relaxed">
              Từ người cao tuổi cần hỗ trợ ngồi dậy mỗi sáng, đến người trẻ muốn tối ưu hóa giấc ngủ 
              sau ngày làm việc căng thẳng — SmartFurni có giải pháp cho mọi nhu cầu.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {values.map((v) => (
              <div key={v.title} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-5 hover:border-[#C9A84C40] transition-colors">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="text-[#E2C97E] font-semibold mb-2">{v.title}</h3>
                <p className="text-xs text-[#9A8A6A] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6 bg-[#0F0D00]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-[#C9A84C] uppercase mb-4">Hành trình</p>
            <h2 className="font-brand text-4xl text-[#E2C97E]">Từ ý tưởng đến thực tế</h2>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[60px] top-0 bottom-0 w-px bg-gradient-to-b from-[#C9A84C] via-[#C9A84C40] to-transparent" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <div key={m.year} className="flex gap-8 items-start">
                  <div className="flex-shrink-0 w-[60px] text-right">
                    <span className="text-sm font-semibold text-[#C9A84C]">{m.year}</span>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-[#C9A84C] border-2 border-[#0D0B00] mt-1" />
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-[#9A8A6A] leading-relaxed">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-[#C9A84C] uppercase mb-4">Đội ngũ</p>
            <h2 className="font-brand text-4xl text-[#E2C97E]">Những người tạo nên SmartFurni</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-6 text-center hover:border-[#C9A84C40] transition-colors group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center text-[#0D0B00] font-bold text-lg mx-auto mb-4 group-hover:scale-105 transition-transform">
                  {member.avatar}
                </div>
                <h3 className="text-[#E2C97E] font-semibold mb-1">{member.name}</h3>
                <p className="text-xs text-[#C9A84C] mb-3">{member.role}</p>
                <p className="text-xs text-[#9A8A6A] leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-[#2E2800]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-brand text-4xl text-[#E2C97E] mb-4">Bắt đầu hành trình cùng SmartFurni</h2>
          <p className="text-[#9A8A6A] mb-8">Liên hệ với chúng tôi để được tư vấn và trải nghiệm thử tại showroom gần nhất.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="px-8 py-3 rounded-full bg-gradient-to-r from-[#E2C97E] to-[#9A7A2E] text-[#0D0B00] font-semibold hover:opacity-90 transition-opacity">
              Liên hệ ngay
            </Link>
            <Link href="/dashboard" className="px-8 py-3 rounded-full border border-[#C9A84C40] text-[#C9A84C] hover:bg-[#C9A84C15] transition-colors">
              Thử Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#2E2800]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center text-[#0D0B00] font-bold text-xs">SF</div>
            <span className="font-brand text-[#C9A84C] tracking-widest text-xs uppercase">SmartFurni</span>
          </div>
          <p className="text-xs text-[#9A8A6A]">© 2026 SmartFurni. Nội thất thông minh Việt Nam.</p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Trang chủ</Link>
            <Link href="/about" className="text-xs text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Giới thiệu</Link>
            <Link href="/contact" className="text-xs text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Liên hệ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
