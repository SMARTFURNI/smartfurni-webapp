/**
 * Pancake API Service
 * Kết nối với Pancake API để lấy conversations và messages từ Zalo OA
 */

const PANCAKE_API_BASE = 'https://pages.fm/api/public_api/v2';
const PANCAKE_USER_API_BASE = 'https://pages.fm/api/v1';

export interface PancakePage {
  id: string;
  name: string;
  platform: string; // 'zalo', 'facebook', 'instagram', etc.
  avatar?: string;
}

export interface PancakeConversation {
  id: string;
  type: 'INBOX' | 'COMMENT';
  page_uid: string;
  updated_at: string;
  inserted_at: string;
  tags: string[];
  last_message?: {
    text: string;
    sender: string;
    created_at: string;
  };
  participants: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
}

export interface PancakeMessage {
  id: string;
  conversation_id: string;
  message: string;
  original_message: string;
  from: {
    id: string;
    name: string;
    page_customer_id?: string;
  };
  inserted_at: string;
  attachments: any[];
  type: 'INBOX' | 'COMMENT';
}

/**
 * Lấy danh sách pages từ Pancake (User API)
 */
export async function getPancakePages(userApiToken: string): Promise<PancakePage[]> {
  const response = await fetch(`${PANCAKE_USER_API_BASE}/pages`, {
    headers: {
      'Authorization': `Bearer ${userApiToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Pancake API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.pages || [];
}

/**
 * Generate page_access_token từ page_id
 */
export async function generatePageAccessToken(
  userApiToken: string,
  pageId: string
): Promise<string> {
  const response = await fetch(
    `${PANCAKE_USER_API_BASE}/pages/${pageId}/generate_page_access_token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userApiToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to generate page access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.page_access_token;
}

/**
 * Lấy danh sách conversations từ Pancake
 */
export async function getPancakeConversations(
  pageId: string,
  pageAccessToken: string,
  options?: {
    lastConversationId?: string;
    type?: string[]; // ['INBOX', 'COMMENT']
    unreadFirst?: boolean;
  }
): Promise<PancakeConversation[]> {
  const params = new URLSearchParams({
    page_access_token: pageAccessToken,
  });

  if (options?.lastConversationId) {
    params.append('last_conversation_id', options.lastConversationId);
  }
  if (options?.type && options.type.length > 0) {
    params.append('type', JSON.stringify(options.type));
  }
  if (options?.unreadFirst) {
    params.append('unread_first', 'true');
  }

  const response = await fetch(
    `${PANCAKE_API_BASE}/pages/${pageId}/conversations?${params.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Pancake API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.conversations || [];
}

/**
 * Lấy tin nhắn của một conversation
 */
export async function getPancakeMessages(
  pageId: string,
  conversationId: string,
  pageAccessToken: string
): Promise<PancakeMessage[]> {
  const params = new URLSearchParams({
    page_access_token: pageAccessToken,
  });

  const response = await fetch(
    `${PANCAKE_API_BASE}/pages/${pageId}/conversations/${conversationId}/messages?${params.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Pancake API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Gửi tin nhắn qua Pancake
 */
export async function sendPancakeMessage(
  pageId: string,
  conversationId: string,
  pageAccessToken: string,
  message: string
): Promise<any> {
  const response = await fetch(
    `${PANCAKE_API_BASE}/pages/${pageId}/conversations/${conversationId}/messages?page_access_token=${pageAccessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reply_inbox',
        message,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message: ${errorText}`);
  }

  return response.json();
}

/**
 * Đánh dấu conversation đã đọc
 */
export async function markConversationAsRead(
  pageId: string,
  conversationId: string,
  pageAccessToken: string
): Promise<void> {
  const response = await fetch(
    `${PANCAKE_API_BASE}/pages/${pageId}/conversations/${conversationId}/read?page_access_token=${pageAccessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to mark as read: ${response.statusText}`);
  }
}
