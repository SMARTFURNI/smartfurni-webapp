/**
 * crm-locations.ts — Danh sách địa chỉ Việt Nam đầy đủ cho CRM SmartFurni
 */

export const VIETNAM_PROVINCES = [
  // Miền Nam
  "TP. Hồ Chí Minh",
  "Bình Dương",
  "Đồng Nai",
  "Bà Rịa - Vũng Tàu",
  "Long An",
  "Tiền Giang",
  "Bến Tre",
  "Trà Vinh",
  "Vĩnh Long",
  "Đồng Tháp",
  "An Giang",
  "Kiên Giang",
  "Cần Thơ",
  "Hậu Giang",
  "Sóc Trăng",
  "Bạc Liêu",
  "Cà Mau",
  "Tây Ninh",
  "Bình Phước",
  // Miền Trung
  "Đà Nẵng",
  "Thừa Thiên Huế",
  "Quảng Nam",
  "Quảng Ngãi",
  "Bình Định",
  "Phú Yên",
  "Khánh Hòa",
  "Ninh Thuận",
  "Bình Thuận",
  "Quảng Bình",
  "Quảng Trị",
  "Hà Tĩnh",
  "Nghệ An",
  "Thanh Hóa",
  // Tây Nguyên
  "Lâm Đồng",
  "Đắk Lắk",
  "Đắk Nông",
  "Gia Lai",
  "Kon Tum",
  // Miền Bắc
  "Hà Nội",
  "Hải Phòng",
  "Quảng Ninh",
  "Hải Dương",
  "Hưng Yên",
  "Bắc Ninh",
  "Vĩnh Phúc",
  "Thái Nguyên",
  "Bắc Giang",
  "Phú Thọ",
  "Hà Nam",
  "Nam Định",
  "Ninh Bình",
  "Thái Bình",
  "Hòa Bình",
  "Sơn La",
  "Điện Biên",
  "Lai Châu",
  "Lào Cai",
  "Yên Bái",
  "Tuyên Quang",
  "Hà Giang",
  "Cao Bằng",
  "Bắc Kạn",
  "Lạng Sơn",
];

/** Chuẩn hoá tên địa phương cũ/viết tắt để các báo cáo không bị tách nhóm. */
const PROVINCE_ALIASES: Record<string, string> = {
  "Hồ Chí Minh": "TP. Hồ Chí Minh",
  "TP Hồ Chí Minh": "TP. Hồ Chí Minh",
  "TP.HCM": "TP. Hồ Chí Minh",
  "HCM": "TP. Hồ Chí Minh",
  "Biên Hòa": "Đồng Nai",
  "Nha Trang": "Khánh Hòa",
  "Vũng Tàu": "Bà Rịa - Vũng Tàu",
  "Huế": "Thừa Thiên Huế",
  "Đà Lạt": "Lâm Đồng",
  "Buôn Ma Thuột": "Đắk Lắk",
  "Quy Nhơn": "Bình Định",
  "Long Xuyên": "An Giang",
  "Mỹ Tho": "Tiền Giang",
  "Rạch Giá": "Kiên Giang",
};

export function normalizeVietnamProvince(value: string): string {
  const province = value?.trim();
  if (!province) return "Chưa xác định";
  return PROVINCE_ALIASES[province] || province;
}

// Quận/Huyện TP.HCM
export const HCMC_DISTRICTS = [
  "Quận 1", "Quận 2", "Quận 3", "Quận 4", "Quận 5",
  "Quận 6", "Quận 7", "Quận 8", "Quận 9", "Quận 10",
  "Quận 11", "Quận 12", "Bình Thạnh", "Gò Vấp", "Phú Nhuận",
  "Tân Bình", "Tân Phú", "Bình Tân", "Thủ Đức",
  "Hóc Môn", "Củ Chi", "Bình Chánh", "Nhà Bè", "Cần Giờ",
];

// Quận/Huyện Hà Nội
export const HANOI_DISTRICTS = [
  "Ba Đình", "Hoàn Kiếm", "Tây Hồ", "Long Biên", "Cầu Giấy",
  "Đống Đa", "Hai Bà Trưng", "Hoàng Mai", "Thanh Xuân", "Nam Từ Liêm",
  "Bắc Từ Liêm", "Hà Đông", "Sơn Tây", "Đông Anh", "Gia Lâm",
  "Thanh Trì", "Mê Linh", "Chương Mỹ", "Đan Phượng", "Hoài Đức",
  "Phúc Thọ", "Quốc Oai", "Thạch Thất", "Thanh Oai", "Thường Tín",
  "Ứng Hòa", "Mỹ Đức", "Ba Vì", "Phú Xuyên", "Sóc Sơn",
];

// Quận/Huyện Đà Nẵng
export const DANANG_DISTRICTS = [
  "Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn",
  "Liên Chiểu", "Cẩm Lệ", "Hòa Vang", "Hoàng Sa",
];

export const DISTRICT_MAP: Record<string, string[]> = {
  "TP. Hồ Chí Minh": HCMC_DISTRICTS,
  "Hà Nội": HANOI_DISTRICTS,
  "Đà Nẵng": DANANG_DISTRICTS,
};

export function getDistricts(province: string): string[] {
  return DISTRICT_MAP[province] || [];
}
