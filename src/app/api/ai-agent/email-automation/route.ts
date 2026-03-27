import { NextRequest, NextResponse } from 'next/server';
import { aiAgent } from '@/lib/ai-agent';

export async function POST(request: NextRequest) {
  try {
    const { leadId, customerName, customerType, stage, lastInteraction } = await request.json();

    if (!customerName || !customerType || !stage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate email content using AI
    const emailContent = await aiAgent.generateEmailContent(
      customerName,
      customerType,
      stage,
      lastInteraction ? new Date(lastInteraction) : undefined
    );

    // Here you would send the email using your email service
    // For now, just return the generated content

    return NextResponse.json({
      success: true,
      leadId,
      emailContent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email automation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email content' },
      { status: 500 }
    );
  }
}
