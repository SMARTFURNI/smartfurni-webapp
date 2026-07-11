import type { Product } from "@/lib/product-store";

export const PRODUCT_DESCRIPTION_TEMPLATE_MARKER = "data-smartfurni-product-description-template";
export const PRODUCT_DESCRIPTION_TEMPLATE_VERSION = "gsf150-full-v3";

export function hasProductDescriptionTemplate(html?: string | null) {
  return Boolean(
    html?.includes(PRODUCT_DESCRIPTION_TEMPLATE_MARKER) &&
      html.includes(`data-smartfurni-product-description-version="${PRODUCT_DESCRIPTION_TEMPLATE_VERSION}"`)
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatVnd(value?: number): string {
  if (!value || value <= 0) return "Liên hệ";
  return `${value.toLocaleString("vi-VN")} đ`;
}

function getProductImage(product?: Partial<Product>, fallback = "/gsf150-wood-frame.jpg"): string {
  return product?.coverImage || product?.images?.[0] || fallback;
}

export function getDefaultProductLandingDescriptionTemplate(product?: Partial<Product>): string {
  const name = escapeHtml(product?.name || "SmartFurni GSF150");
  const description = escapeHtml(
    product?.description ||
      "Khung nâng hạ điện lắp gọn trong lòng giường hiện có, giúp nâng đầu và chân linh hoạt bằng remote."
  );
  const price = escapeHtml(formatVnd(product?.price));
  const heroImage = escapeHtml(getProductImage(product));

  return `
<div class="sf-product-description-template" ${PRODUCT_DESCRIPTION_TEMPLATE_MARKER}="true" data-smartfurni-product-description-version="${PRODUCT_DESCRIPTION_TEMPLATE_VERSION}">
  <section class="sf-desc-section sf-desc-hero">
    <div class="sf-desc-hero-grid">
      <div class="sf-desc-hero-copy">
        <p class="sf-desc-kicker">Mô tả sản phẩm</p>
        <h2 class="sf-desc-title">
          ${name}
          <span class="sf-desc-gold">Nâng cấp trải nghiệm nghỉ ngơi</span>
        </h2>
        <p class="sf-desc-lead">${description}</p>
        <div class="sf-desc-actions">
          <a href="#chon-phien-ban" class="sf-desc-btn sf-desc-btn-primary">Chọn phiên bản</a>
          <a href="#thong-so" class="sf-desc-btn sf-desc-btn-ghost">Xem thông số</a>
        </div>
        <div class="sf-desc-stats">
          <div><strong>5 năm</strong><span>Bảo hành motor</span></div>
          <div><strong>0-70 độ</strong><span>Nâng đầu linh hoạt</span></div>
          <div><strong>0-45 độ</strong><span>Nâng chân thư giãn</span></div>
          <div><strong>Từ ${price}</strong><span>Giá tham khảo</span></div>
        </div>
      </div>
      <div class="sf-desc-hero-media">
        <img src="${heroImage}" alt="${name}" loading="lazy" decoding="async" />
      </div>
    </div>
  </section>

  <section class="sf-desc-section sf-desc-comparison" id="van-de">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Vấn đề & giải pháp</p>
      <h2 class="sf-desc-title">Giường cũ đang thiếu <span class="sf-desc-gold">một trải nghiệm nghỉ ngơi tốt hơn</span></h2>
      <p class="sf-desc-lead">Cùng một không gian phòng ngủ, nhưng cảm giác nghỉ ngơi có thể khác hẳn khi tư thế được nâng đỡ đúng cách.</p>
    </div>
    <div class="sf-desc-two-cols">
      <div class="sf-desc-panel sf-desc-panel-bad">
        <p class="sf-desc-panel-label">Vấn đề hiện tại</p>
        <h3>Vấn đề thường gặp</h3>
        <div class="sf-desc-list">
          <div><span>x</span>Giường cố định chỉ nằm phẳng, khó đọc sách hoặc xem phim thoải mái</div>
          <div><span>x</span>Muốn đổi sang giường nâng hạ nhưng không muốn bỏ khung giường đang dùng</div>
          <div><span>x</span>Nệm hiện có vẫn còn tốt, chưa muốn mua trọn bộ giường mới</div>
          <div><span>x</span>Cần tư thế nâng đầu/chân linh hoạt cho nghỉ ngơi hằng ngày</div>
        </div>
      </div>
      <div class="sf-desc-panel sf-desc-panel-good">
        <p class="sf-desc-panel-label">Giải pháp</p>
        <h3>GSF150 đáp ứng</h3>
        <div class="sf-desc-list">
          <div><span>✓</span>Đặt vào trong khung giường hiện có, giữ lại phong cách phòng ngủ</div>
          <div><span>✓</span>Nâng đầu và chân bằng remote, thao tác nhẹ và dễ dùng</div>
          <div><span>✓</span>Tận dụng nệm sẵn có nếu kích thước và độ đàn hồi phù hợp</div>
          <div><span>✓</span>Hỗ trợ tư thế Zero Gravity, đọc sách, xem TV và thư giãn</div>
        </div>
      </div>
    </div>
  </section>

  <section class="sf-desc-section" id="chi-tiet">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Chi tiết sản phẩm</p>
      <h2 class="sf-desc-title">Từng chi tiết <span class="sf-desc-gold">được chăm chút để dễ dùng mỗi ngày</span></h2>
      <p class="sf-desc-lead">Khối nội dung này mô phỏng landing page GSF150 và có thể chỉnh sửa lại cho từng sản phẩm trong phần mô tả.</p>
    </div>
    <div class="sf-desc-detail-grid">
      <article class="sf-desc-detail-card">
        <img src="/gsf150-wood-frame.jpg" alt="Khung nâng hạ đặt trong giường cũ" loading="lazy" decoding="async" />
        <div>
          <p class="sf-desc-kicker">01 / Thiết kế</p>
          <h3>Đặt gọn trong lòng giường</h3>
          <p>Giữ lại phong cách phòng ngủ hiện có, chỉ nâng cấp phần trải nghiệm nghỉ ngơi bằng khung nâng hạ.</p>
        </div>
      </article>
      <article class="sf-desc-detail-card">
        <img src="/gsf150-standalone.jpg" alt="Nâng hạ bằng remote" loading="lazy" decoding="async" />
        <div>
          <p class="sf-desc-kicker">02 / Thao tác</p>
          <h3>Nâng hạ bằng remote</h3>
          <p>Điều chỉnh đầu và chân giường nhẹ nhàng, phù hợp đọc sách, xem phim, thư giãn hoặc ngủ sâu.</p>
        </div>
      </article>
      <article class="sf-desc-detail-card">
        <img src="/gsf150-exploded.jpg" alt="Cấu tạo khung thép GSF150" loading="lazy" decoding="async" />
        <div>
          <p class="sf-desc-kicker">03 / Khung thép</p>
          <h3>Kết cấu chắc chắn</h3>
          <p>Khung thép sơn tĩnh điện, motor vận hành êm và được kỹ thuật viên kiểm tra trước khi bàn giao.</p>
        </div>
      </article>
    </div>
  </section>

  <section class="sf-desc-section" id="chon-phien-ban">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Sản phẩm</p>
      <h2 class="sf-desc-title">Chọn phiên bản <span class="sf-desc-gold">phù hợp với nệm và khung giường hiện có</span></h2>
      <p class="sf-desc-lead">Các thẻ dưới đây có thể mở popup tư vấn giống landing page. Anh/chị có thể sửa tên, giá, ảnh và nội dung trực tiếp trong admin.</p>
    </div>
    <div class="sf-desc-products">
      <article class="sf-desc-product-card">
        <img src="/gsf150-wood-frame.jpg" alt="GSF150 Single Bed" loading="lazy" decoding="async" />
        <div>
          <p class="sf-desc-kicker">GSF150 Standard</p>
          <h3>Khung giường công thái học Single Bed</h3>
          <p>Khung nâng hạ 2 motor, phù hợp nệm phổ biến và phòng ngủ gia đình.</p>
          <strong>Từ 9.790.000 đ</strong>
          <a href="#tu-van" class="sf-desc-btn sf-desc-btn-primary" data-product-popup="single">Xem chi tiết</a>
        </div>
      </article>
      <article class="sf-desc-product-card">
        <img src="/gsf150-standalone.jpg" alt="GSF150 Double Bed" loading="lazy" decoding="async" />
        <div>
          <p class="sf-desc-kicker">GSF150 Plus</p>
          <h3>Khung giường công thái học Double Bed</h3>
          <p>Khung chắc hơn, phù hợp lắp cho lòng giường lớn và nhu cầu dùng đôi.</p>
          <strong>Từ 19.580.000 đ</strong>
          <a href="#tu-van" class="sf-desc-btn sf-desc-btn-primary" data-product-popup="double">Xem chi tiết</a>
        </div>
      </article>
      <article class="sf-desc-product-card">
        <img src="/gsf150-exploded.jpg" alt="Đặt size theo yêu cầu" loading="lazy" decoding="async" />
        <div>
          <p class="sf-desc-kicker">Theo yêu cầu</p>
          <h3>Đo và tư vấn theo lòng giường</h3>
          <p>SmartFurni kiểm tra kích thước, loại nệm và tư vấn phương án phù hợp trước khi lắp.</p>
          <strong>Liên hệ</strong>
          <a href="#tu-van" class="sf-desc-btn sf-desc-btn-primary" data-product-popup="custom">Nhận tư vấn</a>
        </div>
      </article>
    </div>
  </section>

  <section class="sf-desc-section" id="video-thuc-te">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Video thực tế</p>
      <h2 class="sf-desc-title">Xem GSF150 hoạt động <span class="sf-desc-gold">thực tế từ khách hàng</span></h2>
      <p class="sf-desc-lead">Các video được lấy theo đúng cấu hình video của landing GSF150 để khách xem trực tiếp trong trang sản phẩm.</p>
    </div>
    <div class="sf-desc-video-grid">
      <div class="sf-desc-video-card" role="button" tabindex="0" data-lp-video-key="video_sub_1_id" data-video-title="Review sau 6 tháng sử dụng" data-video-tag="REVIEW" aria-label="Xem video Review sau 6 tháng sử dụng">
        <span class="sf-desc-video-thumb"><span class="sf-desc-video-empty">Chưa có video</span></span>
        <span class="sf-desc-video-tag">REVIEW</span>
        <span class="sf-desc-video-play">▶</span>
      </div>
      <div class="sf-desc-video-card" role="button" tabindex="0" data-lp-video-key="video_sub_2_id" data-video-title="Hướng dẫn sử dụng remote GSF150" data-video-tag="HƯỚNG DẪN" aria-label="Xem video Hướng dẫn sử dụng remote GSF150">
        <span class="sf-desc-video-thumb"><span class="sf-desc-video-empty">Chưa có video</span></span>
        <span class="sf-desc-video-tag">HƯỚNG DẪN</span>
        <span class="sf-desc-video-play">▶</span>
      </div>
      <div class="sf-desc-video-card" role="button" tabindex="0" data-lp-video-key="video_sub_3_id" data-video-title="Trước và sau khi lắp GSF150" data-video-tag="SO SÁNH" aria-label="Xem video Trước và sau khi lắp GSF150">
        <span class="sf-desc-video-thumb"><span class="sf-desc-video-empty">Chưa có video</span></span>
        <span class="sf-desc-video-tag">SO SÁNH</span>
        <span class="sf-desc-video-play">▶</span>
      </div>
      <div class="sf-desc-video-card" role="button" tabindex="0" data-lp-video-key="video_sub_4_id" data-video-title="Lắp đặt thực tế GSF150" data-video-tag="LẮP ĐẶT" aria-label="Xem video Lắp đặt thực tế GSF150">
        <span class="sf-desc-video-thumb"><span class="sf-desc-video-empty">Chưa có video</span></span>
        <span class="sf-desc-video-tag">LẮP ĐẶT</span>
        <span class="sf-desc-video-play">▶</span>
      </div>
    </div>
    <p class="sf-desc-video-more"><a href="https://www.youtube.com/@SmartFurni" target="_blank" rel="noopener noreferrer">▶ Xem thêm video trên kênh YouTube SmartFurni →</a></p>
  </section>

  <section class="sf-desc-section" id="loi-ich">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Lợi ích mang lại</p>
      <h2 class="sf-desc-title">Một chiếc giường <span class="sf-desc-gold">cho nhiều tư thế nghỉ ngơi</span></h2>
      <p class="sf-desc-lead">Từ chống ngáy, đọc sách, xem phim đến giấc ngủ sâu, GSF150 giúp thay đổi tư thế nhẹ nhàng bằng remote.</p>
    </div>
    <figure class="sf-desc-benefit-image">
      <img src="/gsf150-features-infographic.jpg" alt="Các lợi ích và tư thế sử dụng GSF150" loading="lazy" decoding="async" />
    </figure>
  </section>

  <section class="sf-desc-section" id="hinh-anh-thuc-te">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Hình ảnh thực tế</p>
      <h2 class="sf-desc-title">Sản phẩm tại nhà khách <span class="sf-desc-gold">và các góc sử dụng thường gặp</span></h2>
      <p class="sf-desc-lead">Thay các ảnh mẫu này bằng hình lắp đặt thực tế, showroom hoặc ảnh khách hàng trong admin.</p>
    </div>
    <div class="sf-desc-gallery-grid">
      <figure><img src="/gsf150-wood-frame.jpg" alt="GSF150 đặt trong khung giường" loading="lazy" decoding="async" /><figcaption>Đặt gọn trong giường cũ</figcaption></figure>
      <figure><img src="/gsf150-standalone.jpg" alt="GSF150 nâng đầu đọc sách" loading="lazy" decoding="async" /><figcaption>Nâng đầu đọc sách</figcaption></figure>
      <figure><img src="/gsf150-exploded.jpg" alt="Chi tiết khung thép GSF150" loading="lazy" decoding="async" /><figcaption>Kết cấu khung chắc chắn</figcaption></figure>
      <figure><img src="/gsf150-features-infographic.jpg" alt="Các tư thế sử dụng GSF150" loading="lazy" decoding="async" /><figcaption>Nhiều tư thế nghỉ ngơi</figcaption></figure>
      <figure><img src="/gsf150-wood-frame.jpg" alt="Không gian phòng ngủ sau lắp đặt" loading="lazy" decoding="async" /><figcaption>Hài hòa không gian phòng ngủ</figcaption></figure>
      <figure><img src="/gsf150-standalone.jpg" alt="Giao lắp GSF150 tận nơi" loading="lazy" decoding="async" /><figcaption>Giao lắp tận nơi</figcaption></figure>
    </div>
  </section>

  <section class="sf-desc-section sf-desc-specs" id="thong-so">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Thông số kỹ thuật</p>
      <h2 class="sf-desc-title">Thông số <span class="sf-desc-gold">SmartFurni GSF150</span></h2>
      <p class="sf-desc-lead">Thông tin này là mẫu để mô tả sản phẩm. Anh/chị có thể sửa theo từng mã sản phẩm trong admin.</p>
    </div>
    <div class="sf-desc-spec-grid">
      <div class="sf-desc-spec-table">
        <div><span>Kích thước phổ biến</span><strong>0,9m / 1m2 / 1m4 / 1m6 / 1m8 x 2m, nhận đặt theo lòng giường</strong></div>
        <div><span>Góc nâng đầu</span><strong>0-70 độ, điều chỉnh bằng remote</strong></div>
        <div><span>Góc nâng chân</span><strong>0-45 độ</strong></div>
        <div><span>Khung chính</span><strong>Thép sơn tĩnh điện, gia cường chịu lực</strong></div>
        <div><span>Motor</span><strong>2 motor nâng hạ vận hành êm</strong></div>
        <div><span>Nệm phù hợp</span><strong>Cao su, foam, lò xo túi linh hoạt; kiểm tra trước khi lắp</strong></div>
        <div><span>Lắp đặt</span><strong>Đặt trong lòng giường hiện có, không cần đổi toàn bộ giường</strong></div>
        <div><span>Bảo hành motor</span><strong>5 năm</strong></div>
      </div>
      <img class="sf-desc-spec-image" src="/gsf150-exploded.jpg" alt="Cấu tạo khung nâng hạ GSF150" loading="lazy" decoding="async" />
    </div>
  </section>

  <section class="sf-desc-section sf-desc-process">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Quy trình</p>
      <h2 class="sf-desc-title">Từ tư vấn đến lắp đặt <span class="sf-desc-gold">rõ ràng từng bước</span></h2>
    </div>
    <div class="sf-desc-steps">
      <div><strong>01</strong><span>Gửi kích thước lòng giường, loại nệm và khu vực giao lắp.</span></div>
      <div><strong>02</strong><span>SmartFurni tư vấn phiên bản, báo giá và lịch giao phù hợp.</span></div>
      <div><strong>03</strong><span>Kỹ thuật viên giao lắp tận nơi, kiểm tra vận hành và hướng dẫn sử dụng.</span></div>
    </div>
  </section>

  <section class="sf-desc-section sf-desc-faq">
    <div class="sf-desc-heading">
      <p class="sf-desc-kicker">Câu hỏi thường gặp</p>
      <h2 class="sf-desc-title">Giải đáp mọi thắc mắc <span class="sf-desc-gold">về khung giường nâng hạ</span></h2>
    </div>
    <div class="sf-desc-faq-grid">
      <div><h3>GSF150 có cần bỏ giường cũ không?</h3><p>Không nhất thiết. GSF150 được tư vấn để đặt gọn trong lòng giường hiện có nếu kích thước phù hợp.</p></div>
      <div><h3>Nệm hiện tại có dùng được không?</h3><p>Có thể dùng nếu nệm đủ linh hoạt. SmartFurni sẽ kiểm tra loại nệm trước khi lắp.</p></div>
      <div><h3>Lắp đặt mất bao lâu?</h3><p>Tùy khu vực và cấu trúc giường, đội kỹ thuật sẽ hẹn lịch và kiểm tra vận hành sau khi lắp.</p></div>
      <div><h3>Có phù hợp cho người lớn tuổi không?</h3><p>Sản phẩm hỗ trợ nâng đầu/chân bằng remote, giúp thao tác nhẹ hơn khi nghỉ ngơi hoặc ngồi dậy.</p></div>
      <div><h3>Motor bảo hành thế nào?</h3><p>Motor bảo hành 5 năm. Kỹ thuật viên hướng dẫn sử dụng và hỗ trợ trong quá trình dùng.</p></div>
      <div><h3>Có đặt size riêng được không?</h3><p>Có. Anh/chị có thể gửi kích thước lòng giường để đội SmartFurni tư vấn.</p></div>
    </div>
  </section>

  <section class="sf-desc-section sf-desc-cta">
    <p class="sf-desc-kicker">Tư vấn nhanh</p>
    <h2 class="sf-desc-title">Muốn giữ giường cũ nhưng nâng cấp trải nghiệm ngủ?</h2>
    <p class="sf-desc-lead">Gửi kích thước lòng giường, SmartFurni sẽ tư vấn phiên bản phù hợp và báo giá rõ ràng.</p>
    <a href="#tu-van" class="sf-desc-btn sf-desc-btn-primary" data-product-popup="custom">Nhận tư vấn phiên bản phù hợp</a>
  </section>
</div>`;
}
