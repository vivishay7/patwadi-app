-- ============================================
-- PATWADI — Terms acceptance audit on paid orders
-- Run AFTER phase22_* migrations
-- ============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;
