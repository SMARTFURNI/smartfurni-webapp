-- Allow administrators to recover deleted operational records.

ALTER TABLE facebook_group_comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE facebook_group_post_check_tasks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fbg_comments_active
  ON facebook_group_comments(commented_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fbg_checks_active_queue
  ON facebook_group_post_check_tasks(status, due_at)
  WHERE deleted_at IS NULL;
