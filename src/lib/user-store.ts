// ─── User Data Model ──────────────────────────────────────────────────────────

export type UserRole = "customer" | "dealer" | "vip" | "blocked";
export type UserStatus = "active" | "inactive" | "blocked";
export type UserSource = "organic" | "referral" | "social" | "ads" | "direct";

export interface UserDevice {
  model: string;
  connectedAt: string;
  lastActive: string;
}

export interface UserOrder {
  id: string;
  product: string;
  amount: number;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  date: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  source: UserSource;
  city: string;
  registeredAt: string;
  lastActiveAt: string;
  totalOrders: number;
  totalSpent: number; // VND
  devices: UserDevice[];
  orders: UserOrder[];
  notes?: string;
  tags: string[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  blockedUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  avgOrderValue: number;
  customerCount: number;
  dealerCount: number;
  vipCount: number;
}

export interface UserDashboardStats {
  stats: UserStats;
  usersByRole: { role: string; label: string; count: number; color: string }[];
  usersByStatus: { status: string; label: string; count: number; color: string }[];
  usersBySource: { source: string; label: string; count: number; percentage: number; color: string }[];
  usersByCity: { city: string; count: number; percentage: number }[];
  registrationsByDay: { date: string; label: string; count: number }[];
  revenueByRole: { role: string; label: string; revenue: number; color: string }[];
  topSpenders: { id: string; name: string; email: string; totalSpent: number; totalOrders: number; role: UserRole }[];
  recentUsers: AppUser[];
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

let users: AppUser[] = [
  {
    id: "u1",
    name: "Nguyễn Văn An",
    email: "an.nguyen@gmail.com",
    phone: "0901234567",
    role: "customer",
    status: "active",
    source: "organic",
    city: "TP. Hồ Chí Minh",
    registeredAt: "2026-01-15T08:00:00Z",
    lastActiveAt: "2026-03-08T10:30:00Z",
    totalOrders: 2,
    totalSpent: 68000000,
    devices: [{ model: "iPhone 15 Pro", connectedAt: "2026-01-16T09:00:00Z", lastActive: "2026-03-08T10:30:00Z" }],
    orders: [
      { id: "o1", product: "SmartFurni Pro", amount: 45000000, status: "delivered", date: "2026-01-20T00:00:00Z" },
      { id: "o2", product: "SmartFurni Basic", amount: 23000000, status: "delivered", date: "2026-02-10T00:00:00Z" },
    ],
    tags: ["khách hàng thân thiết", "iOS"],
  },
  {
    id: "u2",
    name: "Trần Thị Bình",
    email: "binh.tran@company.vn",
    phone: "0912345678",
    role: "dealer",
    status: "active",
    source: "referral",
    city: "Đà Nẵng",
    registeredAt: "2026-01-20T09:00:00Z",
    lastActiveAt: "2026-03-07T14:00:00Z",
    totalOrders: 8,
    totalSpent: 320000000,
    devices: [
      { model: "Samsung Galaxy S24", connectedAt: "2026-01-21T10:00:00Z", lastActive: "2026-03-07T14:00:00Z" },
      { model: "iPad Pro", connectedAt: "2026-02-01T08:00:00Z", lastActive: "2026-03-06T09:00:00Z" },
    ],
    orders: [
      { id: "o3", product: "SmartFurni Pro x5", amount: 200000000, status: "delivered", date: "2026-02-01T00:00:00Z" },
      { id: "o4", product: "SmartFurni Elite x3", amount: 120000000, status: "delivered", date: "2026-02-15T00:00:00Z" },
    ],
    tags: ["đại lý", "Đà Nẵng", "B2B"],
    notes: "Đại lý lớn tại Đà Nẵng, tiềm năng mở rộng ra miền Trung",
  },
  {
    id: "u3",
    name: "Lê Minh Cường",
    email: "cuong.le@hotmail.com",
    phone: "0923456789",
    role: "customer",
    status: "active",
    source: "social",
    city: "Hà Nội",
    registeredAt: "2026-02-01T10:00:00Z",
    lastActiveAt: "2026-03-08T09:00:00Z",
    totalOrders: 1,
    totalSpent: 45000000,
    devices: [{ model: "iPhone 14", connectedAt: "2026-02-02T11:00:00Z", lastActive: "2026-03-08T09:00:00Z" }],
    orders: [
      { id: "o5", product: "SmartFurni Pro", amount: 45000000, status: "delivered", date: "2026-02-05T00:00:00Z" },
    ],
    tags: ["Facebook", "Hà Nội"],
  },
  {
    id: "u4",
    name: "Phạm Thu Hà",
    email: "ha.pham@gmail.com",
    phone: "0934567890",
    role: "vip",
    status: "active",
    source: "ads",
    city: "TP. Hồ Chí Minh",
    registeredAt: "2025-11-10T08:00:00Z",
    lastActiveAt: "2026-03-08T11:30:00Z",
    totalOrders: 5,
    totalSpent: 185000000,
    devices: [
      { model: "iPhone 15", connectedAt: "2025-11-11T09:00:00Z", lastActive: "2026-03-08T11:30:00Z" },
    ],
    orders: [
      { id: "o6", product: "SmartFurni Elite", amount: 65000000, status: "delivered", date: "2025-11-15T00:00:00Z" },
      { id: "o7", product: "SmartFurni Pro x2", amount: 90000000, status: "delivered", date: "2026-01-10T00:00:00Z" },
      { id: "o8", product: "SmartFurni Pro", amount: 30000000, status: "pending", date: "2026-03-01T00:00:00Z" },
    ],
    tags: ["VIP", "khách sạn", "Google Ads"],
    notes: "Chủ khách sạn 3 sao tại Q1, mua cho 5 phòng",
  },
  {
    id: "u5",
    name: "Hoàng Minh Tuấn",
    email: "tuan.hoang@gmail.com",
    phone: "0945678901",
    role: "customer",
    status: "active",
    source: "organic",
    city: "Hà Nội",
    registeredAt: "2026-02-10T11:00:00Z",
    lastActiveAt: "2026-03-05T10:00:00Z",
    totalOrders: 1,
    totalSpent: 45000000,
    devices: [{ model: "Android", connectedAt: "2026-02-11T10:00:00Z", lastActive: "2026-03-05T10:00:00Z" }],
    orders: [
      { id: "o9", product: "SmartFurni Pro", amount: 45000000, status: "confirmed", date: "2026-02-12T00:00:00Z" },
    ],
    tags: ["Hà Nội"],
  },
  {
    id: "u6",
    name: "Nguyễn Thị Mai",
    email: "mai.nguyen@yahoo.com",
    phone: "0956789012",
    role: "customer",
    status: "inactive",
    source: "referral",
    city: "Cần Thơ",
    registeredAt: "2025-12-05T08:00:00Z",
    lastActiveAt: "2026-01-20T14:30:00Z",
    totalOrders: 1,
    totalSpent: 23000000,
    devices: [],
    orders: [
      { id: "o10", product: "SmartFurni Basic", amount: 23000000, status: "delivered", date: "2025-12-10T00:00:00Z" },
    ],
    tags: ["giới thiệu"],
  },
  {
    id: "u7",
    name: "Trần Văn Đức",
    email: "duc.tran@company.vn",
    phone: "0967890123",
    role: "dealer",
    status: "active",
    source: "direct",
    city: "Hà Nội",
    registeredAt: "2026-01-05T09:00:00Z",
    lastActiveAt: "2026-03-03T09:15:00Z",
    totalOrders: 6,
    totalSpent: 240000000,
    devices: [{ model: "iPad Air", connectedAt: "2026-01-06T10:00:00Z", lastActive: "2026-03-03T09:15:00Z" }],
    orders: [
      { id: "o11", product: "SmartFurni Pro x4", amount: 160000000, status: "delivered", date: "2026-01-15T00:00:00Z" },
      { id: "o12", product: "SmartFurni Elite x2", amount: 80000000, status: "delivered", date: "2026-02-20T00:00:00Z" },
    ],
    tags: ["đại lý", "Hà Nội", "B2B"],
    notes: "Đại lý tại Hà Nội, quan tâm mở rộng sang Hải Phòng",
  },
  {
    id: "u8",
    name: "Lê Thị Hương",
    email: "huong.le@gmail.com",
    phone: "0978901234",
    role: "customer",
    status: "active",
    source: "social",
    city: "TP. Hồ Chí Minh",
    registeredAt: "2026-02-20T10:00:00Z",
    lastActiveAt: "2026-03-02T16:45:00Z",
    totalOrders: 1,
    totalSpent: 45000000,
    devices: [{ model: "iPhone 13", connectedAt: "2026-02-21T09:00:00Z", lastActive: "2026-03-02T16:45:00Z" }],
    orders: [
      { id: "o13", product: "SmartFurni Pro", amount: 45000000, status: "pending", date: "2026-03-02T00:00:00Z" },
    ],
    tags: ["Instagram", "TP.HCM"],
  },
  {
    id: "u9",
    name: "Võ Thành Long",
    email: "long.vo@gmail.com",
    phone: "0989012345",
    role: "vip",
    status: "active",
    source: "ads",
    city: "TP. Hồ Chí Minh",
    registeredAt: "2025-10-01T08:00:00Z",
    lastActiveAt: "2026-03-07T08:00:00Z",
    totalOrders: 7,
    totalSpent: 280000000,
    devices: [
      { model: "iPhone 15 Pro Max", connectedAt: "2025-10-02T09:00:00Z", lastActive: "2026-03-07T08:00:00Z" },
      { model: "MacBook", connectedAt: "2025-11-01T10:00:00Z", lastActive: "2026-03-05T15:00:00Z" },
    ],
    orders: [
      { id: "o14", product: "SmartFurni Elite x4", amount: 260000000, status: "delivered", date: "2025-10-15T00:00:00Z" },
      { id: "o15", product: "SmartFurni Pro", amount: 20000000, status: "delivered", date: "2026-02-28T00:00:00Z" },
    ],
    tags: ["VIP", "resort", "Google Ads"],
    notes: "Chủ resort tại Vũng Tàu, mua cho 8 phòng VIP",
  },
  {
    id: "u10",
    name: "Đinh Thị Lan",
    email: "lan.dinh@blocked.com",
    phone: "0990123456",
    role: "blocked",
    status: "blocked",
    source: "organic",
    city: "Hải Phòng",
    registeredAt: "2026-01-25T08:00:00Z",
    lastActiveAt: "2026-02-01T10:00:00Z",
    totalOrders: 0,
    totalSpent: 0,
    devices: [],
    orders: [],
    tags: ["spam"],
    notes: "Tài khoản bị khóa do hành vi spam form liên hệ",
  },
  {
    id: "u11",
    name: "Bùi Quang Hải",
    email: "hai.bui@gmail.com",
    phone: "0901122334",
    role: "customer",
    status: "active",
    source: "referral",
    city: "TP. Hồ Chí Minh",
    registeredAt: "2026-03-01T09:00:00Z",
    lastActiveAt: "2026-03-08T08:00:00Z",
    totalOrders: 1,
    totalSpent: 65000000,
    devices: [{ model: "Samsung Galaxy S23", connectedAt: "2026-03-01T10:00:00Z", lastActive: "2026-03-08T08:00:00Z" }],
    orders: [
      { id: "o16", product: "SmartFurni Elite", amount: 65000000, status: "confirmed", date: "2026-03-02T00:00:00Z" },
    ],
    tags: ["mới", "giới thiệu"],
  },
  {
    id: "u12",
    name: "Phan Thị Ngọc",
    email: "ngoc.phan@gmail.com",
    phone: "0912233445",
    role: "customer",
    status: "active",
    source: "social",
    city: "Đà Nẵng",
    registeredAt: "2026-03-05T10:00:00Z",
    lastActiveAt: "2026-03-08T09:30:00Z",
    totalOrders: 0,
    totalSpent: 0,
    devices: [],
    orders: [],
    tags: ["mới", "TikTok"],
  },
];

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function getAllUsers(): AppUser[] {
  return users.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
}

export function getUserById(id: string): AppUser | undefined {
  return users.find((u) => u.id === id);
}

export function updateUser(id: string, updates: Partial<AppUser>): AppUser | null {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  return users[idx];
}

export function deleteUser(id: string): boolean {
  const before = users.length;
  users = users.filter((u) => u.id !== id);
  return users.length < before;
}

export function createUser(data: {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  source: UserSource;
  city: string;
  notes?: string;
  tags?: string[];
}): AppUser {
  const id = `u_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const newUser: AppUser = {
    id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    status: data.status,
    source: data.source,
    city: data.city,
    registeredAt: now,
    lastActiveAt: now,
    totalOrders: 0,
    totalSpent: 0,
    devices: [],
    orders: [],
    notes: data.notes,
    tags: data.tags || [],
  };
  users.unshift(newUser);
  return newUser;
}

export function blockUser(id: string): AppUser | null {
  return updateUser(id, { status: "blocked", role: "blocked" });
}

export function unblockUser(id: string): AppUser | null {
  return updateUser(id, { status: "active", role: "customer" });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getUserStats(): UserStats {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalRevenue = users.reduce((s, u) => s + u.totalSpent, 0);
  const usersWithOrders = users.filter((u) => u.totalOrders > 0);

  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    inactiveUsers: users.filter((u) => u.status === "inactive").length,
    blockedUsers: users.filter((u) => u.status === "blocked").length,
    newUsersThisWeek: users.filter((u) => new Date(u.registeredAt) >= weekAgo).length,
    newUsersThisMonth: users.filter((u) => new Date(u.registeredAt) >= monthAgo).length,
    totalRevenue,
    avgOrderValue: usersWithOrders.length > 0
      ? Math.round(totalRevenue / usersWithOrders.reduce((s, u) => s + u.totalOrders, 0))
      : 0,
    customerCount: users.filter((u) => u.role === "customer").length,
    dealerCount: users.filter((u) => u.role === "dealer").length,
    vipCount: users.filter((u) => u.role === "vip").length,
  };
}

export function getUserDashboardStats(): UserDashboardStats {
  const stats = getUserStats();

  // By role
  const usersByRole = [
    { role: "customer", label: "Khách hàng", count: stats.customerCount, color: "#3B82F6" },
    { role: "dealer", label: "Đại lý", count: stats.dealerCount, color: "#C9A84C" },
    { role: "vip", label: "VIP", count: stats.vipCount, color: "#F472B6" },
    { role: "blocked", label: "Bị khóa", count: stats.blockedUsers, color: "#6B7280" },
  ];

  // By status
  const usersByStatus = [
    { status: "active", label: "Hoạt động", count: stats.activeUsers, color: "#22C55E" },
    { status: "inactive", label: "Không hoạt động", count: stats.inactiveUsers, color: "#F59E0B" },
    { status: "blocked", label: "Bị khóa", count: stats.blockedUsers, color: "#EF4444" },
  ];

  // By source
  const sourceMap: Record<string, number> = {};
  users.forEach((u) => { sourceMap[u.source] = (sourceMap[u.source] || 0) + 1; });
  const sourceLabels: Record<string, { label: string; color: string }> = {
    organic: { label: "Tìm kiếm tự nhiên", color: "#22C55E" },
    referral: { label: "Giới thiệu", color: "#C9A84C" },
    social: { label: "Mạng xã hội", color: "#3B82F6" },
    ads: { label: "Quảng cáo", color: "#F472B6" },
    direct: { label: "Trực tiếp", color: "#6B7280" },
  };
  const usersBySource = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source,
      label: sourceLabels[source]?.label || source,
      count,
      percentage: Math.round((count / users.length) * 100),
      color: sourceLabels[source]?.color || "#6B7280",
    }));

  // By city
  const cityMap: Record<string, number> = {};
  users.forEach((u) => { cityMap[u.city] = (cityMap[u.city] || 0) + 1; });
  const usersByCity = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => ({
      city,
      count,
      percentage: Math.round((count / users.length) * 100),
    }));

  // Registrations by day (last 7 days)
  const registrationsByDay: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    registrationsByDay.push({
      date: dateStr,
      label: d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" }),
      count: users.filter((u) => u.registeredAt.startsWith(dateStr)).length,
    });
  }

  // Revenue by role
  const revenueByRole = [
    { role: "customer", label: "Khách hàng", revenue: users.filter((u) => u.role === "customer").reduce((s, u) => s + u.totalSpent, 0), color: "#3B82F6" },
    { role: "dealer", label: "Đại lý", revenue: users.filter((u) => u.role === "dealer").reduce((s, u) => s + u.totalSpent, 0), color: "#C9A84C" },
    { role: "vip", label: "VIP", revenue: users.filter((u) => u.role === "vip").reduce((s, u) => s + u.totalSpent, 0), color: "#F472B6" },
  ];

  // Top spenders
  const topSpenders = [...users]
    .filter((u) => u.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      totalSpent: u.totalSpent,
      totalOrders: u.totalOrders,
      role: u.role,
    }));

  // Recent users (last 5 registered)
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
    .slice(0, 5);

  return {
    stats,
    usersByRole,
    usersByStatus,
    usersBySource,
    usersByCity,
    registrationsByDay,
    revenueByRole,
    topSpenders,
    recentUsers,
  };
}
