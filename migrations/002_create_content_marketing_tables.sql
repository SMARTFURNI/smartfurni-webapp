-- Migration: Create Content Marketing Tables
-- Date: 2026-04-06
-- Description: AI Content Marketing module - video scripts, content planning, publishing calendar

-- ============================================================================
-- Content Videos Table
-- Quản lý video content từ ý tưởng đến đã đăng
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  topic VARCHAR(500),                          -- Chủ đề / sản phẩm liên quan
  platform VARCHAR(50) NOT NULL DEFAULT 'tiktok', -- 'tiktok', 'facebook', 'youtube', 'all'
  status VARCHAR(50) NOT NULL DEFAULT 'idea',  -- 'idea', 'scripted', 'recording', 'editing', 'published', 'cancelled'
  script TEXT,                                 -- Kịch bản video (do AI tạo hoặc nhân viên viết)
  script_generated_by VARCHAR(20),             -- 'ai' | 'manual'
  ai_prompt TEXT,                              -- Prompt đã dùng để tạo kịch bản AI
  duration_seconds INT,                        -- Thời lượng dự kiến (giây)
  hashtags TEXT[],                             -- Mảng hashtag
  notes TEXT,                                  -- Ghi chú thêm
  thumbnail_url TEXT,                          -- URL ảnh thumbnail
  video_url TEXT,                              -- URL video sau khi quay xong
  published_url TEXT,                          -- URL bài đăng sau khi publish
  scheduled_at TIMESTAMP,                      -- Thời điểm dự kiến đăng
  published_at TIMESTAMP,                      -- Thời điểm đã đăng thực tế
  views_count INT DEFAULT 0,                   -- Lượt xem
  likes_count INT DEFAULT 0,                   -- Lượt thích
  comments_count INT DEFAULT 0,                -- Lượt bình luận
  shares_count INT DEFAULT 0,                  -- Lượt chia sẻ
  created_by VARCHAR(255),                     -- staff ID hoặc 'admin'
  created_by_name VARCHAR(255),
  assigned_to VARCHAR(255),                    -- Nhân viên được giao thực hiện
  assigned_to_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_videos_status ON content_videos(status);
CREATE INDEX IF NOT EXISTS idx_content_videos_platform ON content_videos(platform);
CREATE INDEX IF NOT EXISTS idx_content_videos_scheduled_at ON content_videos(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_videos_created_at ON content_videos(created_at DESC);

-- ============================================================================
-- Content Script Templates Table
-- Lưu các template kịch bản hay để tái sử dụng
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_script_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  platform VARCHAR(50) NOT NULL,               -- 'tiktok', 'facebook', 'youtube'
  category VARCHAR(100),                       -- 'product_intro', 'testimonial', 'tutorial', 'promotion', etc.
  template_text TEXT NOT NULL,                 -- Nội dung template
  variables TEXT[],                            -- Các biến cần điền: ['product_name', 'price', etc.]
  usage_count INT DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_templates_platform ON content_script_templates(platform);
CREATE INDEX IF NOT EXISTS idx_content_templates_category ON content_script_templates(category);

-- ============================================================================
-- Content AI Generations Table
-- Lưu lịch sử các lần AI tạo kịch bản
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES content_videos(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,
  topic VARCHAR(500) NOT NULL,
  product_name VARCHAR(500),
  target_audience VARCHAR(500),
  tone VARCHAR(100),                           -- 'professional', 'casual', 'humorous', 'emotional'
  duration_seconds INT,
  additional_notes TEXT,
  prompt_used TEXT NOT NULL,                   -- Prompt đầy đủ đã gửi cho AI
  generated_script TEXT NOT NULL,             -- Kịch bản AI trả về
  model_used VARCHAR(100) DEFAULT 'gemini-2.5-flash',
  tokens_used INT,
  generation_time_ms INT,
  was_saved BOOLEAN DEFAULT FALSE,            -- Có được lưu vào video không
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_ai_gen_video_id ON content_ai_generations(video_id);
CREATE INDEX IF NOT EXISTS idx_content_ai_gen_created_at ON content_ai_generations(created_at DESC);
