import { NextRequest, NextResponse } from 'next/server';
import { mockScenarios, getScenarioStats } from '@/lib/email-scenario-store';

/**
 * GET /api/ai-agent/email/scenarios
 * Get all email scenarios
 */
export async function GET(request: NextRequest) {
  try {
    const scenarios = mockScenarios.map((scenario) => ({
      ...scenario,
      stats: getScenarioStats(scenario.id),
    }));

    return NextResponse.json({
      success: true,
      data: scenarios,
    });
  } catch (error) {
    console.error('Failed to get scenarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get scenarios',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agent/email/scenarios
 * Create a new email scenario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, trigger, steps, enabled } = body;

    if (!name || !trigger || !steps || steps.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, trigger, steps',
        },
        { status: 400 }
      );
    }

    // Create new scenario (in production, save to database)
    const newScenario = {
      id: `scenario-${Date.now()}`,
      name,
      description,
      trigger,
      steps,
      enabled: enabled !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: newScenario,
    });
  } catch (error) {
    console.error('Failed to create scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create scenario',
      },
      { status: 500 }
    );
  }
}
