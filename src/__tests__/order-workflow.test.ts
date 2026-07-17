import { describe, expect, it } from "vitest";
import { getOrderById, getOrderDashboardStats, updateOrder } from "@/lib/order-store";
import { normalizeVietnamProvince } from "@/lib/crm-locations";

describe("order workflow", () => {
  it("lưu đồng thời trạng thái đơn, thanh toán, tổng tiền và tỉnh thành", async () => {
    const original = getOrderById("ord16");
    expect(original).toBeDefined();

    const updated = await updateOrder("ord16", {
      status: "confirmed",
      paymentStatus: "paid",
      city: "Biên Hòa",
      items: original!.items.map(({ totalPrice: _totalPrice, ...item }) => ({
        ...item,
        totalPrice: 0,
      })),
    });

    expect(updated?.status).toBe("confirmed");
    expect(updated?.paymentStatus).toBe("paid");
    expect(updated?.city).toBe("Đồng Nai");
    expect(updated?.items[0].totalPrice).toBe(updated!.items[0].unitPrice * updated!.items[0].quantity);
    expect(updated?.timeline.at(-1)?.status).toBe("confirmed");

    const dashboard = getOrderDashboardStats();
    expect(dashboard.stats.totalConfirmedSales).toBeGreaterThanOrEqual(updated!.total);
    expect(dashboard.stats.totalRevenue).toBeGreaterThanOrEqual(updated!.total);
    expect(dashboard.revenueByCity.some((entry) => entry.city === "Đồng Nai")).toBe(true);
  });

  it("chuẩn hoá các tên thành phố cũ về tỉnh/thành báo cáo", () => {
    expect(normalizeVietnamProvince("TP.HCM")).toBe("TP. Hồ Chí Minh");
    expect(normalizeVietnamProvince("Nha Trang")).toBe("Khánh Hòa");
    expect(normalizeVietnamProvince("  Hà Nội  ")).toBe("Hà Nội");
  });
});
