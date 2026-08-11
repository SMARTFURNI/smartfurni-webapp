ALTER TABLE crm_zalo_follow_campaigns
  ADD COLUMN IF NOT EXISTS gallery_images JSONB NOT NULL DEFAULT '[]';

UPDATE crm_zalo_config
SET oa_id = BTRIM(oa_id)
WHERE oa_id <> BTRIM(oa_id);
