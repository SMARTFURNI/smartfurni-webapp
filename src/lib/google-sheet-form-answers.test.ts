import { describe, expect, it } from "vitest";
import {
  collectGoogleFormAnswers,
  formatGoogleFormAnswers,
  getGoogleFormAnswers,
  normalizeSheetHeader,
} from "./google-sheet-form-answers";

describe("Google Sheet form answers", () => {
  it("đối chiếu tiêu đề không phân biệt dấu và ký tự đặc biệt", () => {
    expect(normalizeSheetHeader("Số căn/phòng dự kiến?"))
      .toBe("so_can_phong_du_kien");
  });

  it("dùng nhãn tùy chỉnh và vẫn giữ các câu hỏi chưa ánh xạ", () => {
    const answers = collectGoogleFormAnswers({
      headers: ["Họ tên", "SĐT", "Phong cách yêu thích?", "Khung giờ gọi lại"],
      row: ["Nguyễn An", "0901234567", "Hiện đại", "Sau 18h"],
      excludedColumns: ["Họ tên", "SĐT"],
      customMappings: [
        { id: "style", label: "Phong cách", column: "Phong cách yêu thích?" },
      ],
    });

    expect(answers).toEqual({
      "Phong cách": "Hiện đại",
      "Khung giờ gọi lại": "Sau 18h",
    });
  });

  it("giữ đủ câu trả lời thực tế nhưng loại các cột kỹ thuật của nguồn quảng cáo", () => {
    const answers = collectGoogleFormAnswers({
      headers: [
        "id",
        "created_time",
        "ad_id",
        "ad_name",
        "tên_đầy_đủ",
        "số_điện_thoại",
        "anh/chị_đang_quan_tâm_phương_án_nào?",
        "mục_đích_sử_dụng_chính_của_anh/chị_là_gì?",
        "Câu hỏi mới từ form",
      ],
      row: [
        "l:123",
        "2026-08-19T20:24:51-05:00",
        "ag:456",
        "Video showroom",
        "Nguyễn An",
        "0901234567",
        "Mua khung nâng hạ",
        "Sử dụng cho bản thân",
        "Cần tư vấn thêm",
      ],
      excludedColumns: ["tên_đầy_đủ", "số_điện_thoại"],
      customMappings: [
        {
          id: "bed_option",
          label: "Phương án giường quan tâm",
          column: "anh/chị_đang_quan_tâm_phương_án_nào?",
        },
        {
          id: "primary_use",
          label: "Mục đích sử dụng chính",
          column: "mục_đích_sử_dụng_chính_của_anh/chị_là_gì?",
        },
      ],
    });

    expect(answers).toEqual({
      "Phương án giường quan tâm": "Mua khung nâng hạ",
      "Mục đích sử dụng chính": "Sử dụng cho bản thân",
      "Câu hỏi mới từ form": "Cần tư vấn thêm",
    });
  });

  it("đọc và định dạng câu trả lời an toàn từ rawData", () => {
    const rawData = {
      formAnswers: {
        "Sản phẩm": "Sofa giường",
        "Ngân sách": "20 triệu",
        "Bỏ qua": "",
      },
    };

    expect(getGoogleFormAnswers(rawData)).toEqual({
      "Sản phẩm": "Sofa giường",
      "Ngân sách": "20 triệu",
    });
    expect(formatGoogleFormAnswers(rawData)).toContain("- Sản phẩm: Sofa giường");
  });
});
