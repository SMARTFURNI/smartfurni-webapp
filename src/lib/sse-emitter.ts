/**
 * SSE Emitter — Global in-process pub/sub cho Server-Sent Events
 * Dùng để push thông báo real-time từ server xuống tất cả client đang kết nối.
 *
 * Kiến trúc:
 *   - Mỗi client CRM mở 1 SSE connection đến /api/crm/sse
 *   - Khi có lead mới (webhook/manual), gọi emitDataPoolEvent()
 *   - Tất cả client đang kết nối nhận được event ngay lập tức
 */

export type SSEEvent = {
  type: "new_raw_lead";
  payload: {
    id: string;
    fullName: string;
    phone: string;
    source: string;
    createdAt: string;
    campaignName?: string | null;
    adName?: string | null;
  };
};

type Subscriber = (event: SSEEvent) => void;

// In-process subscriber registry (persists across requests in same process)
const subscribers = new Set<Subscriber>();

export function subscribeSSE(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function emitSSE(event: SSEEvent): void {
  subscribers.forEach((fn) => {
    try {
      fn(event);
    } catch {
      // Subscriber đã disconnect — sẽ tự bị remove khi cleanup
    }
  });
}

export function getSubscriberCount(): number {
  return subscribers.size;
}
