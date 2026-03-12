import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllContacts } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";

export async function GET(req: NextRequest) {
  await initDbOnce();
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const filterStatus = url.searchParams.get("status"); // "read" | "unread" | null (all)
  const format = url.searchParams.get("format") || "csv"; // "csv" | "json"

  let contacts = getAllContacts();

  // Apply filter
  if (filterStatus === "read") contacts = contacts.filter((c) => c.read);
  if (filterStatus === "unread") contacts = contacts.filter((c) => !c.read);

  if (format === "json") {
    const json = JSON.stringify(contacts, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="smartfurni-contacts-${Date.now()}.json"`,
      },
    });
  }

  // CSV format
  const escapeCSV = (val: string | undefined) => {
    if (!val) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ["ID", "Họ tên", "Email", "Số điện thoại", "Chủ đề", "Nội dung", "Thời gian gửi", "Trạng thái"];
  const rows = contacts.map((c) => [
    escapeCSV(c.id),
    escapeCSV(c.name),
    escapeCSV(c.email),
    escapeCSV(c.phone),
    escapeCSV(c.subject),
    escapeCSV(c.message),
    escapeCSV(new Date(c.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })),
    escapeCSV(c.read ? "Đã đọc" : "Chưa đọc"),
  ]);

  const csvContent = [
    "\uFEFF" + headers.join(","), // BOM for Excel UTF-8
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");

  const filename = `smartfurni-contacts-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
