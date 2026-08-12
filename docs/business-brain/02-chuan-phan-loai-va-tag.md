# Chuẩn phân loại và hệ thống tag

**Chủ sở hữu:** CRM Admin  
**Chu kỳ rà soát:** Hàng tháng

Mỗi khách hàng phải có tối thiểu ba lớp tag. Không tạo tag tự do nếu đã có tag chuẩn.

| Lớp | Giá trị chuẩn |
|---|---|
| Đối tượng | `SEG:BAN_LE`, `SEG:DAI_LY`, `SEG:DU_AN`, `SEG:B2B` |
| Sản phẩm | `PROD:SOFA_GIUONG`, `PROD:GIUONG_CONG_THAI_HOC` |
| Trạng thái | `STAGE:MOI`, `STAGE:DA_XAC_NHAN`, `STAGE:DA_TU_VAN`, `STAGE:DA_BAO_GIA`, `STAGE:DANG_THUONG_LUONG`, `STAGE:DA_CHOT`, `STAGE:NUOI_DUONG`, `STAGE:KHONG_PHU_HOP` |

## Cây quyết định

```mermaid
flowchart TD
    A[Lead đã xác minh] --> B{Mua cho ai?}
    B -->|Cá nhân| C[SEG:BAN_LE]
    B -->|Bán lại| D[SEG:DAI_LY]
    B -->|Công trình| E[SEG:DU_AN]
    B -->|Doanh nghiệp sử dụng| F[SEG:B2B]
    C --> G[Tag sản phẩm]
    D --> G
    E --> G
    F --> G
    G --> H[Tag trạng thái]
```

Nhân viên cập nhật trạng thái sau mỗi lần liên hệ và ghi rõ lý do khi chuyển sang nuôi dưỡng hoặc không phù hợp.

