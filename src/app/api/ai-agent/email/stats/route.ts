import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ai-agent/email/stats
 * Get email automation statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Mock data for demo
    // In production, this would query from database
    const stats = {
      totalSent: 42,
      totalOpened: 28,
      totalClicked: 14,
      totalConverted: 7,
      openRate: (28 / 42) * 100,
      clickRate: (14 / 42) * 100,
      conversionRate: (7 / 42) * 100,
      lastRunTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      nextRunTime: new Date(Date.now() + 82800000).toISOString(), // Tomorrow 9 AM
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get email stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get email stats',
      },
      { status: 500 }
    );
  }
}
