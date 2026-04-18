"use client";
import FacebookSchedulerClient from "../facebook-scheduler/FacebookSchedulerClient";
import ScriptToPostBanner from "./ScriptToPostBanner";

export default function FacebookTabWrapper() {
  return (
    <div>
      <ScriptToPostBanner platform="facebook" />
      <FacebookSchedulerClient />
    </div>
  );
}
