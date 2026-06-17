-- ============================================
-- PATWADI Session 21 — Razorpay dispute / refund tracking
-- Run AFTER phase20_security_fixes.sql
-- ============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT NULL
  CHECK (dispute_status IN ('disputed', 'refunded', 'dispute_lost', 'dispute_won'));

CREATE INDEX IF NOT EXISTS idx_orders_dispute_status ON orders(dispute_status)
  WHERE dispute_status IS NOT NULL;
