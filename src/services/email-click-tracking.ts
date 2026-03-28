/**
 * Email Click Tracking Service
 * Theo dõi khi khách hàng nhấp vào các link trong email
 * Gửi thông báo cho Sales team
 */

export interface ClickEvent {
  id: string;
  leadId: string;
  leadName: string;
  email: string;
  linkType: 'quotation' | 'product' | 'demo' | 'contact' | 'website';
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ClickNotification {
  id: string;
  clickEvent: ClickEvent;
  notificationType: 'browser' | 'email' | 'slack' | 'sms';
  recipients: string[];
  message: string;
  sent: boolean;
  sentAt?: string;
}

/**
 * Tạo tracking URL cho email link
 * Khi khách click, sẽ gọi API notify-click
 */
export function createTrackingUrl(
  originalUrl: string,
  leadId: string,
  linkType: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smartfurni-webapp-production.up.railway.app';
  const trackingUrl = new URL(`${baseUrl}/api/email-marketing/track-click`);
  
  trackingUrl.searchParams.set('url', originalUrl);
  trackingUrl.searchParams.set('leadId', leadId);
  trackingUrl.searchParams.set('linkType', linkType);
  
  return trackingUrl.toString();
}

/**
 * Ghi lại click event
 */
export async function recordClickEvent(
  leadId: string,
  leadName: string,
  email: string,
  linkType: string
): Promise<ClickEvent> {
  const clickEvent: ClickEvent = {
    id: `click-${Date.now()}`,
    leadId,
    leadName,
    email,
    linkType: linkType as any,
    timestamp: new Date().toISOString(),
  };

  // TODO: Save to database
  // await saveClickEvent(clickEvent);

  return clickEvent;
}

/**
 * Tạo thông báo cho Sales team
 */
export function createClickNotification(
  clickEvent: ClickEvent,
  recipients: string[]
): ClickNotification {
  const message = formatNotificationMessage(clickEvent);

  return {
    id: `notif-${Date.now()}`,
    clickEvent,
    notificationType: 'browser',
    recipients,
    message,
    sent: false,
  };
}

/**
 * Format thông báo
 */
function formatNotificationMessage(clickEvent: ClickEvent): string {
  const linkTypeLabel = getLinkTypeLabel(clickEvent.linkType);
  const time = new Date(clickEvent.timestamp).toLocaleString('vi-VN');

  return `
🔔 Khách hàng vừa tương tác với email!

👤 ${clickEvent.leadName}
📧 ${clickEvent.email}
🔗 Nhấp vào: ${linkTypeLabel}
⏰ Lúc: ${time}

👉 Hãy liên hệ ngay để tăng cơ hội chốt đơn!
  `.trim();
}

/**
 * Gửi thông báo trình duyệt
 */
export async function sendBrowserNotification(
  notification: ClickNotification
): Promise<boolean> {
  try {
    // TODO: Implement browser notification using Web Push API
    // This would require Service Worker setup
    console.log('[click-tracking] Browser notification:', notification.message);
    return true;
  } catch (error) {
    console.error('[click-tracking] Error sending browser notification:', error);
    return false;
  }
}

/**
 * Gửi thông báo email
 */
export async function sendEmailNotification(
  notification: ClickNotification
): Promise<boolean> {
  try {
    // TODO: Send email notification to sales team
    console.log('[click-tracking] Email notification sent to:', notification.recipients);
    return true;
  } catch (error) {
    console.error('[click-tracking] Error sending email notification:', error);
    return false;
  }
}

/**
 * Gửi thông báo Slack
 */
export async function sendSlackNotification(
  notification: ClickNotification,
  webhookUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: notification.message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: notification.message,
            },
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[click-tracking] Error sending Slack notification:', error);
    return false;
  }
}

/**
 * Lấy nhãn cho loại link
 */
function getLinkTypeLabel(linkType: string): string {
  const labels: Record<string, string> = {
    quotation: '📋 Xem Báo Giá',
    product: '🛍️ Xem Sản Phẩm',
    demo: '🎥 Đăng Ký Demo',
    contact: '📞 Liên Hệ',
    website: '🌐 Website',
  };
  return labels[linkType] || linkType;
}

/**
 * Tính toán thống kê click
 */
export interface ClickStats {
  totalClicks: number;
  uniqueClicks: number;
  clicksByType: Record<string, number>;
  clicksByLead: Record<string, number>;
  averageTimeToClick: number;
}

export function calculateClickStats(clickEvents: ClickEvent[]): ClickStats {
  const stats: ClickStats = {
    totalClicks: clickEvents.length,
    uniqueClicks: new Set(clickEvents.map((e) => e.leadId)).size,
    clicksByType: {},
    clicksByLead: {},
    averageTimeToClick: 0,
  };

  clickEvents.forEach((event) => {
    // Count by type
    stats.clicksByType[event.linkType] = (stats.clicksByType[event.linkType] || 0) + 1;

    // Count by lead
    stats.clicksByLead[event.leadId] = (stats.clicksByLead[event.leadId] || 0) + 1;
  });

  return stats;
}
