/**
 * Lead Segmentation Service
 * Phân loại lead dựa trên tags, điểm số, và hành vi
 */

export interface LeadSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  tags: string[];
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentCriteria {
  requiredTags?: string[];
  excludeTags?: string[];
  minScore?: number;
  maxScore?: number;
  source?: string[];
  company?: string[];
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  tags: string[];
  score: number;
  source: string;
  createdAt: string;
}

// Mẫu segments mặc định
export const DEFAULT_SEGMENTS: LeadSegment[] = [
  {
    id: 'segment-investor',
    name: 'Chủ Đầu Tư',
    description: 'Khách hàng là chủ đầu tư dự án',
    criteria: {
      requiredTags: ['Chủ đầu tư'],
    },
    tags: ['Chủ đầu tư', 'B2B', 'High Value'],
    leadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'segment-architect',
    name: 'Kiến Trúc Sư',
    description: 'Khách hàng là kiến trúc sư, thiết kế',
    criteria: {
      requiredTags: ['Kiến trúc sư'],
    },
    tags: ['Kiến trúc sư', 'B2B', 'Professional'],
    leadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'segment-dealer',
    name: 'Đại Lý',
    description: 'Khách hàng là đại lý, nhà phân phối',
    criteria: {
      requiredTags: ['Đại lý'],
    },
    tags: ['Đại lý', 'B2B', 'Reseller'],
    leadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'segment-hot-lead',
    name: 'Hot Lead',
    description: 'Lead có điểm số cao (80+)',
    criteria: {
      minScore: 80,
    },
    tags: ['Hot', 'Priority', 'High Value'],
    leadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'segment-warm-lead',
    name: 'Warm Lead',
    description: 'Lead có điểm số trung bình (50-79)',
    criteria: {
      minScore: 50,
      maxScore: 79,
    },
    tags: ['Warm', 'Medium Priority'],
    leadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'segment-cold-lead',
    name: 'Cold Lead',
    description: 'Lead có điểm số thấp (<50)',
    criteria: {
      maxScore: 49,
    },
    tags: ['Cold', 'Low Priority'],
    leadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Kiểm tra xem lead có phù hợp với segment không
 */
export function matchesSegment(lead: Lead, criteria: SegmentCriteria): boolean {
  // Check required tags
  if (criteria.requiredTags && criteria.requiredTags.length > 0) {
    const hasRequiredTag = criteria.requiredTags.some((tag) => lead.tags.includes(tag));
    if (!hasRequiredTag) return false;
  }

  // Check exclude tags
  if (criteria.excludeTags && criteria.excludeTags.length > 0) {
    const hasExcludedTag = criteria.excludeTags.some((tag) => lead.tags.includes(tag));
    if (hasExcludedTag) return false;
  }

  // Check score range
  if (criteria.minScore !== undefined && lead.score < criteria.minScore) return false;
  if (criteria.maxScore !== undefined && lead.score > criteria.maxScore) return false;

  // Check source
  if (criteria.source && criteria.source.length > 0) {
    if (!criteria.source.includes(lead.source)) return false;
  }

  // Check company
  if (criteria.company && criteria.company.length > 0) {
    if (!criteria.company.includes(lead.company)) return false;
  }

  return true;
}

/**
 * Lấy tất cả segments phù hợp cho một lead
 */
export function getLeadSegments(lead: Lead, segments: LeadSegment[]): LeadSegment[] {
  return segments.filter((segment) => matchesSegment(lead, segment.criteria));
}

/**
 * Phân loại nhóm leads
 */
export function segmentLeads(leads: Lead[], segments: LeadSegment[]): Map<string, Lead[]> {
  const result = new Map<string, Lead[]>();

  segments.forEach((segment) => {
    const matchedLeads = leads.filter((lead) => matchesSegment(lead, segment.criteria));
    result.set(segment.id, matchedLeads);
  });

  return result;
}

/**
 * Tạo segment mới
 */
export function createSegment(
  name: string,
  description: string,
  criteria: SegmentCriteria,
  tags: string[] = []
): LeadSegment {
  return {
    id: `segment-${Date.now()}`,
    name,
    description,
    criteria,
    tags,
    leadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Tính toán thống kê cho segment
 */
export function getSegmentStats(leads: Lead[], segment: LeadSegment) {
  const matchedLeads = leads.filter((lead) => matchesSegment(lead, segment.criteria));

  return {
    totalLeads: matchedLeads.length,
    avgScore: matchedLeads.length > 0 ? matchedLeads.reduce((sum, l) => sum + l.score, 0) / matchedLeads.length : 0,
    hotLeads: matchedLeads.filter((l) => l.score >= 80).length,
    warmLeads: matchedLeads.filter((l) => l.score >= 50 && l.score < 80).length,
    coldLeads: matchedLeads.filter((l) => l.score < 50).length,
  };
}
