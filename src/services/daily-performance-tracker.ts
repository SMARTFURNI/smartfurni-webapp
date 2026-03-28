/**
 * Daily Performance Tracker Service
 * Theo dõi hiệu suất email và lead scoring hàng ngày
 */

export interface DailyPerformanceReport {
  date: Date;
  emailMetrics: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  leadMetrics: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    averageScore: number;
    scoreDistribution: {
      '0-20': number;
      '21-40': number;
      '41-60': number;
      '61-80': number;
      '81-100': number;
    };
  };
  topPerformers: {
    bestEmailTemplate: string;
    bestLeadSource: string;
    bestConversionTime: string;
  };
  trends: {
    emailOpenRateTrend: number; // % change từ hôm qua
    conversionRateTrend: number;
    leadScoreTrend: number;
  };
  recommendations: string[];
}

export interface PerformanceHistory {
  date: Date;
  reports: DailyPerformanceReport[];
}

// Mock dữ liệu hôm qua
const yesterdayData = {
  emailMetrics: {
    totalSent: 2000,
    totalOpened: 1300,
    totalClicked: 740,
    totalConverted: 140,
    openRate: 65,
    clickRate: 37,
    conversionRate: 7,
  },
  leadMetrics: {
    totalLeads: 400,
    hotLeads: 140,
    warmLeads: 180,
    coldLeads: 80,
    averageScore: 68.5,
  },
};

// Mock dữ liệu hôm nay
const todayData = {
  emailMetrics: {
    totalSent: 2500,
    totalOpened: 1625,
    totalClicked: 931,
    totalConverted: 175,
    openRate: 65,
    clickRate: 37.2,
    conversionRate: 7,
  },
  leadMetrics: {
    totalLeads: 500,
    hotLeads: 175,
    warmLeads: 225,
    coldLeads: 100,
    averageScore: 71.2,
  },
};

/**
 * Tạo báo cáo hiệu suất hàng ngày
 */
export function generateDailyReport(): DailyPerformanceReport {
  const emailMetrics = todayData.emailMetrics;
  const leadMetrics = todayData.leadMetrics;

  // Tính trend
  const emailOpenRateTrend = ((emailMetrics.openRate - yesterdayData.emailMetrics.openRate) / yesterdayData.emailMetrics.openRate) * 100;
  const conversionRateTrend = ((emailMetrics.conversionRate - yesterdayData.emailMetrics.conversionRate) / yesterdayData.emailMetrics.conversionRate) * 100;
  const leadScoreTrend = ((leadMetrics.averageScore - yesterdayData.leadMetrics.averageScore) / yesterdayData.leadMetrics.averageScore) * 100;

  // Tính phân phối điểm lead
  const scoreDistribution = {
    '0-20': Math.round(leadMetrics.totalLeads * 0.05),
    '21-40': Math.round(leadMetrics.totalLeads * 0.10),
    '41-60': Math.round(leadMetrics.totalLeads * 0.25),
    '61-80': Math.round(leadMetrics.totalLeads * 0.35),
    '81-100': Math.round(leadMetrics.totalLeads * 0.25),
  };

  // Tạo khuyến nghị
  const recommendations = generateRecommendations(
    emailMetrics,
    leadMetrics,
    emailOpenRateTrend,
    conversionRateTrend,
    leadScoreTrend
  );

  return {
    date: new Date(),
    emailMetrics,
    leadMetrics: {
      ...leadMetrics,
      scoreDistribution: scoreDistribution as any,
    },
    topPerformers: {
      bestEmailTemplate: 'Special Offer Email',
      bestLeadSource: 'Facebook Ads',
      bestConversionTime: '2-3 ngày sau nhận email',
    },
    trends: {
      emailOpenRateTrend,
      conversionRateTrend,
      leadScoreTrend,
    },
    recommendations,
  };
}

/**
 * Tạo khuyến nghị dựa trên dữ liệu
 */
function generateRecommendations(
  emailMetrics: any,
  leadMetrics: any,
  emailOpenRateTrend: number,
  conversionRateTrend: number,
  leadScoreTrend: number
): string[] {
  const recommendations: string[] = [];

  // Email recommendations
  if (emailMetrics.openRate < 50) {
    recommendations.push('📧 Tối ưu hoá subject line - Open rate dưới 50%');
  } else if (emailMetrics.openRate > 70) {
    recommendations.push('✅ Subject line rất tốt - Tiếp tục duy trì');
  }

  if (emailMetrics.clickRate < 30) {
    recommendations.push('🔗 Cải thiện CTA - Click rate dưới 30%');
  } else if (emailMetrics.clickRate > 50) {
    recommendations.push('✅ CTA rất hiệu quả - Khách hàng tương tác tốt');
  }

  if (emailMetrics.conversionRate < 5) {
    recommendations.push('💰 Tối ưu hoá landing page - Conversion rate thấp');
  } else if (emailMetrics.conversionRate > 10) {
    recommendations.push('✅ Conversion rate cao - Khách hàng sẵn sàng mua');
  }

  // Lead scoring recommendations
  const hotLeadPercentage = (leadMetrics.hotLeads / leadMetrics.totalLeads) * 100;
  const warmLeadPercentage = (leadMetrics.warmLeads / leadMetrics.totalLeads) * 100;

  if (hotLeadPercentage > 30) {
    recommendations.push('🔥 Tỷ lệ hot lead cao - Tăng ngân sách sales');
  } else if (hotLeadPercentage < 20) {
    recommendations.push('❄️ Tỷ lệ hot lead thấp - Cải thiện lead qualification');
  }

  if (warmLeadPercentage > 40) {
    recommendations.push('🟠 Nhiều warm lead - Tăng nurture campaign');
  }

  // Trend recommendations
  if (emailOpenRateTrend > 5) {
    recommendations.push('📈 Open rate tăng - Chiến lược hiệu quả');
  } else if (emailOpenRateTrend < -5) {
    recommendations.push('📉 Open rate giảm - Cần xem xét lại');
  }

  if (conversionRateTrend > 10) {
    recommendations.push('🎯 Conversion rate tăng mạnh - Tiếp tục chiến dịch');
  }

  if (leadScoreTrend > 3) {
    recommendations.push('⬆️ Lead score trung bình tăng - Chất lượng lead cải thiện');
  }

  return recommendations;
}

/**
 * Lấy báo cáo hiệu suất cho một khoảng thời gian
 */
export function getPerformanceHistory(days: number = 7): PerformanceHistory {
  const reports: DailyPerformanceReport[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Mock dữ liệu với biến động nhỏ
    const variance = Math.random() * 0.1 - 0.05; // -5% to +5%
    
    reports.push({
      date,
      emailMetrics: {
        totalSent: Math.round(2500 * (1 + variance)),
        totalOpened: Math.round(1625 * (1 + variance)),
        totalClicked: Math.round(931 * (1 + variance)),
        totalConverted: Math.round(175 * (1 + variance)),
        openRate: 65 + variance * 100,
        clickRate: 37.2 + variance * 100,
        conversionRate: 7 + variance * 100,
      },
      leadMetrics: {
        totalLeads: Math.round(500 * (1 + variance)),
        hotLeads: Math.round(175 * (1 + variance)),
        warmLeads: Math.round(225 * (1 + variance)),
        coldLeads: Math.round(100 * (1 + variance)),
        averageScore: 71.2 + variance * 10,
        scoreDistribution: {
          '0-20': Math.round(500 * 0.05 * (1 + variance)),
          '21-40': Math.round(500 * 0.10 * (1 + variance)),
          '41-60': Math.round(500 * 0.25 * (1 + variance)),
          '61-80': Math.round(500 * 0.35 * (1 + variance)),
          '81-100': Math.round(500 * 0.25 * (1 + variance)),
        },
      },
      topPerformers: {
        bestEmailTemplate: 'Special Offer Email',
        bestLeadSource: 'Facebook Ads',
        bestConversionTime: '2-3 ngày sau nhận email',
      },
      trends: {
        emailOpenRateTrend: variance * 100,
        conversionRateTrend: variance * 100,
        leadScoreTrend: variance * 10,
      },
      recommendations: generateRecommendations(
        { openRate: 65, clickRate: 37.2, conversionRate: 7 },
        { totalLeads: 500, hotLeads: 175, warmLeads: 225, coldLeads: 100, averageScore: 71.2 },
        variance * 100,
        variance * 100,
        variance * 10
      ),
    });
  }

  return {
    date: new Date(),
    reports,
  };
}

/**
 * Xuất báo cáo dưới dạng email
 */
export function formatReportAsEmail(report: DailyPerformanceReport): string {
  const date = report.date.toLocaleDateString('vi-VN');
  
  return `
📊 BÁNG CÁO HIỆU SUẤT HÀNG NGÀY - ${date}

═══════════════════════════════════════════════════════════

📧 EMAIL METRICS
─────────────────────────────────────────────────────────
• Tổng gửi: ${report.emailMetrics.totalSent.toLocaleString('vi-VN')} email
• Tổng mở: ${report.emailMetrics.totalOpened.toLocaleString('vi-VN')} (${report.emailMetrics.openRate.toFixed(1)}%)
• Tổng click: ${report.emailMetrics.totalClicked.toLocaleString('vi-VN')} (${report.emailMetrics.clickRate.toFixed(1)}%)
• Tổng chuyển đổi: ${report.emailMetrics.totalConverted.toLocaleString('vi-VN')} (${report.emailMetrics.conversionRate.toFixed(1)}%)

📊 LEAD SCORING
─────────────────────────────────────────────────────────
• Tổng lead: ${report.leadMetrics.totalLeads.toLocaleString('vi-VN')}
• Hot lead (80+): ${report.leadMetrics.hotLeads} (${((report.leadMetrics.hotLeads / report.leadMetrics.totalLeads) * 100).toFixed(1)}%)
• Warm lead (50-79): ${report.leadMetrics.warmLeads} (${((report.leadMetrics.warmLeads / report.leadMetrics.totalLeads) * 100).toFixed(1)}%)
• Cold lead (<50): ${report.leadMetrics.coldLeads} (${((report.leadMetrics.coldLeads / report.leadMetrics.totalLeads) * 100).toFixed(1)}%)
• Điểm trung bình: ${report.leadMetrics.averageScore.toFixed(1)}/100

🎯 TOP PERFORMERS
─────────────────────────────────────────────────────────
• Email tốt nhất: ${report.topPerformers.bestEmailTemplate}
• Nguồn lead tốt: ${report.topPerformers.bestLeadSource}
• Thời gian chuyển đổi: ${report.topPerformers.bestConversionTime}

📈 TRENDS
─────────────────────────────────────────────────────────
• Open rate trend: ${report.trends.emailOpenRateTrend > 0 ? '📈 +' : '📉 '}${report.trends.emailOpenRateTrend.toFixed(1)}%
• Conversion rate trend: ${report.trends.conversionRateTrend > 0 ? '📈 +' : '📉 '}${report.trends.conversionRateTrend.toFixed(1)}%
• Lead score trend: ${report.trends.leadScoreTrend > 0 ? '📈 +' : '📉 '}${report.trends.leadScoreTrend.toFixed(1)}

💡 KHUYẾN NGHỊ
─────────────────────────────────────────────────────────
${report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

═══════════════════════════════════════════════════════════
Báo cáo được tạo tự động vào ${new Date().toLocaleTimeString('vi-VN')}
  `;
}

/**
 * Lưu báo cáo vào database
 */
export function saveReport(report: DailyPerformanceReport): boolean {
  try {
    // Trong production, lưu vào database
    console.log('Báo cáo đã được lưu:', report.date);
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu báo cáo:', error);
    return false;
  }
}

/**
 * Gửi báo cáo qua email
 */
export async function sendReportEmail(report: DailyPerformanceReport, email: string): Promise<boolean> {
  try {
    const emailContent = formatReportAsEmail(report);
    
    // Trong production, gửi qua Gmail SMTP
    console.log('Gửi báo cáo đến:', email);
    console.log(emailContent);
    
    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    return false;
  }
}
