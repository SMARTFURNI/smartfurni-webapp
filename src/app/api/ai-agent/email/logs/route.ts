import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ai-agent/email/logs
 * Get email automation logs
 */
export async function GET(request: NextRequest) {
  try {
    // Mock data for demo
    // In production, this would query from database
    const logs = [
      {
        id: 'log-001',
        leadName: 'Phạm Nhất Bá Tuật',
        email: 'contact.foodcom@gmail.com',
        subject: 'Giải Pháp Giường Điều Khiển Thông Minh Cho 2 Phòng - SmartFurni',
        sentAt: new Date().toISOString(),
        status: 'success' as const,
        messageId: 'msg-123456',
      },
      {
        id: 'log-002',
        leadName: 'Lê Thị Hương',
        email: 'lethihuong@gmail.com',
        subject: 'Giải Pháp Giường Điều Khiển Thông Minh Cho 3 Phòng - SmartFurni',
        sentAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'success' as const,
        messageId: 'msg-123457',
      },
      {
        id: 'log-003',
        leadName: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        subject: 'Giải Pháp Giường Điều Khiển Thông Minh Cho 1 Phòng - SmartFurni',
        sentAt: new Date(Date.now() - 7200000).toISOString(),
        status: 'failed' as const,
        error: 'Invalid email address',
      },
      {
        id: 'log-004',
        leadName: 'Trần Thị B',
        email: 'tranthib@example.com',
        subject: 'Giải Pháp Giường Điều Khiển Thông Minh Cho 2 Phòng - SmartFurni',
        sentAt: new Date(Date.now() - 10800000).toISOString(),
        status: 'success' as const,
        messageId: 'msg-123458',
      },
    ];

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Failed to get email logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get email logs',
      },
      { status: 500 }
    );
  }
}
