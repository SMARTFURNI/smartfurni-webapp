import { NextRequest, NextResponse } from 'next/server';
import { aiAgent } from '@/lib/ai-agent';

export async function POST(request: NextRequest) {
  try {
    const {
      leadId,
      customerName,
      customerType,
      stage,
      expectedValue,
      lastInteractionDays,
      interactionCount,
    } = await request.json();

    if (!customerName || !customerType || !stage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate lead score using AI
    const scoreResult = await aiAgent.calculateLeadScore(
      customerName,
      customerType,
      stage,
      expectedValue || 0,
      lastInteractionDays || 0,
      interactionCount || 0
    );

    return NextResponse.json({
      success: true,
      leadId,
      score: scoreResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Lead scoring error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate lead score' },
      { status: 500 }
    );
  }
}
