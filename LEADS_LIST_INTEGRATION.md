# 🔗 Hướng Dẫn Tích Hợp Zalo Add Friend Button vào LeadsListClient

## 📍 Vị Trí File

**File cần chỉnh sửa:**
```
src/components/crm/LeadsListClient.tsx
```

## 🔄 Các Bước Tích Hợp

### Step 1: Import Component

Thêm import ở đầu file:

```typescript
import ZaloAddFriendButton from './high-performance-features/ZaloAddFriendButton';
```

### Step 2: Thêm Column Header

Tìm phần header của bảng và thêm cột mới:

```typescript
// Trước (existing)
<thead>
  <tr>
    <th className="px-4 py-3">KHÁCH HÀNG</th>
    <th className="px-4 py-3">LOẠI</th>
    <th className="px-4 py-3">GIAI ĐOẠN</th>
    <th className="px-4 py-3">KHU VỰC</th>
    <th className="px-4 py-3">GIÁ TRỊ</th>
    <th className="px-4 py-3">TƯƠNG TÁC CUỐI</th>
    <th className="px-4 py-3">THAO TÁC</th>
  </tr>
</thead>

// Sau (with Zalo column)
<thead>
  <tr>
    <th className="px-4 py-3">KHÁCH HÀNG</th>
    <th className="px-4 py-3">LOẠI</th>
    <th className="px-4 py-3">GIAI ĐOẠN</th>
    <th className="px-4 py-3">KHU VỰC</th>
    <th className="px-4 py-3">GIÁ TRỊ</th>
    <th className="px-4 py-3">TƯƠNG TÁC CUỐI</th>
    <th className="px-4 py-3">ZALO</th>
    <th className="px-4 py-3">THAO TÁC</th>
  </tr>
</thead>
```

### Step 3: Thêm Cell Data

Tìm phần body của bảng (tbody) và thêm cell mới cho mỗi lead:

```typescript
// Trước (existing)
<tbody>
  {leads.map((lead) => (
    <tr key={lead.id}>
      <td className="px-4 py-3">{lead.name}</td>
      <td className="px-4 py-3">{lead.type}</td>
      <td className="px-4 py-3">{lead.stage}</td>
      <td className="px-4 py-3">{lead.region}</td>
      <td className="px-4 py-3">{lead.value}</td>
      <td className="px-4 py-3">{lead.lastInteraction}</td>
      <td className="px-4 py-3">
        {/* Action buttons */}
      </td>
    </tr>
  ))}
</tbody>

// Sau (with Zalo button)
<tbody>
  {leads.map((lead) => (
    <tr key={lead.id}>
      <td className="px-4 py-3">{lead.name}</td>
      <td className="px-4 py-3">{lead.type}</td>
      <td className="px-4 py-3">{lead.stage}</td>
      <td className="px-4 py-3">{lead.region}</td>
      <td className="px-4 py-3">{lead.value}</td>
      <td className="px-4 py-3">{lead.lastInteraction}</td>
      
      {/* NEW: Zalo Add Friend Button */}
      <td className="px-4 py-3">
        <ZaloAddFriendButton
          lead={lead}
          onSuccess={() => {
            // Refresh lead data or show success toast
            toast.success(`Đã gửi lời mời kết bạn cho ${lead.name}`);
            // Optional: Refresh the leads list
            // refetchLeads();
          }}
          onError={(error) => {
            // Show error toast
            toast.error(`Lỗi kết bạn Zalo: ${error}`);
          }}
        />
      </td>
      
      <td className="px-4 py-3">
        {/* Action buttons */}
      </td>
    </tr>
  ))}
</tbody>
```

## 🎨 Styling Options

### Option 1: Compact Button (Recommended)

```typescript
<ZaloAddFriendButton
  lead={lead}
  className="w-full"
  onSuccess={() => toast.success('Kết bạn thành công')}
  onError={(error) => toast.error(error)}
/>
```

### Option 2: Icon Only

```typescript
<ZaloAddFriendButton
  lead={lead}
  className="p-2 rounded-full"
  onSuccess={() => toast.success('Kết bạn thành công')}
  onError={(error) => toast.error(error)}
/>
```

### Option 3: With Badge

```typescript
<div className="flex items-center gap-2">
  <ZaloAddFriendButton
    lead={lead}
    onSuccess={() => toast.success('Kết bạn thành công')}
    onError={(error) => toast.error(error)}
  />
  {lead.zaloUserId && (
    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
      Đã kết bạn
    </span>
  )}
</div>
```

## 📱 Responsive Design

### Desktop View (> 1024px)
```
[KHÁCH HÀNG] [LOẠI] [GIAI ĐOẠN] [KHU VỰC] [GIÁ TRỊ] [TƯƠNG TÁC] [ZALO] [THAO TÁC]
```

### Tablet View (768px - 1024px)
```
[KHÁCH HÀNG] [LOẠI] [GIAI ĐOẠN] [ZALO] [THAO TÁC]
(Ẩn: KHU VỰC, GIÁ TRỊ, TƯƠNG TÁC)
```

### Mobile View (< 768px)
```
[KHÁCH HÀNG] [ZALO] [THAO TÁC]
(Ẩn: LOẠI, GIAI ĐOẠN, KHU VỰC, GIÁ TRỊ, TƯƠNG TÁC)
```

**Implementation:**

```typescript
// Desktop
<td className="hidden lg:table-cell px-4 py-3">
  <ZaloAddFriendButton lead={lead} />
</td>

// Mobile
<td className="lg:hidden px-4 py-3">
  <ZaloAddFriendButton lead={lead} className="p-2" />
</td>
```

## 🔔 Toast Notifications

Nếu project sử dụng toast library (ví dụ: react-hot-toast, sonner):

```typescript
import { toast } from 'react-hot-toast'; // hoặc 'sonner'

<ZaloAddFriendButton
  lead={lead}
  onSuccess={() => {
    toast.success('✓ Đã gửi lời mời kết bạn', {
      duration: 3000,
      position: 'top-right',
    });
  }}
  onError={(error) => {
    toast.error(`✗ ${error}`, {
      duration: 4000,
      position: 'top-right',
    });
  }}
/>
```

## 🔄 State Management

### Option 1: Local State (Simple)

```typescript
const [zaloStatus, setZaloStatus] = useState<Record<string, boolean>>({});

<ZaloAddFriendButton
  lead={lead}
  onSuccess={() => {
    setZaloStatus(prev => ({ ...prev, [lead.id]: true }));
  }}
/>
```

### Option 2: React Query (Advanced)

```typescript
import { useMutation } from '@tanstack/react-query';

const { mutate: addZaloFriend } = useMutation({
  mutationFn: async (leadId: string) => {
    // API call
  },
  onSuccess: () => {
    // Refetch leads
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  },
});
```

## 📊 Analytics Integration

### Track Zalo Add Friend Events

```typescript
<ZaloAddFriendButton
  lead={lead}
  onSuccess={() => {
    // Track event
    if (window.gtag) {
      window.gtag('event', 'zalo_add_friend', {
        lead_id: lead.id,
        lead_name: lead.name,
        lead_phone: lead.phone,
      });
    }
    toast.success('Kết bạn thành công');
  }}
  onError={(error) => {
    // Track error
    if (window.gtag) {
      window.gtag('event', 'zalo_add_friend_error', {
        lead_id: lead.id,
        error: error,
      });
    }
    toast.error(error);
  }}
/>
```

## 🧪 Testing

### Unit Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ZaloAddFriendButton from '@/components/crm/high-performance-features/ZaloAddFriendButton';

describe('ZaloAddFriendButton', () => {
  it('should render button with lead data', () => {
    const lead = {
      id: 'test_123',
      name: 'Test Lead',
      phone: '0915694557',
    };

    render(<ZaloAddFriendButton lead={lead} />);
    
    expect(screen.getByText('Kết bạn Zalo')).toBeInTheDocument();
  });

  it('should call onSuccess when request succeeds', async () => {
    const onSuccess = jest.fn();
    const lead = {
      id: 'test_123',
      name: 'Test Lead',
      phone: '0915694557',
    };

    render(<ZaloAddFriendButton lead={lead} onSuccess={onSuccess} />);
    
    const button = screen.getByText('Kết bạn Zalo');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('test_123');
    });
  });

  it('should disable button when phone is missing', () => {
    const lead = {
      id: 'test_123',
      name: 'Test Lead',
      phone: '',
    };

    render(<ZaloAddFriendButton lead={lead} />);
    
    const button = screen.getByText('Kết bạn Zalo');
    expect(button).toBeDisabled();
  });
});
```

## 🚀 Deployment Checklist

- [ ] Environment variables configured (ZALO_ACCESS_TOKEN, ZALO_OA_ID)
- [ ] Database migration completed
- [ ] Component imported in LeadsListClient
- [ ] Column header added
- [ ] Cell data added with component
- [ ] Toast notifications configured
- [ ] Responsive design tested
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Tested in staging environment
- [ ] Deployed to production

## 📝 Example: Complete Integration

```typescript
'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import ZaloAddFriendButton from './high-performance-features/ZaloAddFriendButton';
import { Lead } from '@/lib/types';

interface LeadsListClientProps {
  leads: Lead[];
}

export default function LeadsListClient({ leads }: LeadsListClientProps) {
  const [zaloAddedLeads, setZaloAddedLeads] = useState<Set<string>>(new Set());

  const handleZaloSuccess = (leadId: string) => {
    setZaloAddedLeads(prev => new Set([...prev, leadId]));
    toast.success('✓ Đã gửi lời mời kết bạn Zalo');
  };

  const handleZaloError = (error: string) => {
    toast.error(`✗ Lỗi: ${error}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left">KHÁCH HÀNG</th>
            <th className="px-4 py-3 text-left">LOẠI</th>
            <th className="px-4 py-3 text-left">GIAI ĐOẠN</th>
            <th className="px-4 py-3 text-left">KHU VỰC</th>
            <th className="px-4 py-3 text-left">GIÁ TRỊ</th>
            <th className="px-4 py-3 text-left">TƯƠNG TÁC</th>
            <th className="px-4 py-3 text-left">ZALO</th>
            <th className="px-4 py-3 text-left">THAO TÁC</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">{lead.name}</td>
              <td className="px-4 py-3">{lead.type}</td>
              <td className="px-4 py-3">{lead.stage}</td>
              <td className="px-4 py-3">{lead.region}</td>
              <td className="px-4 py-3">{lead.value}</td>
              <td className="px-4 py-3">{lead.lastInteraction}</td>
              
              <td className="px-4 py-3">
                {zaloAddedLeads.has(lead.id) ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    ✓ Đã kết bạn
                  </span>
                ) : (
                  <ZaloAddFriendButton
                    lead={lead}
                    onSuccess={() => handleZaloSuccess(lead.id)}
                    onError={handleZaloError}
                  />
                )}
              </td>
              
              <td className="px-4 py-3">
                {/* Action buttons */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

**Tác Giả:** Manus AI Agent  
**Ngày:** 27 Mar 2026  
**Version:** 1.0
