-- ScriptPad — Migrate subscriptions table from Lemon Squeezy to PayPal
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Add PayPal-specific columns
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_email TEXT,
  ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT;

-- Update status check constraint to include 'suspended'
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'suspended'));

-- Add unique constraint on user_id for upsert to work
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_unique;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Add index for PayPal subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_sub ON subscriptions(paypal_subscription_id);

-- Drop old Lemon Squeezy columns (optional — safe to keep)
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_customer_id;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_subscription_id;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_order_id;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_product_id;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_variant_id;
