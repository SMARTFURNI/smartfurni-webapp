/**
 * Email Performance Analytics Service
 * Phân tích và báo cáo hiệu suất kịch bản email
 */

export interface EmailCampaignMetrics {
  campaignId: string;
  campaignName: string;
  startDate: Date;
  endDate?: Date;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  
  // Tỷ lệ
  openRate: number; // %
  clickRate: number; // %
  conversionRate: number; // %
  clickToConversionRate: number; // %
  
  // Chi tiết từng bước
  stepMetrics: Array<{
    stepId: string;
    stepName: string;
    templateId: string;
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  }>;
  
  // Phân tích
  bestPerformingStep: string;
  worstPerformingStep: string;
  averageTimeToConversion: number; // giờ
  
  // Thống kê khách hàng
  uniqueLeads: number;
  leadsByScore: {
    hot: number; // >= 80
    warm: number; // 50-79
    cold: number; // < 50
  };
  leadsBySource: Record<string, number>;
  
  // ROI
  totalCost: number;
  costPerEmail: number;
  costPerOpen: number;
  costPerClick: number;
  costPerConversion: number;
  roi: number; // %
}

export interface EmailPerformanceReport {
  reportId: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  campaigns: EmailCampaignMetrics[];
  summary: {
    totalCampaigns: number;
    totalEmailsSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    totalRevenue: number;
    averageOpenRate: number;
    averageClickRate: number;
    averageConversionRate: number;
    averageROI: number;
  };
  topPerformers: {
    bestCampaign: string;
    bestStep: string;
    bestLeadSource: string;
  };
  recommendations: string[];
}

// Mock dữ liệu hiệu suất
const mockCampaignMetrics: EmailCampaignMetrics = {
  campaignId: 'campaign-product-launch-001',
  campaignName: 'Chiến Dịch Ra Mắt Giường Điều Khiển Gen 3',
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-04-07'),
  
  // Tổng thể
  totalSent: 2500,
  totalOpened: 1625,
  totalClicked: 931,
  totalConverted: 175,
  totalRevenue: 7875000000, // 7.875 tỷ VNĐ
  
  // Tỷ lệ
  openRate: 65,
  clickRate: 37.2,
  conversionRate: 7,
  clickToConversionRate: 18.8,
  
  // Chi tiết từng bước
  stepMetrics: [
    {
      stepId: 'step-1-teaser',
      stepName: 'Email Teaser',
      templateId: 'launch-teaser',
      sent: 500,
      opened: 325,
      clicked: 81,
      converted: 0,
      openRate: 65,
      clickRate: 16.2,
      conversionRate: 0,
    },
    {
      stepId: 'step-2-announcement',
      stepName: 'Email Announcement',
      templateId: 'launch-announcement',
      sent: 500,
      opened: 375,
      clicked: 225,
      converted: 25,
      openRate: 75,
      clickRate: 45,
      conversionRate: 5,
    },
    {
      stepId: 'step-3-demo',
      stepName: 'Email Demo',
      templateId: 'launch-demo',
      sent: 500,
      opened: 300,
      clicked: 175,
      converted: 20,
      openRate: 60,
      clickRate: 35,
      conversionRate: 4,
    },
    {
      stepId: 'step-4-offer',
      stepName: 'Email Special Offer',
      templateId: 'launch-special-offer',
      sent: 500,
      opened: 350,
      clicked: 250,
      converted: 100,
      openRate: 70,
      clickRate: 50,
      conversionRate: 20,
    },
    {
      stepId: 'step-5-followup',
      stepName: 'Email Follow-up',
      templateId: 'launch-followup',
      sent: 500,
      opened: 275,
      clicked: 200,
      converted: 30,
      openRate: 55,
      clickRate: 40,
      conversionRate: 6,
    },
  ],
  
  // Phân tích
  bestPerformingStep: 'Email Special Offer',
  worstPerformingStep: 'Email Teaser',
  averageTimeToConversion: 72, // 3 ngày
  
  // Thống kê khách hàng
  uniqueLeads: 500,
  leadsByScore: {
    hot: 175, // 35%
    warm: 225, // 45%
    cold: 100, // 20%
  },
  leadsBySource: {
    facebook: 300, // 60%
    email: 100, // 20%
    website: 100, // 20%
  },
  
  // ROI
  totalCost: 1250000, // 1.25 triệu VNĐ (0.5k/email)
  costPerEmail: 500,
  costPerOpen: 769,
  costPerClick: 1343,
  costPerConversion: 7142,
  roi: 630000, // 630000%
};

/**
 * Lấy metrics của một chiến dịch
 */
export function getCampaignMetrics(campaignId: string): EmailCampaignMetrics | null {
  // Trong production, lấy từ database
  if (campaignId === 'campaign-product-launch-001') {
    return mockCampaignMetrics;
  }
  return null;
}

/**
 * Tạo báo cáo chi tiết
 */
export function generatePerformanceReport(
  startDate: Date,
  endDate: Date,
  campaignIds?: string[]
): EmailPerformanceReport {
  const campaigns = campaignIds 
    ? campaignIds.map(id => getCampaignMetrics(id)).filter(Boolean) as EmailCampaignMetrics[]
    : [mockCampaignMetrics];

  // Tính tổng hợp
  const summary = {
    totalCampaigns: campaigns.length,
    totalEmailsSent: campaigns.reduce((sum, c) => sum + c.totalSent, 0),
    totalOpened: campaigns.reduce((sum, c) => sum + c.totalOpened, 0),
    totalClicked: campaigns.reduce((sum, c) => sum + c.totalClicked, 0),
    totalConverted: campaigns.reduce((sum, c) => sum + c.totalConverted, 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + c.totalRevenue, 0),
    averageOpenRate: campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length,
    averageClickRate: campaigns.reduce((sum, c) => sum + c.clickRate, 0) / campaigns.length,
    averageConversionRate: campaigns.reduce((sum, c) => sum + c.conversionRate, 0) / campaigns.length,
    averageROI: campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length,
  };

  // Tìm top performers
  const bestCampaign = campaigns.reduce((best, current) => 
    current.conversionRate > best.conversionRate ? current : best
  );

  const allSteps = campaigns.flatMap(c => c.stepMetrics);
  const bestStep = allSteps.reduce((best, current) => 
    current.conversionRate > best.conversionRate ? current : best
  );

  // Khuyến nghị
  const recommendations = generateRecommendations(campaigns, summary);

  return {
    reportId: `report-${Date.now()}`,
    generatedAt: new Date(),
    period: { startDate, endDate },
    campaigns,
    summary,
    topPerformers: {
      bestCampaign: bestCampaign.campaignName,
      bestStep: bestStep.stepName,
      bestLeadSource: Object.entries(mockCampaignMetrics.leadsBySource)
        .sort(([, a], [, b]) => b - a)[0][0],
    },
    recommendations,
  };
}

/**
 * Tạo khuyến nghị tối ưu hoá
 */
function generateRecommendations(campaigns: EmailCampaignMetrics[], summary: any): string[] {
  const recommendations: string[] = [];

  // Phân tích open rate
  if (summary.averageOpenRate < 50) {
    recommendations.push('📧 Tối ưu hoá subject line - Open rate hiện tại thấp hơn mục tiêu 50%');
  } else if (summary.averageOpenRate > 70) {
    recommendations.push('✅ Subject line rất tốt - Tiếp tục duy trì cách làm hiện tại');
  }

  // Phân tích click rate
  if (summary.averageClickRate < 30) {
    recommendations.push('🔗 Cải thiện nội dung email - Thêm CTA rõ ràng và nút hành động nổi bật');
  } else if (summary.averageClickRate > 50) {
    recommendations.push('✅ Nội dung email rất hấp dẫn - Khách hàng tương tác tốt');
  }

  // Phân tích conversion rate
  if (summary.averageConversionRate < 5) {
    recommendations.push('💰 Tối ưu hoá landing page - Conversion rate thấp, cần cải thiện UX');
  } else if (summary.averageConversionRate > 10) {
    recommendations.push('✅ Landing page hiệu quả - Conversion rate cao, khách hàng sẵn sàng mua');
  }

  // Phân tích ROI
  if (summary.averageROI > 500) {
    recommendations.push('🚀 Tăng ngân sách - ROI rất cao, nên mở rộng chiến dịch');
  } else if (summary.averageROI < 100) {
    recommendations.push('⚠️ Giảm chi phí hoặc tối ưu hoá - ROI thấp, cần xem xét lại chiến lược');
  }

  // Phân tích từng bước
  const bestStep = campaigns[0].stepMetrics.reduce((best, current) => 
    current.conversionRate > best.conversionRate ? current : best
  );

  const worstStep = campaigns[0].stepMetrics.reduce((worst, current) => 
    current.conversionRate < worst.conversionRate ? current : worst
  );

  recommendations.push(`⭐ Bước tốt nhất: ${bestStep.stepName} (${bestStep.conversionRate}% conversion)`);
  recommendations.push(`❌ Bước cần cải thiện: ${worstStep.stepName} (${worstStep.conversionRate}% conversion)`);

  // Phân tích lead source
  const topSource = Object.entries(campaigns[0].leadsBySource)
    .sort(([, a], [, b]) => b - a)[0];
  
  recommendations.push(`📍 Nguồn lead tốt nhất: ${topSource[0]} (${topSource[1]} leads)`);

  // Phân tích lead score
  const hotLeadPercentage = (campaigns[0].leadsByScore.hot / campaigns[0].uniqueLeads) * 100;
  if (hotLeadPercentage < 30) {
    recommendations.push('🔥 Tăng lead scoring - Tỷ lệ hot lead thấp, cần cải thiện qualification');
  }

  return recommendations;
}

/**
 * So sánh hiệu suất giữa các chiến dịch
 */
export function comparePerformance(campaignIds: string[]): {
  comparison: Array<{
    campaignName: string;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    roi: number;
  }>;
  winner: string;
} {
  const campaigns = campaignIds
    .map(id => getCampaignMetrics(id))
    .filter(Boolean) as EmailCampaignMetrics[];

  const comparison = campaigns.map(c => ({
    campaignName: c.campaignName,
    openRate: c.openRate,
    clickRate: c.clickRate,
    conversionRate: c.conversionRate,
    roi: c.roi,
  }));

  const winner = campaigns.reduce((best, current) =>
    current.roi > best.roi ? current : best
  ).campaignName;

  return { comparison, winner };
}

/**
 * Tính toán metrics cho một bước email
 */
export function calculateStepMetrics(
  stepId: string,
  sent: number,
  opened: number,
  clicked: number,
  converted: number
): {
  openRate: number;
  clickRate: number;
  conversionRate: number;
  clickToConversionRate: number;
} {
  return {
    openRate: (opened / sent) * 100,
    clickRate: (clicked / sent) * 100,
    conversionRate: (converted / sent) * 100,
    clickToConversionRate: clicked > 0 ? (converted / clicked) * 100 : 0,
  };
}

/**
 * Lấy thống kê tổng hợp
 */
export function getOverallStats() {
  return {
    totalCampaigns: 4,
    totalEmailsSent: 10000,
    totalOpened: 6500,
    totalClicked: 3720,
    totalConverted: 700,
    totalRevenue: 31500000000, // 31.5 tỷ VNĐ
    averageOpenRate: 65,
    averageClickRate: 37.2,
    averageConversionRate: 7,
    averageROI: 2520,
  };
}

/**
 * Xuất báo cáo dưới dạng JSON
 */
export function exportReportAsJSON(report: EmailPerformanceReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Xuất báo cáo dưới dạng CSV
 */
export function exportReportAsCSV(report: EmailPerformanceReport): string {
  let csv = 'Campaign,Total Sent,Opened,Clicked,Converted,Open Rate,Click Rate,Conversion Rate,Revenue\n';
  
  report.campaigns.forEach(campaign => {
    csv += `"${campaign.campaignName}",${campaign.totalSent},${campaign.totalOpened},${campaign.totalClicked},${campaign.totalConverted},${campaign.openRate.toFixed(2)}%,${campaign.clickRate.toFixed(2)}%,${campaign.conversionRate.toFixed(2)}%,"${campaign.totalRevenue.toLocaleString('vi-VN')} VNĐ"\n`;
  });
  
  return csv;
}
