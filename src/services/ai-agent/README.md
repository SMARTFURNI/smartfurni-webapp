# AI Agent Services

Thư mục này chứa tất cả các service liên quan đến AI Agent Dashboard, bao gồm tích hợp Gemini 2.5 Flash API.

## Cấu Trúc Thư Mục

```
src/services/ai-agent/
├── config/
│   ├── gemini.config.ts          # Cấu hình Gemini API
│   ├── email.config.ts           # Cấu hình Email Service
│   ├── zalo.config.ts            # Cấu hình Zalo API
│   └── settings.ts               # Cấu hình chung
├── services/
│   ├── email/
│   │   ├── EmailService.ts       # Service tạo và gửi email
│   │   ├── EmailGenerator.ts     # Tạo nội dung email bằng Gemini
│   │   ├── EmailTracker.ts       # Theo dõi email metrics
│   │   └── index.ts
│   ├── zalo/
│   │   ├── ZaloService.ts        # Service xử lý Zalo
│   │   ├── ZaloChatbot.ts        # Chatbot logic
│   │   ├── ZaloIntentDetector.ts # Phát hiện ý định
│   │   └── index.ts
│   ├── scoring/
│   │   ├── LeadScoringService.ts # Service chấm điểm lead
│   │   ├── ScoringEngine.ts      # Engine tính toán điểm
│   │   ├── ScoringAnalyzer.ts    # Phân tích yếu tố
│   │   └── index.ts
│   ├── tasks/
│   │   ├── TaskService.ts        # Service tạo task
│   │   ├── TaskGenerator.ts      # Tạo task recommendation
│   │   ├── TaskAssigner.ts       # Phân công task
│   │   └── index.ts
│   └── gemini/
│       ├── GeminiClient.ts       # Client gọi Gemini API
│       ├── PromptManager.ts      # Quản lý prompts
│       ├── TokenCounter.ts       # Đếm tokens
│       └── index.ts
├── utils/
│   ├── logger.ts                 # Logging utility
│   ├── cache.ts                  # Caching utility
│   ├── queue.ts                  # Job queue utility
│   ├── validators.ts             # Data validation
│   └── helpers.ts                # Helper functions
├── types/
│   ├── ai-agent.types.ts         # TypeScript types
│   ├── email.types.ts
│   ├── zalo.types.ts
│   ├── scoring.types.ts
│   └── task.types.ts
├── prompts/
│   ├── email-generation.prompt.ts
│   ├── zalo-intent.prompt.ts
│   ├── lead-scoring.prompt.ts
│   └── task-generation.prompt.ts
├── middleware/
│   ├── auth.middleware.ts        # Authentication
│   ├── rateLimit.middleware.ts   # Rate limiting
│   └── errorHandler.middleware.ts
├── routes/
│   ├── email.routes.ts
│   ├── zalo.routes.ts
│   ├── scoring.routes.ts
│   ├── tasks.routes.ts
│   ├── stats.routes.ts
│   └── index.ts
├── controllers/
│   ├── email.controller.ts
│   ├── zalo.controller.ts
│   ├── scoring.controller.ts
│   ├── tasks.controller.ts
│   └── stats.controller.ts
├── jobs/
│   ├── scoringBatch.job.ts       # Batch scoring job
│   ├── taskGeneration.job.ts     # Task generation job
│   ├── emailReminder.job.ts      # Email reminder job
│   └── usageStats.job.ts         # Update usage stats
├── tests/
│   ├── unit/
│   ├── integration/
│   └── mocks/
└── index.ts                      # Export main services
```

## Các Service Chính

### 1. Email Service (`services/email/`)
Quản lý tạo, gửi, và theo dõi email tự động.

**Các file chính:**
- `EmailService.ts`: API chính cho email operations
- `EmailGenerator.ts`: Tạo nội dung email bằng Gemini
- `EmailTracker.ts`: Theo dõi metrics (open, click, conversion)

### 2. Zalo Service (`services/zalo/`)
Xử lý tương tác Zalo và chatbot.

**Các file chính:**
- `ZaloService.ts`: API chính cho Zalo operations
- `ZaloChatbot.ts`: Logic chatbot
- `ZaloIntentDetector.ts`: Phát hiện ý định khách hàng

### 3. Lead Scoring Service (`services/scoring/`)
Chấm điểm và phân loại lead.

**Các file chính:**
- `LeadScoringService.ts`: API chính
- `ScoringEngine.ts`: Engine tính toán
- `ScoringAnalyzer.ts`: Phân tích chi tiết

### 4. Task Service (`services/tasks/`)
Tạo và phân công task tự động.

**Các file chính:**
- `TaskService.ts`: API chính
- `TaskGenerator.ts`: Tạo task recommendation
- `TaskAssigner.ts`: Phân công thông minh

### 5. Gemini Client (`services/gemini/`)
Client tích hợp với Gemini 2.5 Flash API.

**Các file chính:**
- `GeminiClient.ts`: Client gọi API
- `PromptManager.ts`: Quản lý prompts
- `TokenCounter.ts`: Đếm tokens sử dụng

## Cách Sử Dụng

### Import Services

```typescript
import {
  EmailService,
  ZaloService,
  LeadScoringService,
  TaskService
} from '@/services/ai-agent';

// Sử dụng Email Service
const emailService = new EmailService();
const email = await emailService.generateEmail({
  leadId: 'lead_123',
  leadName: 'Phạm Văn Tuất',
  emailType: 'follow_up'
});

// Sử dụng Lead Scoring Service
const scoringService = new LeadScoringService();
const score = await scoringService.calculateScore({
  leadId: 'lead_123'
});
```

## Environment Variables

Xem file `.env.example` để biết danh sách các biến môi trường cần thiết.

## Logging

Tất cả các service sử dụng logger centralized. Xem `utils/logger.ts` để biết cách sử dụng.

```typescript
import { logger } from '@/services/ai-agent/utils/logger';

logger.info('Email sent successfully', { leadId, emailId });
logger.error('Failed to generate email', { error, leadId });
```

## Rate Limiting

Các API endpoint có rate limiting được áp dụng. Xem `middleware/rateLimit.middleware.ts`.

## Testing

Chạy tests:

```bash
npm run test:ai-agent
npm run test:ai-agent:unit
npm run test:ai-agent:integration
```

## Deployment

Trước khi deploy, hãy chắc chắn:
1. Tất cả environment variables đã được cấu hình
2. Database migrations đã được chạy
3. Gemini API key đã được cấu hình
4. Email provider đã được cấu hình
5. Zalo API credentials đã được cấu hình

## Support

Để báo cáo lỗi hoặc yêu cầu tính năng, vui lòng tạo issue trên GitHub.
