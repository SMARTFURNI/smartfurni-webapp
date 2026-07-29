export type EntityStatus = "active" | "paused" | "removed" | "needs_review";
export type MembershipStatus = "not_joined" | "requested" | "pending" | "joined" | "rejected" | "blocked";
export type ContentStatus =
  | "ai_generating" | "draft" | "review" | "pending_approval" | "approved"
  | "scheduled" | "used" | "rewrite_required" | "archived";
export type PublishingTaskStatus =
  | "scheduled" | "due" | "posted" | "pending_moderation" | "approved"
  | "rejected" | "postponed" | "cancelled";

export interface FacebookGroupTopicDefinition {
  key: string;
  label: string;
  description: string;
  searchTerms: string[];
}

export const FACEBOOK_GROUP_TOPIC_TAXONOMY = [
  {
    key: "Phòng trọ",
    label: "Phòng trọ",
    description: "Sinh viên, người thuê trọ và không gian nhỏ.",
    searchTerms: ["phòng trọ", "nhà trọ", "ở ghép", "căn hộ mini"],
  },
  {
    key: "Căn hộ & chung cư",
    label: "Căn hộ & chung cư",
    description: "Cư dân chung cư, căn hộ và cộng đồng dự án.",
    searchTerms: ["căn hộ", "chung cư", "cư dân"],
  },
  {
    key: "Nhà nhỏ & tối ưu không gian",
    label: "Nhà nhỏ & tối ưu không gian",
    description: "Giải pháp bố trí nhà nhỏ và nội thất đa năng.",
    searchTerms: ["nhà nhỏ", "tối ưu không gian", "nội thất đa năng"],
  },
  {
    key: "Nội thất & trang trí",
    label: "Nội thất & trang trí",
    description: "Thiết kế, decor và kinh nghiệm chọn nội thất.",
    searchTerms: ["nội thất", "trang trí nhà", "decor nhà"],
  },
  {
    key: "Sofa giường",
    label: "Sofa giường",
    description: "Sofa bed, giường gấp và sản phẩm chuyển đổi.",
    searchTerms: ["sofa giường", "sofa bed", "giường gấp"],
  },
  {
    key: "Giường thông minh & sức khỏe",
    label: "Giường thông minh & sức khỏe",
    description: "Giấc ngủ, công thái học và chăm sóc tại nhà.",
    searchTerms: ["giường thông minh", "giấc ngủ", "công thái học"],
  },
  {
    key: "Nhà ở & bất động sản",
    label: "Nhà ở & bất động sản",
    description: "Mua bán, cho thuê và cộng đồng nhà ở.",
    searchTerms: ["nhà ở", "bất động sản", "cho thuê nhà"],
  },
  {
    key: "Thanh lý & mua bán nội thất",
    label: "Thanh lý & mua bán nội thất",
    description: "Cộng đồng mua bán và thanh lý đồ gia dụng.",
    searchTerms: ["thanh lý nội thất", "mua bán nội thất", "đồ gia dụng"],
  },
  {
    key: "Cộng đồng địa phương",
    label: "Cộng đồng địa phương",
    description: "Nhóm cư dân và cộng đồng theo khu vực.",
    searchTerms: ["cộng đồng cư dân", "hội đồng hương", "chợ địa phương"],
  },
] as const;

export interface FacebookGroupSettings {
  groupTopics: FacebookGroupTopicDefinition[];
  contact: {
    hotline: string;
    zalo: string;
    zaloUrl: string;
    website: string;
    email: string;
  };
  maxPostsPerPagePerDay: number;
  minPagePostIntervalMinutes: number;
  minGroupPostIntervalDays: number;
  maxDuplicateRatio: number;
  consecutiveRejectionsBeforePause: number;
  commentCheckMinutes: number[];
  responseTargetMinutes: number;
  completedTaskRetentionDays: number;
  scoreWeights: {
    audienceFit: number;
    allowsPages: number;
    allowsSales: number;
    approvalRate: number;
    messengerRate: number;
    qualifiedLeads: number;
    orders: number;
    revenue: number;
  };
  gradeRules: { A: number; B: number; C: number };
  defaultPostingHours: string[];
  workingDays: number[];
  manualPostingOnly: true;
  storeFacebookCredentials: false;
}

export const DEFAULT_FACEBOOK_GROUP_SETTINGS: FacebookGroupSettings = {
  groupTopics: FACEBOOK_GROUP_TOPIC_TAXONOMY.map(topic => ({
    ...topic,
    searchTerms: [...topic.searchTerms],
  })),
  contact: {
    hotline: "0918.326.552",
    zalo: "0918.326.552",
    zaloUrl: "https://zalo.me/0918326552",
    website: "https://www.smartfurni.com.vn",
    email: "b2b@smartfurni.com.vn",
  },
  maxPostsPerPagePerDay: 4,
  minPagePostIntervalMinutes: 60,
  minGroupPostIntervalDays: 7,
  maxDuplicateRatio: 50,
  consecutiveRejectionsBeforePause: 2,
  commentCheckMinutes: [15, 60, 180, 720, 1440, 4320],
  responseTargetMinutes: 30,
  completedTaskRetentionDays: 365,
  scoreWeights: {
    audienceFit: 20, allowsPages: 15, allowsSales: 10, approvalRate: 15,
    messengerRate: 15, qualifiedLeads: 10, orders: 10, revenue: 5,
  },
  gradeRules: { A: 80, B: 60, C: 40 },
  defaultPostingHours: ["08:00-11:30", "13:30-21:00"],
  workingDays: [1, 2, 3, 4, 5, 6],
  manualPostingOnly: true,
  storeFacebookCredentials: false,
};

export interface ScheduleValidationInput {
  scheduledAt: string;
  contentStatus: ContentStatus;
  duplicateRatio: number;
  ruleCheckPassed: boolean;
  groupStatus: EntityStatus;
  membershipStatus: MembershipStatus;
  groupNextAllowedPostAt?: string | null;
  pagePostsSameDay: string[];
  employeeTasksAt: string[];
}

export interface GroupScoreInput {
  audienceFitPercent: number;
  allowsPages: boolean;
  allowsSales: boolean;
  totalPosts: number;
  approvedPosts: number;
  messengerLeads: number;
  qualifiedLeads: number;
  orders: number;
  revenue: number;
}

export interface RuleAnalysis {
  allowsSales: boolean | null;
  allowsPrice: boolean | null;
  allowsPhone: boolean | null;
  allowsLink: boolean | null;
  requiresSource: boolean | null;
  hasFrequencyLimit: boolean | null;
  bannedKeywords: string[];
  requiresApproval: boolean | null;
  suitableFormats: string[];
  warnings: string[];
}

export interface DashboardData {
  metrics: Record<string, number>;
  funnel: Array<{ label: string; value: number }>;
  daily: Array<{ date: string; posts: number; leads: number; revenue: number }>;
  topGroupsByLeads: Array<{ id: string; name: string; value: number }>;
  topGroupsByRevenue: Array<{ id: string; name: string; value: number }>;
}

export interface FacebookGroupLeadSource {
  attributionId: string;
  sourceCode: string;
  groupName: string;
  groupUrl: string;
  postUrl: string;
  campaignName: string | null;
  contentOpening: string;
  postingEmployeeName: string | null;
  firstMessengerAt: string | null;
  conversationId: string | null;
  messageId: string | null;
  quoteId: string | null;
  orderId: string | null;
  revenue: number;
}
