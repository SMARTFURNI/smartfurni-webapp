# 📱 Hướng Dẫn Tích Hợp Tính Năng Kết Bạn Zalo

## 📋 Tổng Quan

Tính năng kết bạn Zalo cho phép nhân viên click trực tiếp từ dữ liệu khách hàng để gửi lời mời kết bạn trên Zalo Official Account (OA).

## 🎯 Tính Năng

- ✅ Click một nút để kết bạn Zalo
- ✅ Tự động chuẩn hóa số điện thoại
- ✅ Ghi lại lịch sử tương tác
- ✅ Hiển thị trạng thái (đang xử lý, thành công, lỗi)
- ✅ Hỗ trợ fallback link nếu API thất bại

## 🔧 Cài Đặt

### 1. Environment Variables

Thêm vào `.env.local`:

```env
# Zalo Configuration
ZALO_ACCESS_TOKEN=your_zalo_access_token_here
ZALO_OA_ID=your_zalo_oa_id_here
```

### 2. Database Schema

Thêm bảng `zaloInteractions` vào `src/lib/db/schema.ts`:

```typescript
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const zaloInteractions = pgTable('zalo_interactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'add_friend', 'send_message', etc.
  phone: text('phone').notNull(),
  zaloUserId: text('zalo_user_id'),
  status: text('status').notNull(), // 'pending', 'sent', 'accepted', 'rejected'
  response: jsonb('response'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by').notNull(),
});

// Update leads table to include Zalo fields
export const leads = pgTable('leads', {
  // ... existing fields ...
  zaloUserId: text('zalo_user_id'),
  zaloAddedAt: timestamp('zalo_added_at'),
});
```

### 3. Chạy Migration

```bash
npm run db:migrate
```

## 📂 File Structure

```
src/
├── components/
│   └── crm/
│       └── high-performance-features/
│           └── ZaloAddFriendButton.tsx (NEW)
├── app/
│   └── api/
│       └── crm/
│           └── zalo/
│               └── add-friend/
│                   └── route.ts (NEW)
└── lib/
    └── db/
        └── schema.ts (UPDATED)
```

## 🚀 Triển Khai

### Step 1: Copy Component

Copy `ZaloAddFriendButton.tsx` vào:
```
src/components/crm/high-performance-features/ZaloAddFriendButton.tsx
```

### Step 2: Copy API Route

Copy `zalo-add-friend-route.ts` vào:
```
src/app/api/crm/zalo/add-friend/route.ts
```

### Step 3: Update LeadsListClient

Thêm component vào `src/components/crm/LeadsListClient.tsx`:

```typescript
import ZaloAddFriendButton from './high-performance-features/ZaloAddFriendButton';

// Inside the table rows:
<td className="px-4 py-3">
  <ZaloAddFriendButton
    lead={lead}
    onSuccess={() => {
      // Refresh lead data or show success message
      console.log('Kết bạn Zalo thành công');
    }}
    onError={(error) => {
      // Show error message
      console.error('Lỗi kết bạn Zalo:', error);
    }}
  />
</td>
```

### Step 4: Update Database Schema

Thêm các field mới vào `leads` table:

```sql
ALTER TABLE leads ADD COLUMN zalo_user_id TEXT;
ALTER TABLE leads ADD COLUMN zalo_added_at TIMESTAMP;

CREATE TABLE zalo_interactions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  phone TEXT NOT NULL,
  zalo_user_id TEXT,
  status TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE INDEX idx_zalo_interactions_lead_id ON zalo_interactions(lead_id);
CREATE INDEX idx_zalo_interactions_created_at ON zalo_interactions(created_at);
```

## 🔐 Cấu Hình Zalo Official Account

### Lấy Access Token

1. Truy cập [Zalo Business](https://business.zalo.me)
2. Chọn Official Account của bạn
3. Vào **Cài Đặt** → **Kết Nối API**
4. Tạo Access Token mới
5. Copy token vào `ZALO_ACCESS_TOKEN`

### Lấy OA ID

1. Vào **Cài Đặt** → **Thông Tin OA**
2. Copy **ID Official Account** (OA ID)
3. Paste vào `ZALO_OA_ID`

## 📊 API Endpoint

### POST /api/crm/zalo/add-friend

**Request:**
```json
{
  "leadId": "lead_123",
  "phone": "0915694557",
  "name": "Phạm Văn Nam",
  "zaloOAId": "optional_oa_id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Add friend request sent successfully",
  "data": {
    "leadId": "lead_123",
    "zaloUserId": "123456789",
    "addedAt": "2026-03-27T11:50:00Z",
    "status": "sent"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Failed to add Zalo friend: [error details]"
}
```

## 🧪 Testing

### Manual Test

```bash
curl -X POST http://localhost:3000/api/crm/zalo/add-friend \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_123",
    "phone": "0915694557",
    "name": "Phạm Văn Nam"
  }'
```

### Component Test

```typescript
import ZaloAddFriendButton from '@/components/crm/high-performance-features/ZaloAddFriendButton';

export default function TestPage() {
  const testLead = {
    id: 'test_123',
    name: 'Phạm Văn Nam',
    phone: '0915694557',
  };

  return (
    <ZaloAddFriendButton
      lead={testLead}
      onSuccess={(leadId) => console.log('Success:', leadId)}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

## 📱 UI/UX

### Button States

| State | Icon | Color | Action |
|-------|------|-------|--------|
| **Idle** | 💬 | Blue | Ready to click |
| **Loading** | ⏳ | Blue | Spinning loader |
| **Success** | ✓ | Green | Request sent |
| **Error** | ⚠️ | Red | Show error message |

### Responsive Design

- Desktop: Full button with text
- Tablet: Button with icon and abbreviated text
- Mobile: Icon-only button with tooltip

## 🔄 Workflow

```
User clicks "Kết bạn Zalo"
        ↓
Component sends POST request to /api/crm/zalo/add-friend
        ↓
API validates request & user permissions
        ↓
API normalizes phone number (0915694557 → 84915694557)
        ↓
API calls Zalo API to find user by phone
        ↓
If user found:
  - Send add friend request to Zalo
  - Record interaction in database
  - Update lead with Zalo user ID
  - Return success
        ↓
If user not found:
  - Generate fallback add friend link
  - Record pending interaction
  - Return pending status
        ↓
Component shows success/error message
```

## 🐛 Troubleshooting

### "Zalo configuration not found"
- Kiểm tra `ZALO_ACCESS_TOKEN` và `ZALO_OA_ID` trong `.env.local`
- Đảm bảo token không hết hạn

### "Lead not found"
- Kiểm tra `leadId` có tồn tại trong database
- Kiểm tra user có quyền truy cập lead này

### "Phone number invalid"
- Đảm bảo số điện thoại có format hợp lệ
- Component sẽ tự động chuẩn hóa số điện thoại

### API không phản hồi
- Kiểm tra kết nối internet
- Kiểm tra Zalo API status
- Xem logs trên server

## 📈 Metrics & Analytics

### Theo Dõi

- Tổng số lần kết bạn Zalo
- Tỷ lệ thành công
- Thời gian trung bình
- Số lượng fallback links được sử dụng

### Query Example

```sql
-- Tổng số kết bạn Zalo
SELECT COUNT(*) as total_add_friend
FROM zalo_interactions
WHERE type = 'add_friend';

-- Tỷ lệ thành công
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM zalo_interactions
WHERE type = 'add_friend'
GROUP BY status;

-- Kết bạn theo ngày
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count
FROM zalo_interactions
WHERE type = 'add_friend'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔐 Security

- ✅ Xác thực người dùng (session check)
- ✅ Xác thực quyền truy cập lead
- ✅ Chuẩn hóa input (phone number)
- ✅ Rate limiting (nên thêm)
- ✅ Audit logging (ghi lại tất cả tương tác)

## 📚 Tài Liệu Tham Khảo

- [Zalo Official Account API](https://developers.zalo.me/docs)
- [Zalo Add Friend API](https://developers.zalo.me/docs/official-account/api/add-friend)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## 🚀 Bước Tiếp Theo

1. ✅ Cấu hình Zalo OA credentials
2. ✅ Chạy database migration
3. ✅ Copy files vào project
4. ✅ Tích hợp component vào LeadsListClient
5. ✅ Test tính năng
6. ✅ Deploy lên production
7. ⏳ Monitor metrics & analytics

---

**Tác Giả:** Manus AI Agent  
**Ngày:** 27 Mar 2026  
**Version:** 1.0
