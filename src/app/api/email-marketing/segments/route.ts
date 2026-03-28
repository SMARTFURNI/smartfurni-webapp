import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SEGMENTS, createSegment } from "@/services/lead-segmentation-service";

export async function GET() {
  try {
    // TODO: Fetch from database
    // For now, return default segments
    return NextResponse.json({
      success: true,
      data: DEFAULT_SEGMENTS,
    });
  } catch (error) {
    console.error("[segments] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi lấy danh sách segments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, criteria, tags } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tên segment không được để trống" },
        { status: 400 }
      );
    }

    const segment = createSegment(name, description || "", criteria || {}, tags || []);

    // TODO: Save to database

    return NextResponse.json({
      success: true,
      data: segment,
    });
  } catch (error) {
    console.error("[segments] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi tạo segment" },
      { status: 500 }
    );
  }
}
