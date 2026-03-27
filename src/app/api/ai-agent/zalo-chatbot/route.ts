import { NextRequest, NextResponse } from 'next/server';
import { aiAgent } from '@/lib/ai-agent';

export async function POST(request: NextRequest) {
  try {
    const { message, customerId, customerName, customerType } = await request.json();

    if (!message || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate chatbot response using AI
    const response = await aiAgent.generateZaloChatbotResponse(
      message,
      customerName,
      customerType || 'Khách hàng'
    );

    // Analyze sentiment
    const sentiment = await aiAgent.analyzeSentiment(message);

    return NextResponse.json({
      success: true,
      customerId,
      response,
      sentiment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Zalo chatbot error:', error);
    return NextResponse.json(
      { error: 'Failed to generate chatbot response' },
      { status: 500 }
    );
  }
}
