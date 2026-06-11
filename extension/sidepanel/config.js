// ScriptPad — Configuration
const CONFIG = {
  SUPABASE_URL: 'https://okwbfzzbysfkpiuobjkx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rd2JmenpieXNma3BpdW9iamt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzUyNTQsImV4cCI6MjA5NjYxMTI1NH0.VY6w2ul8SCcTYfTeq07y_yXiw5lEkKITZykY_wo1oYk',

  // PayPal Subscription Plan IDs (LIVE)
  PAYPAL_CLIENT_ID: 'ASHaXkBSAcVK8EgzDmmRXv3tL4TgCVfS-8Yfal7_W_0m3ltxWkYw1Kxn9ujG9sGHgeflrSFSAyy_YhvK',
  PAYPAL_MONTHLY_PLAN_ID: 'P-9H033465YN698702HNIVSKYA',
  PAYPAL_ANNUAL_PLAN_ID: 'P-6B464778JK873840BNIVSKYA',

  // Production mode
  PAYPAL_SANDBOX: false,

  // PayPal webhook endpoint (Supabase Edge Function)
  PAYPAL_WEBHOOK_URL: 'https://okwbfzzbysfkpiuobjkx.supabase.co/functions/v1/smart-processor',
  PAYPAL_CREATE_SUBSCRIPTION_URL: 'https://okwbfzzbysfkpiuobjkx.supabase.co/functions/v1/paypal-create-subscription'
};
