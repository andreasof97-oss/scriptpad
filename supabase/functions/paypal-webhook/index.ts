// ScriptPad — PayPal Webhook Handler (Supabase Edge Function)
// Receives PayPal webhook events and updates the subscriptions table
//
// NOTE: This function is deployed under the URL slug "smart-processor"
// (dashboard function name "paypal-webhook"). PayPal's live webhook points at
// .../functions/v1/smart-processor. Keep this file in sync with that function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!
const PAYPAL_WEBHOOK_ID = Deno.env.get('PAYPAL_WEBHOOK_ID') || ''
// Defaults to LIVE (the product ships live). For sandbox testing, set
// PAYPAL_API_BASE=https://api-m.sandbox.paypal.com in the function env.
const PAYPAL_API_BASE = Deno.env.get('PAYPAL_API_BASE') || 'https://api-m.paypal.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MONTHLY_PLAN_ID = 'P-9H033465YN698702HNIVSKYA'
const ANNUAL_PLAN_ID = 'P-6B464778JK873840BNIVSKYA'

interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource: {
    id: string
    plan_id?: string
    custom_id?: string
    status?: string
    subscriber?: {
      email_address?: string
    }
    billing_info?: {
      next_billing_time?: string
      cycle_executions?: Array<{
        tenure_type: string
        sequence: number
        cycles_completed: number
        cycles_remaining: number
      }>
    }
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

async function verifyWebhookSignature(headers: Headers, body: string): Promise<boolean> {
  // Fail CLOSED: without a configured webhook ID we cannot verify the event,
  // so reject it rather than trust it.
  if (!PAYPAL_WEBHOOK_ID) {
    console.error('[PayPal Webhook] No PAYPAL_WEBHOOK_ID set — rejecting event (cannot verify)')
    return false
  }
  try {
    const accessToken = await getPayPalAccessToken()
    const verifyPayload = {
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(body),
    }
    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyPayload),
    })
    const result = await response.json()
    console.log('[PayPal Webhook] Verification result:', result.verification_status)
    return result.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('[PayPal Webhook] Signature verification error:', err)
    // Fail CLOSED: if verification errors, reject rather than trust the event.
    return false
  }
}

function getPlanPeriod(planId: string): 'monthly' | 'annual' {
  if (planId === ANNUAL_PLAN_ID) return 'annual'
  return 'monthly'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': '*' },
    })
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const body = await req.text()
  console.log('[PayPal Webhook] Raw body received, length:', body.length)

  let event: PayPalWebhookEvent
  try {
    event = JSON.parse(body)
  } catch {
    console.error('[PayPal Webhook] Invalid JSON body')
    return new Response('Invalid JSON', { status: 400 })
  }

  console.log(`[PayPal Webhook] Event: ${event.event_type}, Subscription: ${event.resource?.id}, User: ${event.resource?.custom_id}`)

  const isValid = await verifyWebhookSignature(req.headers, body)
  if (!isValid) {
    console.error('[PayPal Webhook] Signature verification FAILED')
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const subscriptionId = event.resource?.id
  const userId = event.resource?.custom_id
  const planId = event.resource?.plan_id
  const email = event.resource?.subscriber?.email_address

  switch (event.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      if (!userId || !subscriptionId) { console.error('[PayPal Webhook] Missing userId or subscriptionId'); break }
      const period = planId ? getPlanPeriod(planId) : 'monthly'
      const nextBilling = event.resource?.billing_info?.next_billing_time
      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId, plan: 'pro', status: 'active', period,
        paypal_subscription_id: subscriptionId, paypal_email: email,
        paypal_plan_id: planId, current_period_end: nextBilling || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) console.error('[PayPal Webhook] Upsert error:', error)
      else console.log(`[PayPal Webhook] Activated Pro for user ${userId}`)
      break
    }
    case 'PAYMENT.SALE.COMPLETED': {
      const saleSubId = (event.resource as any).billing_agreement_id || subscriptionId
      if (saleSubId) {
        const { data: existing } = await supabase.from('subscriptions').select('user_id').eq('paypal_subscription_id', saleSubId).maybeSingle()
        if (existing) {
          await supabase.from('subscriptions').update({ status: 'active', updated_at: new Date().toISOString() }).eq('paypal_subscription_id', saleSubId)
          console.log(`[PayPal Webhook] Renewal payment for ${saleSubId}`)
        } else console.log(`[PayPal Webhook] No matching subscription for ${saleSubId}`)
      }
      break
    }
    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      if (subscriptionId) {
        const { error } = await supabase.from('subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('paypal_subscription_id', subscriptionId)
        if (error) console.error('[PayPal Webhook] Cancel error:', error)
        else console.log(`[PayPal Webhook] Cancelled: ${subscriptionId}`)
      }
      break
    }
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      if (subscriptionId) {
        const { error } = await supabase.from('subscriptions').update({ status: 'suspended', updated_at: new Date().toISOString() }).eq('paypal_subscription_id', subscriptionId)
        if (error) console.error('[PayPal Webhook] Suspend error:', error)
        else console.log(`[PayPal Webhook] Suspended: ${subscriptionId}`)
      }
      break
    }
    case 'BILLING.SUBSCRIPTION.EXPIRED': {
      if (subscriptionId) {
        const { error } = await supabase.from('subscriptions').update({ status: 'expired', plan: 'free', updated_at: new Date().toISOString() }).eq('paypal_subscription_id', subscriptionId)
        if (error) console.error('[PayPal Webhook] Expire error:', error)
        else console.log(`[PayPal Webhook] Expired: ${subscriptionId}`)
      }
      break
    }
    default:
      console.log(`[PayPal Webhook] Unhandled event: ${event.event_type}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
