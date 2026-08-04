import { notFound } from "next/navigation";
import { getPublicZaloGmfSourceLink } from "@/lib/zalo-gmf-attribution-store";
import { initZaloGmfSchema } from "@/lib/zalo-gmf-store";
import { getZaloOAConfig } from "@/lib/zalo-oa-store";
import ZaloGroupJoinClient from "@/components/zalo-group/ZaloGroupJoinClient";

export const dynamic = "force-dynamic";

export default async function ZaloGroupJoinPage({ params }: { params: Promise<{ slug: string }> }) {
  await initZaloGmfSchema();
  const { slug } = await params;
  const [link, config] = await Promise.all([getPublicZaloGmfSourceLink(slug), getZaloOAConfig()]);
  if (!link) notFound();
  return <ZaloGroupJoinClient link={link} appId={config.appId} />;
}
