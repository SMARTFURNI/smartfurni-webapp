"use client";
import FacebookSchedulerClient from "../facebook-scheduler/FacebookSchedulerClient";
import ScriptToPostBanner from "./ScriptToPostBanner";

export default function FacebookTabWrapper() {
  return (
    <div>
      <ScriptToPostBanner platform="facebook" />
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", padding: "24px", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <FacebookSchedulerClient />
      </div>
    </div>
  );
}
