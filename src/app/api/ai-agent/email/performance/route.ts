import { NextRequest, NextResponse } from 'next/server';
import {
  generatePerformanceReport,
  getCampaignMetrics,
  comparePerformance,
  getOverallStats,
  exportReportAsJSON,
  exportReportAsCSV,
} from '@/services/email-performance-analytics';

/**
 * GET /api/ai-agent/email/performance
 * Lấy báo cáo hiệu suất
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const campaignIds = searchParams.get('campaignIds')?.split(',');
    const format = searchParams.get('format') || 'json'; // json, csv

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu startDate hoặc endDate',
        },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Tạo báo cáo
    const report = generatePerformanceReport(start, end, campaignIds);

    // Xuất theo định dạng
    if (format === 'csv') {
      const csv = exportReportAsCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="email-performance-report.csv"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('[EMAIL-PERFORMANCE-API] Lỗi:', error);
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
 * GET /api/ai-agent/email/performance/campaign/[id]
 * Lấy metrics của một chiến dịch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu campaignId',
        },
        { status: 400 }
      );
    }

    const metrics = getCampaignMetrics(campaignId);

    if (!metrics) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chiến dịch không tìm thấy',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('[EMAIL-PERFORMANCE-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi lấy metrics',
      },
      { status: 500 }
    );
  }
}
