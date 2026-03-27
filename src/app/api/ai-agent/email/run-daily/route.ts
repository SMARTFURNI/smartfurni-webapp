import { NextRequest, NextResponse } from 'next/server';
import {
  runDailyEmailAutomation,
  getAutomationConfig,
  updateAutomationConfig,
  getAutomationLogs,
  getAutomationStats,
} from '@/services/email-automation-service';

/**
 * POST /api/ai-agent/email/run-daily
 * Chạy tự động hoá email hàng ngày
 * Được gọi bởi cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Xác thực cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'test-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[EMAIL-AUTOMATION-API] Nhận yêu cầu chạy tự động hoá email hàng ngày');

    // Chạy tự động hoá
    const result = await runDailyEmailAutomation();

    return NextResponse.json({
      success: true,
      data: {
        timestamp: result.timestamp,
        totalLeads: result.totalLeads,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
      },
    });
  } catch (error) {
    console.error('[EMAIL-AUTOMATION-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi chạy tự động hoá email',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-agent/email/run-daily
 * Lấy thông tin cấu hình và thống kê tự động hoá
 */
export async function GET(request: NextRequest) {
  try {
    const config = getAutomationConfig();
    const logs = getAutomationLogs(5);
    const stats = getAutomationStats();

    return NextResponse.json({
      success: true,
      data: {
        config,
        logs,
        stats,
      },
    });
  } catch (error) {
    console.error('[EMAIL-AUTOMATION-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi lấy thông tin tự động hoá',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-agent/email/run-daily
 * Cập nhật cấu hình tự động hoá
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, scheduleTime, timezone, emailTemplate, retryCount, retryDelay } = body;

    const config = updateAutomationConfig({
      enabled,
      scheduleTime,
      timezone,
      emailTemplate,
      retryCount,
      retryDelay,
    });

    console.log('[EMAIL-AUTOMATION-API] Cấu hình đã cập nhật');

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[EMAIL-AUTOMATION-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi cập nhật cấu hình',
      },
      { status: 500 }
    );
  }
}
