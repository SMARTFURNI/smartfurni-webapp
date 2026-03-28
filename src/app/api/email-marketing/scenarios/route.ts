import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

interface EmailScenario {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'paused' | 'draft';
  createdAt: string;
}

// Mock data
let scenarios: EmailScenario[] = [];

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: scenarios });
  } catch (error) {
    console.error("[email-scenarios] GET error:", error);
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách scenarios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, trigger } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tên scenario không được để trống" },
        { status: 400 }
      );
    }

    const scenario: EmailScenario = {
      id: randomUUID(),
      name,
      description: description || "",
      trigger: trigger || "new_lead",
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    scenarios.push(scenario);
    return NextResponse.json({ success: true, data: scenario });
  } catch (error) {
    console.error("[email-scenarios] POST error:", error);
    return NextResponse.json({ success: false, error: "Lỗi tạo scenario" }, { status: 500 });
  }
}
