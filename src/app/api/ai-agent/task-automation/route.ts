import { NextRequest, NextResponse } from 'next/server';
import { aiAgent } from '@/lib/ai-agent';

export async function POST(request: NextRequest) {
  try {
    const { leadId, customerName, customerType, stage, daysSinceLastInteraction } = await request.json();

    if (!customerName || !customerType || !stage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate task suggestions using AI
    const tasks = await aiAgent.generateTaskSuggestions(
      customerName,
      customerType,
      stage,
      daysSinceLastInteraction || 0
    );

    return NextResponse.json({
      success: true,
      leadId,
      tasks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Task automation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate task suggestions' },
      { status: 500 }
    );
  }
}
