import { BLOG_POSTS, type BlogPost } from "./blog-data";

// In-memory store (resets on server restart - use a database in production)
let posts: BlogPost[] = [...BLOG_POSTS];
let contacts: ContactMessage[] = [
  {
    id: "1",
    name: "Nguyễn Văn An",
    email: "an.nguyen@gmail.com",
    phone: "0901234567",
    subject: "Tư vấn mua giường",
    message: "Tôi muốn tìm hiểu về giường SmartFurni cho gia đình 2 người lớn tuổi.",
    createdAt: "2026-03-07T08:30:00Z",
    read: false,
  },
  {
    id: "2",
    name: "Trần Thị Bình",
    email: "binh.tran@company.vn",
    phone: "0912345678",
    subject: "Hợp tác phân phối",
    message: "Công ty chúng tôi muốn trở thành đại lý phân phối SmartFurni tại Đà Nẵng.",
    createdAt: "2026-03-06T14:15:00Z",
    read: true,
  },
  {
    id: "3",
    name: "Lê Minh Cường",
    email: "cuong.le@hotmail.com",
    phone: "0923456789",
    subject: "Hỗ trợ kỹ thuật",
    message: "App không kết nối được với giường, cần hỗ trợ gấp.",
    createdAt: "2026-03-08T09:00:00Z",
    read: false,
  },
  {
    id: "4",
    name: "Phạm Thu Hà",
    email: "ha.pham@gmail.com",
    phone: "0934567890",
    subject: "Đặt hàng",
    message: "Tôi muốn đặt mua 2 chiếc giường SmartFurni Pro cho phòng khách sạn.",
    createdAt: "2026-03-08T11:30:00Z",
    read: false,
  },
  {
    id: "5",
    name: "Hoàng Minh Tuấn",
    email: "tuan.hoang@gmail.com",
    phone: "0945678901",
    subject: "Tư vấn mua giường",
    message: "Tôi cần tư vấn về model SmartFurni Elite cho phòng ngủ chính.",
    createdAt: "2026-03-05T10:00:00Z",
    read: true,
  },
  {
    id: "6",
    name: "Nguyễn Thị Mai",
    email: "mai.nguyen@yahoo.com",
    phone: "0956789012",
    subject: "Bảo hành sản phẩm",
    message: "Giường của tôi mua tháng 1 bị lỗi motor nâng hạ, cần hỗ trợ bảo hành.",
    createdAt: "2026-03-04T14:30:00Z",
    read: true,
  },
  {
    id: "7",
    name: "Trần Văn Đức",
    email: "duc.tran@company.vn",
    phone: "0967890123",
    subject: "Hợp tác phân phối",
    message: "Chúng tôi muốn phân phối SmartFurni tại khu vực Hà Nội.",
    createdAt: "2026-03-03T09:15:00Z",
    read: true,
  },
  {
    id: "8",
    name: "Lê Thị Hương",
    email: "huong.le@gmail.com",
    phone: "0978901234",
    subject: "Đặt hàng",
    message: "Tôi muốn đặt 1 chiếc SmartFurni Pro màu trắng, giao tại TP.HCM.",
    createdAt: "2026-03-02T16:45:00Z",
    read: true,
  },
];

// Activity log for dashboard
export interface ActivityLog {
  id: string;
  type: "post_created" | "post_updated" | "post_deleted" | "contact_received" | "image_uploaded" | "post_scheduled";
  description: string;
  meta?: string;
  timestamp: string;
}

let activityLogs: ActivityLog[] = [
  { id: "a1", type: "contact_received", description: "Tin nhắn mới từ Phạm Thu Hà", meta: "Đặt hàng", timestamp: "2026-03-08T11:30:00Z" },
  { id: "a2", type: "contact_received", description: "Tin nhắn mới từ Lê Minh Cường", meta: "Hỗ trợ kỹ thuật", timestamp: "2026-03-08T09:00:00Z" },
  { id: "a3", type: "post_created", description: "Bài viết mới được tạo", meta: "5 Tư Thế Ngủ Tốt Nhất", timestamp: "2026-03-07T10:00:00Z" },
  { id: "a4", type: "contact_received", description: "Tin nhắn mới từ Nguyễn Văn An", meta: "Tư vấn mua giường", timestamp: "2026-03-07T08:30:00Z" },
  { id: "a5", type: "image_uploaded", description: "Ảnh bìa được tải lên", meta: "blog-cover.jpg", timestamp: "2026-03-06T15:00:00Z" },
  { id: "a6", type: "post_updated", description: "Bài viết được cập nhật", meta: "Hướng dẫn sử dụng SmartFurni", timestamp: "2026-03-06T14:00:00Z" },
  { id: "a7", type: "post_scheduled", description: "Bài viết được lên lịch đăng", meta: "Xu hướng giường thông minh 2026", timestamp: "2026-03-05T11:00:00Z" },
  { id: "a8", type: "contact_received", description: "Tin nhắn mới từ Hoàng Minh Tuấn", meta: "Tư vấn mua giường", timestamp: "2026-03-05T10:00:00Z" },
];

export function addActivityLog(log: Omit<ActivityLog, "id" | "timestamp">): void {
  activityLogs = [
    { ...log, id: Date.now().toString(), timestamp: new Date().toISOString() },
    ...activityLogs.slice(0, 49), // keep last 50
  ];
}

export function getActivityLogs(limit = 10): ActivityLog[] {
  return activityLogs.slice(0, limit);
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalContacts: number;
  unreadContacts: number;
  featuredPosts: number;
  postsWithCoverImage: number;
  postsWithoutCoverImage: number;
}

export interface DashboardStats {
  // Core metrics
  stats: AdminStats;

  // Posts by status (for donut chart)
  postsByStatus: { status: string; label: string; count: number; color: string }[];

  // Posts by category (for bar chart)
  postsByCategory: { category: string; label: string; count: number; color: string }[];

  // Contacts by day (last 7 days, for line chart)
  contactsByDay: { date: string; label: string; count: number; unread: number }[];

  // Contact subjects breakdown
  contactsBySubject: { subject: string; count: number; percentage: number }[];

  // Feature usage stats
  featureUsage: {
    coverImageAdoption: number; // % posts with cover image
    scheduledPostsCount: number;
    draftPostsCount: number;
    avgReadTime: number;
  };

  // Recent activity
  recentActivity: ActivityLog[];

  // Top posts (by read time as proxy for quality)
  topPosts: { title: string; slug: string; readTime: number; category: string; status: string }[];
}

// Posts CRUD
export function getAllPosts(): BlogPost[] {
  return posts;
}

export function getPostById(id: string): BlogPost | undefined {
  return posts.find((p) => p.slug === id);
}

export function createPost(post: Omit<BlogPost, "slug"> & { slug?: string }): BlogPost {
  const slug = post.slug || post.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const newPost: BlogPost = { ...post, slug } as BlogPost;
  posts = [newPost, ...posts];
  addActivityLog({ type: "post_created", description: "Bài viết mới được tạo", meta: post.title.slice(0, 40) });
  return newPost;
}

export function updatePost(slug: string, updates: Partial<BlogPost>): BlogPost | null {
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...updates };
  if (updates.status === "scheduled") {
    addActivityLog({ type: "post_scheduled", description: "Bài viết được lên lịch đăng", meta: posts[idx].title.slice(0, 40) });
  } else {
    addActivityLog({ type: "post_updated", description: "Bài viết được cập nhật", meta: posts[idx].title.slice(0, 40) });
  }
  return posts[idx];
}

export function deletePost(slug: string): boolean {
  const post = posts.find((p) => p.slug === slug);
  const before = posts.length;
  posts = posts.filter((p) => p.slug !== slug);
  if (posts.length < before && post) {
    addActivityLog({ type: "post_deleted", description: "Bài viết đã bị xóa", meta: post.title.slice(0, 40) });
  }
  return posts.length < before;
}

// Contacts CRUD
export function getAllContacts(): ContactMessage[] {
  return contacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markContactRead(id: string): void {
  const contact = contacts.find((c) => c.id === id);
  if (contact) contact.read = true;
}

export function deleteContact(id: string): void {
  contacts = contacts.filter((c) => c.id !== id);
}

export function addContact(msg: Omit<ContactMessage, "id" | "createdAt" | "read">): ContactMessage {
  const newMsg: ContactMessage = {
    ...msg,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  contacts = [newMsg, ...contacts];
  addActivityLog({ type: "contact_received", description: `Tin nhắn mới từ ${msg.name}`, meta: msg.subject });
  return newMsg;
}

// Stats
export function getAdminStats(): AdminStats {
  const postsWithCover = posts.filter((p) => p.coverImage && p.coverImage.trim() !== "").length;
  return {
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => !p.status || p.status === "published").length,
    draftPosts: posts.filter((p) => p.status === "draft").length,
    scheduledPosts: posts.filter((p) => p.status === "scheduled").length,
    totalContacts: contacts.length,
    unreadContacts: contacts.filter((c) => !c.read).length,
    featuredPosts: posts.filter((p) => p.featured).length,
    postsWithCoverImage: postsWithCover,
    postsWithoutCoverImage: posts.length - postsWithCover,
  };
}

export function getDashboardStats(): DashboardStats {
  const stats = getAdminStats();

  // Posts by status
  const postsByStatus = [
    { status: "published", label: "Đã đăng", count: stats.publishedPosts, color: "#22C55E" },
    { status: "draft", label: "Bản nháp", count: stats.draftPosts, color: "#6B7280" },
    { status: "scheduled", label: "Lên lịch", count: stats.scheduledPosts, color: "#3B82F6" },
  ];

  // Posts by category
  const categoryMap: Record<string, { label: string; count: number; color: string }> = {};
  posts.forEach((p) => {
    if (!categoryMap[p.category]) {
      categoryMap[p.category] = { label: p.categoryLabel, count: 0, color: "#C9A84C" };
    }
    categoryMap[p.category].count++;
  });
  const categoryColors: Record<string, string> = {
    "tips-giac-ngu": "#4ADE80",
    "huong-dan-su-dung": "#60A5FA",
    "cap-nhat-san-pham": "#C9A84C",
    "suc-khoe": "#F472B6",
  };
  const postsByCategory = Object.entries(categoryMap).map(([cat, data]) => ({
    category: cat,
    label: data.label,
    count: data.count,
    color: categoryColors[cat] || "#C9A84C",
  }));

  // Contacts by day (last 7 days)
  const contactsByDay: { date: string; label: string; count: number; unread: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayContacts = contacts.filter((c) => c.createdAt.startsWith(dateStr));
    contactsByDay.push({
      date: dateStr,
      label: d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" }),
      count: dayContacts.length,
      unread: dayContacts.filter((c) => !c.read).length,
    });
  }

  // Contact subjects breakdown
  const subjectMap: Record<string, number> = {};
  contacts.forEach((c) => {
    subjectMap[c.subject] = (subjectMap[c.subject] || 0) + 1;
  });
  const contactsBySubject = Object.entries(subjectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject, count]) => ({
      subject,
      count,
      percentage: Math.round((count / contacts.length) * 100),
    }));

  // Feature usage
  const featureUsage = {
    coverImageAdoption: posts.length > 0 ? Math.round((stats.postsWithCoverImage / posts.length) * 100) : 0,
    scheduledPostsCount: stats.scheduledPosts,
    draftPostsCount: stats.draftPosts,
    avgReadTime: posts.length > 0
      ? Math.round(posts.reduce((sum, p) => sum + p.readTime, 0) / posts.length)
      : 0,
  };

  // Top posts
  const topPosts = [...posts]
    .sort((a, b) => b.readTime - a.readTime)
    .slice(0, 5)
    .map((p) => ({
      title: p.title,
      slug: p.slug,
      readTime: p.readTime,
      category: p.categoryLabel,
      status: p.status || "published",
    }));

  return {
    stats,
    postsByStatus,
    postsByCategory,
    contactsByDay,
    contactsBySubject,
    featureUsage,
    recentActivity: getActivityLogs(8),
    topPosts,
  };
}
