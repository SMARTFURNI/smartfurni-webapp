import { getTheme } from "@/lib/theme-store";
import SleepAdvisorClient from "@/components/landing/SleepAdvisorClient";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "AI Sleep Advisor — Tư vấn giường thông minh | SmartFurni",
  description: "Trả lời 5 câu hỏi để AI tìm giường SmartFurni phù hợp nhất với thói quen ngủ và nhu cầu sức khỏe của bạn.",
  alternates: { canonical: absoluteUrl("/sleep-advisor") },
};

export default async function SleepAdvisorPage() {
  const theme = await getTheme();
  return <SleepAdvisorClient theme={theme} />;
}
