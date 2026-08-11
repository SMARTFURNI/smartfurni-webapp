export type ZaloFollowLeadOption = {
  id: string;
  label: string;
  description: string;
};

const OPTIONS: Record<string, ZaloFollowLeadOption[]> = {
  sofa_bed: [
    { id: "sofa-khung-go", label: "Sofa giường khung gỗ", description: "Ấm áp, phù hợp căn hộ và phòng khách" },
    { id: "sofa-da-pu", label: "Sofa giường da PU", description: "Sang trọng, dễ vệ sinh" },
    { id: "sofa-tu-van", label: "Cần gợi ý mẫu phù hợp", description: "Tư vấn theo ảnh và diện tích phòng" },
  ],
  electric_sofa: [
    { id: "sofa-chinh-dien-don", label: "Sofa chỉnh điện đơn", description: "Ghế thư giãn cho một người" },
    { id: "sofa-chinh-dien-doi", label: "Sofa chỉnh điện đôi", description: "Phù hợp phòng khách gia đình" },
    { id: "sofa-dien-tu-van", label: "Cần gợi ý cấu hình", description: "Chọn theo diện tích và công năng" },
  ],
  ergonomic_bed: [
    { id: "nang-cap-giuong-cu", label: "Nâng cấp giường hiện có", description: "Giữ lại phong cách và khung giường cũ" },
    { id: "giuong-dieu-chinh-don", label: "Giường điều chỉnh đơn", description: "Nâng đầu và chân bằng remote" },
    { id: "giuong-dieu-chinh-doi", label: "Giường đôi độc lập", description: "Hai người dùng hai tư thế riêng" },
  ],
  care_bed: [
    { id: "giuong-cham-soc-tai-nha", label: "Chăm sóc tại nhà", description: "Hỗ trợ sinh hoạt và nghỉ ngơi" },
    { id: "giuong-nguoi-cao-tuoi", label: "Dành cho người cao tuổi", description: "Ưu tiên an toàn và dễ sử dụng" },
    { id: "giuong-can-tu-van", label: "Cần tư vấn cấu hình", description: "Tư vấn theo nhu cầu người dùng" },
  ],
  mattress: [
    { id: "nem-foam", label: "Nệm foam", description: "Êm vừa, nhiều mức ngân sách" },
    { id: "nem-cao-su", label: "Nệm cao su", description: "Nâng đỡ và thông thoáng" },
    { id: "nem-tu-van", label: "Chưa chọn được loại nệm", description: "Tư vấn theo thói quen nằm" },
  ],
  all_products: [
    { id: "sofa-giuong", label: "Sofa giường", description: "Tiết kiệm diện tích, dùng đa năng" },
    { id: "giuong-cong-thai-hoc", label: "Giường công thái học", description: "Điều chỉnh tư thế bằng remote" },
    { id: "san-pham-khac", label: "Sản phẩm khác", description: "Để chuyên viên SmartFurni tư vấn" },
  ],
};

export function getZaloFollowLeadOptions(productKey: string): ZaloFollowLeadOption[] {
  return OPTIONS[productKey] || OPTIONS.all_products;
}

export function getZaloFollowQualifiers(productKey: string): { label: string; values: string[] } {
  if (productKey === "all_products") {
    return { label: "Diện tích không gian dự kiến", values: ["Dưới 10m²", "10–20m²", "Trên 20m²", "Chưa đo"] };
  }
  if (productKey === "electric_sofa") {
    return { label: "Số chỗ ngồi dự kiến", values: ["1 chỗ", "2 chỗ", "3 chỗ", "Cần tư vấn"] };
  }
  if (productKey === "mattress") {
    return { label: "Kích thước nệm dự kiến", values: ["1m2", "1m4", "1m6", "1m8", "Chưa rõ"] };
  }
  return { label: "Kích thước dự kiến", values: ["1m2", "1m4", "1m6", "1m8", "Kích thước khác", "Chưa đo"] };
}

export function normalizeZaloLeadPhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, "");
  if (/^\+84\d{9}$/.test(compact)) return `0${compact.slice(3)}`;
  if (/^84\d{9}$/.test(compact)) return `0${compact.slice(2)}`;
  if (/^0\d{9}$/.test(compact)) return compact;
  return null;
}
