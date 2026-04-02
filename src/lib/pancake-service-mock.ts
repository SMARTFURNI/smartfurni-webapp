/**
 * Mock Pancake Service - Dữ liệu giả để test giao diện
 * Sẽ thay thế bằng Pancake API thật khi có token hợp lệ
 */

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
  text: string;
  sender: string;
  created_at: string;
  attachments?: Array<{
    type: string;
    url: string;
  }>;
}

// Mock conversations data
const MOCK_CONVERSATIONS: PancakeConversation[] = [
  {
    id: 'conv_001',
    type: 'INBOX',
    page_uid: 'pzl_84918326552',
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    inserted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: [],
    last_message: {
      text: 'Cho em hỏi sofa góc L có màu xám không ạ?',
      sender: 'Nguyễn Văn A',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    participants: [
      {
        name: 'Nguyễn Văn A',
        phone: '0912345678',
      },
    ],
  },
  {
    id: 'conv_002',
    type: 'INBOX',
    page_uid: 'pzl_84918326552',
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    inserted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: [],
    last_message: {
      text: 'Cảm ơn shop, em đã nhận được báo giá rồi ạ',
      sender: 'Trần Thị B',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    participants: [
      {
        name: 'Trần Thị B',
        phone: '0987654321',
      },
    ],
  },
  {
    id: 'conv_003',
    type: 'INBOX',
    page_uid: 'pzl_84918326552',
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    inserted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: [],
    last_message: {
      text: 'Bên em có chương trình khuyến mãi nào không ạ?',
      sender: 'Lê Văn C',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    participants: [
      {
        name: 'Lê Văn C',
        phone: '0901234567',
      },
    ],
  },
];

// Mock messages data
const MOCK_MESSAGES: Record<string, PancakeMessage[]> = {
  conv_001: [
    {
      id: 'msg_001_1',
      text: 'Chào shop, em muốn tìm hiểu về sofa góc L',
      sender: 'Nguyễn Văn A',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_001_2',
      text: 'Chào anh, em có thể gửi anh catalog sofa góc L của shop ạ',
      sender: 'page',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_001_3',
      text: 'Cho em hỏi sofa góc L có màu xám không ạ?',
      sender: 'Nguyễn Văn A',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ],
  conv_002: [
    {
      id: 'msg_002_1',
      text: 'Em muốn đặt sofa 3 chỗ màu be',
      sender: 'Trần Thị B',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_002_2',
      text: 'Dạ, em gửi anh báo giá chi tiết ạ',
      sender: 'page',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_002_3',
      text: 'Cảm ơn shop, em đã nhận được báo giá rồi ạ',
      sender: 'Trần Thị B',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ],
  conv_003: [
    {
      id: 'msg_003_1',
      text: 'Bên em có chương trình khuyến mãi nào không ạ?',
      sender: 'Lê Văn C',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export async function getConversationsMock(): Promise<PancakeConversation[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_CONVERSATIONS;
}

export async function getMessagesMock(conversationId: string): Promise<PancakeMessage[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_MESSAGES[conversationId] || [];
}

export async function sendMessageMock(conversationId: string, text: string): Promise<PancakeMessage> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const newMessage: PancakeMessage = {
    id: `msg_${conversationId}_${Date.now()}`,
    text,
    sender: 'page',
    created_at: new Date().toISOString(),
  };
  
  // Add to mock data
  if (!MOCK_MESSAGES[conversationId]) {
    MOCK_MESSAGES[conversationId] = [];
  }
  MOCK_MESSAGES[conversationId].push(newMessage);
  
  // Update last message in conversation
  const conv = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);
  if (conv) {
    conv.last_message = {
      text,
      sender: 'page',
      created_at: new Date().toISOString(),
    };
    conv.updated_at = new Date().toISOString();
  }
  
  return newMessage;
}

export async function markAsReadMock(conversationId: string): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  // No-op for mock
}
