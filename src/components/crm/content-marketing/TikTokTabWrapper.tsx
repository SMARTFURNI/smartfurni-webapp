"use client";
import TikTokTab from "../facebook-scheduler/TikTokTab";
import ScriptToPostBanner from "./ScriptToPostBanner";

export default function TikTokTabWrapper() {
  return (
    <div>
      <ScriptToPostBanner platform="tiktok" />
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", padding: "24px", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <TikTokTab />
      </div>
    </div>
  );
}
