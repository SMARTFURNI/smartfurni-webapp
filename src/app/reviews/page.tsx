import { getTheme } from "@/lib/theme-store";
import VideoReviewsClient from "@/components/landing/VideoReviewsClient";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video Reviews | SmartFurni",
  description: "Xem video đánh giá thực tế từ khách hàng đã dùng SmartFurni. Review trung thực, không kịch bản, không tài trợ.",
  alternates: { canonical: absoluteUrl("/reviews") },
  openGraph: {
    title: "Video Reviews thực tế — SmartFurni",
    description: "Khách hàng chia sẻ trải nghiệm thực tế sau khi sử dụng giường SmartFurni.",
    type: "website",
    url: absoluteUrl("/reviews"),
  },
};

export default function ReviewsPage() {
  const theme = getTheme();
  return <VideoReviewsClient theme={theme} />;
}
