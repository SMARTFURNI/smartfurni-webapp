import { describe, expect, it } from "vitest";
import {
  buildJourneySentActivity,
  journeySentActivityId,
} from "@/lib/crm-journey-activity";

describe("journey CRM activity", () => {
  it("uses a stable activity id for scheduler retries", () => {
    expect(journeySentActivityId("action-123")).toBe("journey-sent:action-123");
    expect(journeySentActivityId("action-123")).toBe(journeySentActivityId("action-123"));
  });

  it("builds a Zalo OA activity with shared media", () => {
    const activity = buildJourneySentActivity({
      leadId: "lead-1",
      channel: "zalo_oa",
      stepTitle: "Khơi đúng lợi ích",
      zaloBody: "Nội dung đã gửi thật",
      media: [{
        name: "demo.mp4",
        url: "/api/media/demo.mp4",
        contentType: "video/mp4",
        sizeBytes: 1024,
      }],
    });

    expect(activity.type).toBe("note");
    expect(activity.title).toBe("[Workflow] Đã gửi qua Zalo OA · Khơi đúng lợi ích");
    expect(activity.content).toBe("Nội dung đã gửi thật");
    expect(activity.createdBy).toBe("CRM Automation");
    expect(activity.attachments).toEqual([{
      name: "demo.mp4",
      url: "/api/media/demo.mp4",
      type: "video/mp4",
      size: 1024,
    }]);
  });

  it("records both subject and body for Email", () => {
    const activity = buildJourneySentActivity({
      leadId: "lead-1",
      channel: "email",
      stepTitle: "Một chiếc giường, nhiều trải nghiệm",
      emailSubject: "Nâng cấp trải nghiệm nghỉ ngơi",
      emailBody: "Nội dung email",
    });

    expect(activity.type).toBe("email");
    expect(activity.title).toContain("Đã gửi qua Email");
    expect(activity.content).toBe("Chủ đề: Nâng cấp trải nghiệm nghỉ ngơi\n\nNội dung email");
  });
});
