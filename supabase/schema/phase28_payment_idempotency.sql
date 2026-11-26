-- ============================================
-- PATWADI - Payment verification idempotency
-- Run AFTER phase26_tracking_code.sql
-- ============================================

-- A Razorpay order/payment may create at most one Patwadi parcel. This backs
-- the verify-razorpay-payment retry path and closes concurrent duplicate inserts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;
