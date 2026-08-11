import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ZaloFollowLandingClient from "@/components/zalo-follow/ZaloFollowLandingClient";
import { getPublicZaloFollowCampaign } from "@/lib/zalo-follow-campaign-store";
import { getZaloOAConfig, initZaloOASchema } from "@/lib/zalo-oa-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nhận tư vấn và báo giá qua Zalo | SmartFurni",
  description: "Quan tâm Zalo OA SmartFurni để nhận tư vấn sản phẩm, catalogue và báo giá phù hợp.",
  robots: { index: false, follow: false },
};

export default async function ZaloFollowLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  await initZaloOASchema();
  const { slug } = await params;
  const [campaign, config] = await Promise.all([getPublicZaloFollowCampaign(slug), getZaloOAConfig()]);
  if (!campaign) notFound();
  return <ZaloFollowLandingClient campaign={campaign} appId={config.appId} />;
}
