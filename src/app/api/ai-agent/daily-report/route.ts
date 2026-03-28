import { NextRequest, NextResponse } from 'next/server';
import {
  generateDailyReport,
  getPerformanceHistory,
  saveReport,
  sendReportEmail,
} from '@/services/daily-performance-tracker';

/**
 * GET /api/ai-agent/daily-report
 * Lấy báo cáo hiệu suất hôm nay
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '1');
    const format = searchParams.get('format') || 'json'; // json, email

    if (days === 1) {
      // Lấy báo cáo hôm nay
      const report = generateDailyReport();

      if (format === 'email') {
        return NextResponse.json({
          success: true,
          data: {
            report,
            emailFormat: true,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: report,
      });
    } else {
      // Lấy lịch sử báo cáo
      const history = getPerformanceHistory(days);

      return NextResponse.json({
        success: true,
        data: history,
      });
    }
  } catch (error) {
    console.error('[DAILY-REPORT-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi tạo báo cáo',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agent/daily-report
 * Tạo và gửi báo cáo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sendEmail, recipients } = body;

    // Tạo báo cáo
    const report = generateDailyReport();

    // Lưu báo cáo
    saveReport(report);

    // Gửi email nếu cần
    if (sendEmail && recipients && recipients.length > 0) {
      for (const email of recipients) {
        await sendReportEmail(report, email);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        report,
        emailSent: sendEmail ? recipients.length : 0,
      },
    });
  } catch (error) {
    console.error('[DAILY-REPORT-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi tạo báo cáo',
      },
      { status: 500 }
    );
  }
}
