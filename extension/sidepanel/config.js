// ScriptPad — Configuration
const CONFIG = {
  SUPABASE_URL: 'https://okwbfzzbysfkpiuobjkx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rd2JmenpieXNma3BpdW9iamt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzUyNTQsImV4cCI6MjA5NjYxMTI1NH0.VY6w2ul8SCcTYfTeq07y_yXiw5lEkKITZykY_wo1oYk',

  // PayPal Subscription Plan IDs
  PAYPAL_CLIENT_ID: 'BAA4oie_YjO3dLnkKejPN6J8hLyJASGnT3eJtalsmFISjXy7JEIimETnnqSOc2hRrGLPPwR3Dt8yZjoI1U',
  PAYPAL_MONTHLY_PLAN_ID: 'P-8X424006GT123260SNIU46VY',
  PAYPAL_ANNUAL_PLAN_ID: 'P-2YR7314754472154KNIU5AGQ',

  // Sandbox mode (set to false for production)
  PAYPAL_SANDBOX: true,

  // PayPal webhook endpoint (Supabase Edge Function)
  PAYPAL_WEBHOOK_URL: 'https://okwbfzzbysfkpiuobjkx.supabase.co/functions/v1/paypal-webhook'
};
