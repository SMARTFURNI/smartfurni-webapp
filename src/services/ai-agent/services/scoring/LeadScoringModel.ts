/**
 * Lead Scoring Model
 * Defines the scoring factors and weights for lead qualification
 */

export type LeadClassification = 'hot' | 'warm' | 'cold';

export interface ScoringFactor {
  name: string;
  weight: number; // 0.0 - 1.0
  description: string;
  dataSource: 'profile' | 'engagement' | 'behavior' | 'interaction';
}

export interface LeadScoringFactors {
  // Profile factors (30% weight)
  companySize: ScoringFactor;
  industry: ScoringFactor;
  location: ScoringFactor;
  jobTitle: ScoringFactor;

  // Engagement factors (35% weight)
  emailOpenRate: ScoringFactor;
  emailClickRate: ScoringFactor;
  zaloResponseRate: ScoringFactor;
  websiteVisits: ScoringFactor;

  // Behavior factors (20% weight)
  productInterest: ScoringFactor;
  priceInquiries: ScoringFactor;
  demoRequests: ScoringFactor;
  contentDownloads: ScoringFactor;

  // Interaction factors (15% weight)
  recency: ScoringFactor;
  frequency: ScoringFactor;
  monetaryValue: ScoringFactor;
}

/**
 * Default Lead Scoring Model
 * Based on B2B SaaS best practices
 */
export const DEFAULT_LEAD_SCORING_MODEL: LeadScoringFactors = {
  // Profile factors (30% total)
  companySize: {
    name: 'Company Size',
    weight: 0.10,
    description: 'Larger companies often have higher deal value',
    dataSource: 'profile',
  },
  industry: {
    name: 'Industry',
    weight: 0.10,
    description: 'Target industries (hospitality, healthcare) score higher',
    dataSource: 'profile',
  },
  location: {
    name: 'Location',
    weight: 0.05,
    description: 'Geographic relevance to service areas',
    dataSource: 'profile',
  },
  jobTitle: {
    name: 'Job Title',
    weight: 0.05,
    description: 'Decision makers (C-level, managers) score higher',
    dataSource: 'profile',
  },

  // Engagement factors (35% total)
  emailOpenRate: {
    name: 'Email Open Rate',
    weight: 0.12,
    description: 'Percentage of emails opened by lead',
    dataSource: 'engagement',
  },
  emailClickRate: {
    name: 'Email Click Rate',
    weight: 0.12,
    description: 'Percentage of emails with clicks',
    dataSource: 'engagement',
  },
  zaloResponseRate: {
    name: 'Zalo Response Rate',
    weight: 0.08,
    description: 'Responsiveness on Zalo messaging',
    dataSource: 'engagement',
  },
  websiteVisits: {
    name: 'Website Visits',
    weight: 0.03,
    description: 'Frequency of website visits',
    dataSource: 'engagement',
  },

  // Behavior factors (20% total)
  productInterest: {
    name: 'Product Interest',
    weight: 0.08,
    description: 'Pages viewed and time spent on product pages',
    dataSource: 'behavior',
  },
  priceInquiries: {
    name: 'Price Inquiries',
    weight: 0.07,
    description: 'Number of price/quote requests',
    dataSource: 'behavior',
  },
  demoRequests: {
    name: 'Demo Requests',
    weight: 0.03,
    description: 'Requests for product demonstrations',
    dataSource: 'behavior',
  },
  contentDownloads: {
    name: 'Content Downloads',
    weight: 0.02,
    description: 'Downloads of whitepapers, case studies, etc.',
    dataSource: 'behavior',
  },

  // Interaction factors (15% total)
  recency: {
    name: 'Recency',
    weight: 0.07,
    description: 'Days since last interaction (more recent = higher score)',
    dataSource: 'interaction',
  },
  frequency: {
    name: 'Frequency',
    weight: 0.05,
    description: 'Number of interactions in past 30 days',
    dataSource: 'interaction',
  },
  monetaryValue: {
    name: 'Monetary Value',
    weight: 0.03,
    description: 'Estimated deal size based on company profile',
    dataSource: 'interaction',
  },
};

/**
 * Scoring thresholds
 */
export const SCORING_THRESHOLDS = {
  hot: { min: 80, max: 100 },
  warm: { min: 50, max: 79 },
  cold: { min: 0, max: 49 },
};

/**
 * Get classification based on score
 */
export function getClassification(score: number): LeadClassification {
  if (score >= SCORING_THRESHOLDS.hot.min) {
    return 'hot';
  } else if (score >= SCORING_THRESHOLDS.warm.min) {
    return 'warm';
  } else {
    return 'cold';
  }
}

/**
 * Get classification color for UI
 */
export function getClassificationColor(
  classification: LeadClassification
): string {
  const colors: Record<LeadClassification, string> = {
    hot: '#FF4444', // Red
    warm: '#FFA500', // Orange
    cold: '#4444FF', // Blue
  };
  return colors[classification];
}

/**
 * Get classification label
 */
export function getClassificationLabel(
  classification: LeadClassification
): string {
  const labels: Record<LeadClassification, string> = {
    hot: 'Khách hàng tiềm năng cao',
    warm: 'Khách hàng tiềm năng trung bình',
    cold: 'Khách hàng tiềm năng thấp',
  };
  return labels[classification];
}

