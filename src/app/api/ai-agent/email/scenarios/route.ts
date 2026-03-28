import { NextRequest, NextResponse } from 'next/server';
import {
  getAllScenarios,
  createScenario,
  getScenarioStats,
  findApplicableScenarios,
} from '@/services/email-scenario-builder';

/**
 * GET /api/ai-agent/email/scenarios
 * Lấy danh sách tất cả kịch bản
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerType = searchParams.get('triggerType');
    const leadScore = searchParams.get('leadScore');
    const leadStage = searchParams.get('leadStage');
    const leadSource = searchParams.get('leadSource');

    let scenarios;

    // Nếu có tham số lead, tìm kịch bản áp dụng
    if (leadScore || leadStage || leadSource) {
      scenarios = findApplicableScenarios({
        score: leadScore ? parseInt(leadScore) : undefined,
        stage: leadStage || undefined,
        source: leadSource || undefined,
      });
    } else {
      scenarios = getAllScenarios();
    }

    const stats = getScenarioStats();

    return NextResponse.json({
      success: true,
      data: scenarios,
      stats,
    });
  } catch (error) {
    console.error('[EMAIL-SCENARIOS-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi lấy danh sách kịch bản',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agent/email/scenarios
 * Tạo kịch bản mới
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, trigger, steps, enabled } = body;

    // Validate
    if (!name || !trigger || !steps || steps.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu thông tin bắt buộc',
        },
        { status: 400 }
      );
    }

    const scenario = createScenario({
      name,
      description,
      trigger,
      steps,
      enabled: enabled !== false,
    });

    return NextResponse.json({
      success: true,
      data: scenario,
    });
  } catch (error) {
    console.error('[EMAIL-SCENARIOS-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi tạo kịch bản',
      },
      { status: 500 }
    );
  }
}
