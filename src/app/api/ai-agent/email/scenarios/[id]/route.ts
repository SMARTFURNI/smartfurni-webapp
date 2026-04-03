import { NextRequest, NextResponse } from 'next/server';
import {
  getScenarioById,
  updateScenario,
  deleteScenario,
  executeScenario,
} from '@/services/email-scenario-builder';

/**
 * GET /api/ai-agent/email/scenarios/[id]
 * Lấy chi tiết kịch bản
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scenario = getScenarioById((await params).id);

    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kịch bản không tìm thấy',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scenario,
    });
  } catch (error) {
    console.error('[EMAIL-SCENARIOS-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi lấy kịch bản',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-agent/email/scenarios/[id]
 * Cập nhật kịch bản
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, description, trigger, steps, enabled } = body;

    const scenario = updateScenario((await params).id, {
      name,
      description,
      trigger,
      steps,
      enabled,
    });

    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kịch bản không tìm thấy',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scenario,
    });
  } catch (error) {
    console.error('[EMAIL-SCENARIOS-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi cập nhật kịch bản',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-agent/email/scenarios/[id]
 * Xóa kịch bản
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const success = deleteScenario((await params).id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kịch bản không tìm thấy',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kịch bản đã được xóa',
    });
  } catch (error) {
    console.error('[EMAIL-SCENARIOS-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi xóa kịch bản',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agent/email/scenarios/[id]/execute
 * Thực thi kịch bản cho một lead
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scenario = getScenarioById((await params).id);

    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kịch bản không tìm thấy',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { leadData } = body;

    if (!leadData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu dữ liệu lead',
        },
        { status: 400 }
      );
    }

    // Thực thi kịch bản
    const result = await executeScenario(scenario, leadData);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[EMAIL-SCENARIOS-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi thực thi kịch bản',
      },
      { status: 500 }
    );
  }
}
