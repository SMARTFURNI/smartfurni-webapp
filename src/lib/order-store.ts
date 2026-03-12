// ─── Order Data Model ──────────────────────────────────────────────────────
import { dbLoadAll, dbSaveOne, dbDeleteOne, dbSaveAll } from "./db-store";
import { registerDbLoader } from "./db-init";

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipping" | "delivered" | "cancelled" | "refunded";
export type PaymentMethod = "cod" | "bank_transfer" | "momo" | "vnpay" | "credit_card";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface OrderItem {
  productId: string;
  productName: string;
  variant: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderTimeline {
  status: OrderStatus;
  time: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // SF-2026-XXXX
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  trackingCode?: string;
  shippingPartner?: string;
  timeline: OrderTimeline[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderDashboardStats {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    processingOrders: number;
    shippingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
    totalRevenue: number;
    totalShippingFee: number;
    totalDiscount: number;
    avgOrderValue: number;
    conversionRate: number; // delivered / total
    todayOrders: number;
    todayRevenue: number;
    weekOrders: number;
    weekRevenue: number;
  };
  ordersByStatus: { status: OrderStatus; label: string; count: number; color: string }[];
  ordersByPayment: { method: PaymentMethod; label: string; count: number; revenue: number; color: string }[];
  revenueByDay: { date: string; label: string; orders: number; revenue: number }[];
  revenueByCity: { city: string; count: number; revenue: number; percentage: number }[];
  topProducts: { productName: string; quantity: number; revenue: number }[];
  recentOrders: Order[];
  orders: Order[];
}

// ─── Persistence Layer (PostgreSQL) ─────────────────────────────────────────
function saveOrder(order: Order): void {
  dbSaveOne("orders", order);
}
function deleteOrderFromDb(id: string): void {
  dbDeleteOne("orders", id);
}

// ─── Sample Data ──────────────────────────────────────────────────────
const makeTimeline = (statuses: { status: OrderStatus; time: string; note?: string }[]): OrderTimeline[] => statuses;
const DEFAULT_ORDERS: Order[] = [
  {
    id: "ord1",
    orderNumber: "SF-2026-0001",
    customerId: "u4",
    customerName: "Phạm Thu Hà",
    customerEmail: "ha.pham@gmail.com",
    customerPhone: "0934567890",
    shippingAddress: "123 Nguyễn Huệ, Quận 1",
    city: "TP. Hồ Chí Minh",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Trắng Ngà", sku: "SFP-IVR", quantity: 2, unitPrice: 45000000, totalPrice: 90000000 },
    ],
    subtotal: 90000000,
    shippingFee: 0,
    discount: 4500000,
    total: 85500000,
    status: "delivered",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "GHTK123456",
    shippingPartner: "GHTK",
    timeline: makeTimeline([
      { status: "pending", time: "2026-01-10T08:00:00Z" },
      { status: "confirmed", time: "2026-01-10T09:30:00Z", note: "Đã xác nhận, đang chuẩn bị hàng" },
      { status: "processing", time: "2026-01-11T08:00:00Z" },
      { status: "shipping", time: "2026-01-12T10:00:00Z", note: "GHTK123456" },
      { status: "delivered", time: "2026-01-14T15:30:00Z" },
    ]),
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-01-14T15:30:00Z",
    notes: "Giao giờ hành chính",
  },
  {
    id: "ord2",
    orderNumber: "SF-2026-0002",
    customerId: "u9",
    customerName: "Võ Thành Long",
    customerEmail: "long.vo@gmail.com",
    customerPhone: "0989012345",
    shippingAddress: "45 Trần Phú, Vũng Tàu",
    city: "Vũng Tàu",
    items: [
      { productId: "p3", productName: "SmartFurni Elite", variant: "Trắng Platinum", sku: "SFE-PLT", quantity: 4, unitPrice: 65000000, totalPrice: 260000000 },
    ],
    subtotal: 260000000,
    shippingFee: 0,
    discount: 26000000,
    total: 234000000,
    status: "delivered",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "VNP789012",
    shippingPartner: "Viettel Post",
    timeline: makeTimeline([
      { status: "pending", time: "2025-10-15T09:00:00Z" },
      { status: "confirmed", time: "2025-10-15T10:00:00Z" },
      { status: "processing", time: "2025-10-16T08:00:00Z" },
      { status: "shipping", time: "2025-10-17T09:00:00Z" },
      { status: "delivered", time: "2025-10-20T14:00:00Z" },
    ]),
    createdAt: "2025-10-15T09:00:00Z",
    updatedAt: "2025-10-20T14:00:00Z",
    notes: "Resort Vũng Tàu, cần lắp đặt",
  },
  {
    id: "ord3",
    orderNumber: "SF-2026-0003",
    customerId: "u2",
    customerName: "Trần Thị Bình",
    customerEmail: "binh.tran@company.vn",
    customerPhone: "0912345678",
    shippingAddress: "78 Lê Duẩn, Hải Châu",
    city: "Đà Nẵng",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Đen Nhung", sku: "SFP-VLV", quantity: 5, unitPrice: 45000000, totalPrice: 225000000 },
    ],
    subtotal: 225000000,
    shippingFee: 0,
    discount: 22500000,
    total: 202500000,
    status: "delivered",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "GHTK234567",
    shippingPartner: "GHTK",
    timeline: makeTimeline([
      { status: "pending", time: "2026-02-01T08:30:00Z" },
      { status: "confirmed", time: "2026-02-01T10:00:00Z" },
      { status: "processing", time: "2026-02-02T08:00:00Z" },
      { status: "shipping", time: "2026-02-03T09:00:00Z" },
      { status: "delivered", time: "2026-02-06T11:00:00Z" },
    ]),
    createdAt: "2026-02-01T08:30:00Z",
    updatedAt: "2026-02-06T11:00:00Z",
  },
  {
    id: "ord4",
    orderNumber: "SF-2026-0004",
    customerId: "u7",
    customerName: "Trần Văn Đức",
    customerEmail: "duc.tran@company.vn",
    customerPhone: "0967890123",
    shippingAddress: "56 Hoàng Quốc Việt, Cầu Giấy",
    city: "Hà Nội",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Xám Bạc", sku: "SFP-SLV", quantity: 4, unitPrice: 45000000, totalPrice: 180000000 },
    ],
    subtotal: 180000000,
    shippingFee: 0,
    discount: 18000000,
    total: 162000000,
    status: "delivered",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "VNP345678",
    shippingPartner: "Viettel Post",
    timeline: makeTimeline([
      { status: "pending", time: "2026-01-15T09:00:00Z" },
      { status: "confirmed", time: "2026-01-15T11:00:00Z" },
      { status: "processing", time: "2026-01-16T08:00:00Z" },
      { status: "shipping", time: "2026-01-17T10:00:00Z" },
      { status: "delivered", time: "2026-01-19T14:00:00Z" },
    ]),
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-01-19T14:00:00Z",
  },
  {
    id: "ord5",
    orderNumber: "SF-2026-0005",
    customerId: "u1",
    customerName: "Nguyễn Văn An",
    customerEmail: "an.nguyen@gmail.com",
    customerPhone: "0901234567",
    shippingAddress: "12 Pasteur, Quận 3",
    city: "TP. Hồ Chí Minh",
    items: [
      { productId: "p1", productName: "SmartFurni Basic", variant: "Trắng", sku: "SFB-WHT", quantity: 1, unitPrice: 23000000, totalPrice: 23000000 },
      { productId: "p5", productName: "Remote SmartFurni", variant: "Trắng", sku: "RMT-WHT", quantity: 1, unitPrice: 450000, totalPrice: 450000 },
    ],
    subtotal: 23450000,
    shippingFee: 50000,
    discount: 0,
    total: 23500000,
    status: "delivered",
    paymentMethod: "momo",
    paymentStatus: "paid",
    trackingCode: "GHTK456789",
    shippingPartner: "GHTK",
    timeline: makeTimeline([
      { status: "pending", time: "2026-02-10T10:00:00Z" },
      { status: "confirmed", time: "2026-02-10T11:30:00Z" },
      { status: "processing", time: "2026-02-11T08:00:00Z" },
      { status: "shipping", time: "2026-02-12T09:00:00Z" },
      { status: "delivered", time: "2026-02-13T16:00:00Z" },
    ]),
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-02-13T16:00:00Z",
  },
  {
    id: "ord6",
    orderNumber: "SF-2026-0006",
    customerId: "u3",
    customerName: "Lê Minh Cường",
    customerEmail: "cuong.le@hotmail.com",
    customerPhone: "0923456789",
    shippingAddress: "89 Cầu Giấy, Cầu Giấy",
    city: "Hà Nội",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Trắng Ngà", sku: "SFP-IVR", quantity: 1, unitPrice: 45000000, totalPrice: 45000000 },
    ],
    subtotal: 45000000,
    shippingFee: 0,
    discount: 2250000,
    total: 42750000,
    status: "delivered",
    paymentMethod: "vnpay",
    paymentStatus: "paid",
    trackingCode: "VNP456789",
    shippingPartner: "Viettel Post",
    timeline: makeTimeline([
      { status: "pending", time: "2026-02-05T14:00:00Z" },
      { status: "confirmed", time: "2026-02-05T15:00:00Z" },
      { status: "processing", time: "2026-02-06T08:00:00Z" },
      { status: "shipping", time: "2026-02-07T10:00:00Z" },
      { status: "delivered", time: "2026-02-09T11:00:00Z" },
    ]),
    createdAt: "2026-02-05T14:00:00Z",
    updatedAt: "2026-02-09T11:00:00Z",
  },
  {
    id: "ord7",
    orderNumber: "SF-2026-0007",
    customerId: "u11",
    customerName: "Bùi Quang Hải",
    customerEmail: "hai.bui@gmail.com",
    customerPhone: "0901122334",
    shippingAddress: "34 Nguyễn Thị Minh Khai, Quận 1",
    city: "TP. Hồ Chí Minh",
    items: [
      { productId: "p3", productName: "SmartFurni Elite", variant: "Đen Carbon", sku: "SFE-CBN", quantity: 1, unitPrice: 65000000, totalPrice: 65000000 },
    ],
    subtotal: 65000000,
    shippingFee: 0,
    discount: 3250000,
    total: 61750000,
    status: "confirmed",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: undefined,
    shippingPartner: undefined,
    timeline: makeTimeline([
      { status: "pending", time: "2026-03-02T09:00:00Z" },
      { status: "confirmed", time: "2026-03-02T10:30:00Z", note: "Đã thanh toán, đang chuẩn bị hàng" },
    ]),
    createdAt: "2026-03-02T09:00:00Z",
    updatedAt: "2026-03-02T10:30:00Z",
  },
  {
    id: "ord8",
    orderNumber: "SF-2026-0008",
    customerId: "u8",
    customerName: "Lê Thị Hương",
    customerEmail: "huong.le@gmail.com",
    customerPhone: "0978901234",
    shippingAddress: "67 Đinh Tiên Hoàng, Bình Thạnh",
    city: "TP. Hồ Chí Minh",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Đen Nhung", sku: "SFP-VLV", quantity: 1, unitPrice: 45000000, totalPrice: 45000000 },
    ],
    subtotal: 45000000,
    shippingFee: 0,
    discount: 0,
    total: 45000000,
    status: "pending",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    timeline: makeTimeline([
      { status: "pending", time: "2026-03-02T16:00:00Z" },
    ]),
    createdAt: "2026-03-02T16:00:00Z",
    updatedAt: "2026-03-02T16:00:00Z",
    notes: "Gọi trước khi giao",
  },
  {
    id: "ord9",
    orderNumber: "SF-2026-0009",
    customerId: "u5",
    customerName: "Hoàng Minh Tuấn",
    customerEmail: "tuan.hoang@gmail.com",
    customerPhone: "0945678901",
    shippingAddress: "23 Kim Mã, Ba Đình",
    city: "Hà Nội",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Trắng Ngà", sku: "SFP-IVR", quantity: 1, unitPrice: 45000000, totalPrice: 45000000 },
    ],
    subtotal: 45000000,
    shippingFee: 0,
    discount: 0,
    total: 45000000,
    status: "processing",
    paymentMethod: "momo",
    paymentStatus: "paid",
    timeline: makeTimeline([
      { status: "pending", time: "2026-02-12T10:00:00Z" },
      { status: "confirmed", time: "2026-02-12T11:00:00Z" },
      { status: "processing", time: "2026-02-13T08:00:00Z", note: "Đang đóng gói" },
    ]),
    createdAt: "2026-02-12T10:00:00Z",
    updatedAt: "2026-02-13T08:00:00Z",
  },
  {
    id: "ord10",
    orderNumber: "SF-2026-0010",
    customerId: "u4",
    customerName: "Phạm Thu Hà",
    customerEmail: "ha.pham@gmail.com",
    customerPhone: "0934567890",
    shippingAddress: "123 Nguyễn Huệ, Quận 1",
    city: "TP. Hồ Chí Minh",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Trắng Ngà", sku: "SFP-IVR", quantity: 1, unitPrice: 45000000, totalPrice: 45000000 },
      { productId: "p6", productName: "Nệm Memory Foam", variant: "1.8m x 2m", sku: "MTR-180", quantity: 1, unitPrice: 8500000, totalPrice: 8500000 },
    ],
    subtotal: 53500000,
    shippingFee: 0,
    discount: 5350000,
    total: 48150000,
    status: "shipping",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "GHTK567890",
    shippingPartner: "GHTK",
    timeline: makeTimeline([
      { status: "pending", time: "2026-03-01T09:00:00Z" },
      { status: "confirmed", time: "2026-03-01T10:00:00Z" },
      { status: "processing", time: "2026-03-02T08:00:00Z" },
      { status: "shipping", time: "2026-03-03T09:00:00Z", note: "GHTK567890 - Dự kiến 5/3" },
    ]),
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-03T09:00:00Z",
  },
  {
    id: "ord11",
    orderNumber: "SF-2026-0011",
    customerId: "u6",
    customerName: "Nguyễn Thị Mai",
    customerEmail: "mai.nguyen@yahoo.com",
    customerPhone: "0956789012",
    shippingAddress: "45 Hòa Bình, Ninh Kiều",
    city: "Cần Thơ",
    items: [
      { productId: "p1", productName: "SmartFurni Basic", variant: "Xám", sku: "SFB-GRY", quantity: 1, unitPrice: 23000000, totalPrice: 23000000 },
    ],
    subtotal: 23000000,
    shippingFee: 80000,
    discount: 0,
    total: 23080000,
    status: "delivered",
    paymentMethod: "cod",
    paymentStatus: "paid",
    trackingCode: "VNP678901",
    shippingPartner: "Viettel Post",
    timeline: makeTimeline([
      { status: "pending", time: "2025-12-10T10:00:00Z" },
      { status: "confirmed", time: "2025-12-10T11:00:00Z" },
      { status: "processing", time: "2025-12-11T08:00:00Z" },
      { status: "shipping", time: "2025-12-12T10:00:00Z" },
      { status: "delivered", time: "2025-12-15T14:00:00Z" },
    ]),
    createdAt: "2025-12-10T10:00:00Z",
    updatedAt: "2025-12-15T14:00:00Z",
  },
  {
    id: "ord12",
    orderNumber: "SF-2026-0012",
    customerId: "u12",
    customerName: "Phan Thị Ngọc",
    customerEmail: "ngoc.phan@gmail.com",
    customerPhone: "0912233445",
    shippingAddress: "12 Trần Phú, Hải Châu",
    city: "Đà Nẵng",
    items: [
      { productId: "p1", productName: "SmartFurni Basic", variant: "Trắng", sku: "SFB-WHT", quantity: 1, unitPrice: 23000000, totalPrice: 23000000 },
    ],
    subtotal: 23000000,
    shippingFee: 60000,
    discount: 0,
    total: 23060000,
    status: "cancelled",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    timeline: makeTimeline([
      { status: "pending", time: "2026-03-05T14:00:00Z" },
      { status: "cancelled", time: "2026-03-06T09:00:00Z", note: "Khách hủy: đổi ý" },
    ]),
    createdAt: "2026-03-05T14:00:00Z",
    updatedAt: "2026-03-06T09:00:00Z",
    notes: "Khách hủy đơn qua điện thoại",
  },
  {
    id: "ord13",
    orderNumber: "SF-2026-0013",
    customerId: "u2",
    customerName: "Trần Thị Bình",
    customerEmail: "binh.tran@company.vn",
    customerPhone: "0912345678",
    shippingAddress: "78 Lê Duẩn, Hải Châu",
    city: "Đà Nẵng",
    items: [
      { productId: "p3", productName: "SmartFurni Elite", variant: "Trắng Platinum", sku: "SFE-PLT", quantity: 3, unitPrice: 65000000, totalPrice: 195000000 },
    ],
    subtotal: 195000000,
    shippingFee: 0,
    discount: 19500000,
    total: 175500000,
    status: "shipping",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "GHTK678901",
    shippingPartner: "GHTK",
    timeline: makeTimeline([
      { status: "pending", time: "2026-02-15T09:00:00Z" },
      { status: "confirmed", time: "2026-02-15T10:00:00Z" },
      { status: "processing", time: "2026-02-16T08:00:00Z" },
      { status: "shipping", time: "2026-02-17T09:00:00Z", note: "GHTK678901" },
    ]),
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-17T09:00:00Z",
  },
  {
    id: "ord14",
    orderNumber: "SF-2026-0014",
    customerId: "u7",
    customerName: "Trần Văn Đức",
    customerEmail: "duc.tran@company.vn",
    customerPhone: "0967890123",
    shippingAddress: "56 Hoàng Quốc Việt, Cầu Giấy",
    city: "Hà Nội",
    items: [
      { productId: "p3", productName: "SmartFurni Elite", variant: "Đen Carbon", sku: "SFE-CBN", quantity: 2, unitPrice: 65000000, totalPrice: 130000000 },
    ],
    subtotal: 130000000,
    shippingFee: 0,
    discount: 13000000,
    total: 117000000,
    status: "delivered",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "VNP789012",
    shippingPartner: "Viettel Post",
    timeline: makeTimeline([
      { status: "pending", time: "2026-02-20T09:00:00Z" },
      { status: "confirmed", time: "2026-02-20T10:00:00Z" },
      { status: "processing", time: "2026-02-21T08:00:00Z" },
      { status: "shipping", time: "2026-02-22T09:00:00Z" },
      { status: "delivered", time: "2026-02-25T14:00:00Z" },
    ]),
    createdAt: "2026-02-20T09:00:00Z",
    updatedAt: "2026-02-25T14:00:00Z",
  },
  {
    id: "ord15",
    orderNumber: "SF-2026-0015",
    customerId: "u9",
    customerName: "Võ Thành Long",
    customerEmail: "long.vo@gmail.com",
    customerPhone: "0989012345",
    shippingAddress: "45 Trần Phú, Vũng Tàu",
    city: "Vũng Tàu",
    items: [
      { productId: "p2", productName: "SmartFurni Pro", variant: "Trắng Ngà", sku: "SFP-IVR", quantity: 1, unitPrice: 45000000, totalPrice: 45000000 },
      { productId: "p6", productName: "Nệm Memory Foam", variant: "1.8m x 2m", sku: "MTR-180", quantity: 1, unitPrice: 8500000, totalPrice: 8500000 },
    ],
    subtotal: 53500000,
    shippingFee: 0,
    discount: 5350000,
    total: 48150000,
    status: "delivered",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    trackingCode: "GHTK789012",
    shippingPartner: "GHTK",
    timeline: makeTimeline([
      { status: "pending", time: "2026-02-28T09:00:00Z" },
      { status: "confirmed", time: "2026-02-28T10:00:00Z" },
      { status: "processing", time: "2026-03-01T08:00:00Z" },
      { status: "shipping", time: "2026-03-02T09:00:00Z" },
      { status: "delivered", time: "2026-03-04T14:00:00Z" },
    ]),
    createdAt: "2026-02-28T09:00:00Z",
    updatedAt: "2026-03-04T14:00:00Z",
  },
  {
    id: "ord16",
    orderNumber: "SF-2026-0016",
    customerId: "u4",
    customerName: "Phạm Thu Hà",
    customerEmail: "ha.pham@gmail.com",
    customerPhone: "0934567890",
    shippingAddress: "123 Nguyễn Huệ, Quận 1",
    city: "TP. Hồ Chí Minh",
    items: [
      { productId: "p3", productName: "SmartFurni Elite", variant: "Trắng Platinum", sku: "SFE-PLT", quantity: 1, unitPrice: 65000000, totalPrice: 65000000 },
    ],
    subtotal: 65000000,
    shippingFee: 0,
    discount: 6500000,
    total: 58500000,
    status: "pending",
    paymentMethod: "bank_transfer",
    paymentStatus: "unpaid",
    timeline: makeTimeline([
      { status: "pending", time: "2026-03-08T10:00:00Z" },
    ]),
    createdAt: "2026-03-08T10:00:00Z",
    updatedAt: "2026-03-08T10:00:00Z",
     notes: "Đơn mới hôm nay",
  },
];

// In-memory orders — populated from PostgreSQL on first request
let orders: Order[] = [...DEFAULT_ORDERS];

// Register DB loader for orders
registerDbLoader(async () => {
  const rows = await dbLoadAll<Order>("orders");
  if (rows && rows.length > 0) {
    orders = rows;
    console.log(`[order-store] Loaded ${orders.length} orders from database`);
  } else if (rows !== null) {
    console.log("[order-store] Seeding database with default orders...");
    dbSaveAll("orders", DEFAULT_ORDERS);
  }
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function getAllOrders(): Order[] {
  return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function updateOrderStatus(id: string, status: OrderStatus, note?: string): Order | null {
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  orders[idx].timeline.push({ status, time: new Date().toISOString(), note });
  saveOrder(orders[idx]);
  return orders[idx];
}

export function updateOrder(id: string, updates: Partial<Order>): Order | null {
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  // Recalculate total if items changed
  if (updates.items) {
    const subtotal = updates.items.reduce((s, i) => s + i.totalPrice, 0);
    const shippingFee = updates.shippingFee ?? orders[idx].shippingFee;
    const discount = updates.discount ?? orders[idx].discount;
    updates.subtotal = subtotal;
    updates.total = subtotal + shippingFee - discount;
  }
  orders[idx] = { ...orders[idx], ...updates, updatedAt: new Date().toISOString() };
  saveOrder(orders[idx]);
  return orders[idx];
}

export function createOrder(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  items: Omit<OrderItem, "totalPrice">[];
  shippingFee: number;
  discount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  trackingCode?: string;
  shippingPartner?: string;
}): Order {
  const id = `ord_${Date.now().toString(36)}`;
  const year = new Date().getFullYear();
  const seq = String(orders.length + 1).padStart(4, "0");
  const orderNumber = `SF-${year}-${seq}`;

  const items: OrderItem[] = data.items.map((i) => ({
    ...i,
    totalPrice: i.unitPrice * i.quantity,
  }));
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const total = subtotal + data.shippingFee - data.discount;

  const newOrder: Order = {
    id,
    orderNumber,
    customerId: `cust_${Date.now().toString(36)}`,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    shippingAddress: data.shippingAddress,
    city: data.city,
    items,
    subtotal,
    shippingFee: data.shippingFee,
    discount: data.discount,
    total,
    status: data.status,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    notes: data.notes,
    trackingCode: data.trackingCode,
    shippingPartner: data.shippingPartner,
    timeline: [{ status: data.status, time: new Date().toISOString(), note: "Đơn hàng được tạo thủ công" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  saveOrder(newOrder);
  return newOrder;
}

export function deleteOrder(id: string): boolean {
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  orders.splice(idx, 1);
  deleteOrderFromDb(id);
  return true;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function getOrderDashboardStats(): OrderDashboardStats {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalRevenue = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const conversionRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;

  const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));
  const weekOrders = orders.filter((o) => new Date(o.createdAt) >= weekAgo);

  // By status
  const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
    pending: { label: "Chờ xác nhận", color: "#F59E0B" },
    confirmed: { label: "Đã xác nhận", color: "#3B82F6" },
    processing: { label: "Đang xử lý", color: "#8B5CF6" },
    shipping: { label: "Đang giao", color: "#06B6D4" },
    delivered: { label: "Đã giao", color: "#22C55E" },
    cancelled: { label: "Đã hủy", color: "#EF4444" },
    refunded: { label: "Hoàn tiền", color: "#6B7280" },
  };
  const statusMap: Record<string, number> = {};
  orders.forEach((o) => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
  const ordersByStatus = (Object.keys(statusConfig) as OrderStatus[]).map((s) => ({
    status: s,
    label: statusConfig[s].label,
    count: statusMap[s] || 0,
    color: statusConfig[s].color,
  })).filter((s) => s.count > 0);

  // By payment method
  const paymentConfig: Record<PaymentMethod, { label: string; color: string }> = {
    bank_transfer: { label: "Chuyển khoản", color: "#C9A84C" },
    cod: { label: "COD", color: "#22C55E" },
    momo: { label: "MoMo", color: "#F472B6" },
    vnpay: { label: "VNPay", color: "#3B82F6" },
    credit_card: { label: "Thẻ tín dụng", color: "#8B5CF6" },
  };
  const paymentMap: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (!paymentMap[o.paymentMethod]) paymentMap[o.paymentMethod] = { count: 0, revenue: 0 };
    paymentMap[o.paymentMethod].count++;
    if (o.paymentStatus === "paid") paymentMap[o.paymentMethod].revenue += o.total;
  });
  const ordersByPayment = (Object.keys(paymentConfig) as PaymentMethod[])
    .filter((m) => paymentMap[m])
    .map((m) => ({
      method: m,
      label: paymentConfig[m].label,
      count: paymentMap[m].count,
      revenue: paymentMap[m].revenue,
      color: paymentConfig[m].color,
    }));

  // Revenue by day (last 7 days)
  const revenueByDay: { date: string; label: string; orders: number; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = orders.filter((o) => o.createdAt.startsWith(dateStr));
    revenueByDay.push({
      date: dateStr,
      label: d.toLocaleDateString("vi-VN", { weekday: "short" }),
      orders: dayOrders.length,
      revenue: dayOrders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
    });
  }

  // By city
  const cityMap: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (!cityMap[o.city]) cityMap[o.city] = { count: 0, revenue: 0 };
    cityMap[o.city].count++;
    if (o.paymentStatus === "paid") cityMap[o.city].revenue += o.total;
  });
  const revenueByCity = Object.entries(cityMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([city, v]) => ({
      city,
      count: v.count,
      revenue: v.revenue,
      percentage: Math.round((v.count / orders.length) * 100),
    }));

  // Top products
  const productMap: Record<string, { quantity: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productMap[item.productName]) productMap[item.productName] = { quantity: 0, revenue: 0 };
      productMap[item.productName].quantity += item.quantity;
      productMap[item.productName].revenue += item.totalPrice;
    });
  });
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([productName, v]) => ({ productName, ...v }));

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return {
    stats: {
      totalOrders: orders.length,
      pendingOrders: statusMap["pending"] || 0,
      confirmedOrders: statusMap["confirmed"] || 0,
      processingOrders: statusMap["processing"] || 0,
      shippingOrders: statusMap["shipping"] || 0,
      deliveredOrders: statusMap["delivered"] || 0,
      cancelledOrders: statusMap["cancelled"] || 0,
      refundedOrders: statusMap["refunded"] || 0,
      totalRevenue,
      totalShippingFee: orders.reduce((s, o) => s + o.shippingFee, 0),
      totalDiscount: orders.reduce((s, o) => s + o.discount, 0),
      avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.filter((o) => o.paymentStatus === "paid").length) : 0,
      conversionRate,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
      weekOrders: weekOrders.length,
      weekRevenue: weekOrders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
    },
    ordersByStatus,
    ordersByPayment,
    revenueByDay,
    revenueByCity,
    topProducts,
    recentOrders,
    orders: getAllOrders(),
  };
}
