import { NextRequest, NextResponse } from 'next/server';
import { getScenarioById, getScenarioStats, getCampaignLogsByScenario } from '@/lib/email-scenario-store';

/**
 * GET /api/ai-agent/email/scenarios/[id]
 * Get scenario details with stats and logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const scenario = getScenarioById(id);
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    const stats = getScenarioStats(id);
    const logs = getCampaignLogsByScenario(id);

    return NextResponse.json({
      success: true,
      data: {
        scenario,
        stats,
        logs,
      },
    });
  } catch (error) {
    console.error('Failed to get scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get scenario',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-agent/email/scenarios/[id]
 * Update scenario
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const scenario = getScenarioById(id);
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Update scenario (in production, save to database)
    const updatedScenario = {
      ...scenario,
      ...body,
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: updatedScenario,
    });
  } catch (error) {
    console.error('Failed to update scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update scenario',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-agent/email/scenarios/[id]
 * Delete scenario
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const scenario = getScenarioById(id);
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Delete scenario (in production, delete from database)
    return NextResponse.json({
      success: true,
      message: 'Scenario deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete scenario',
      },
      { status: 500 }
    );
  }
}
