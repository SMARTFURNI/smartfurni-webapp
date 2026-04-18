"use client";
import TikTokTab from "../facebook-scheduler/TikTokTab";
import ScriptToPostBanner from "./ScriptToPostBanner";

export default function TikTokTabWrapper() {
  return (
    <div>
      <ScriptToPostBanner platform="tiktok" />
      <TikTokTab />
    </div>
  );
}
