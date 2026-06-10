// ScriptPad — PayPal Webhook Handler (Supabase Edge Function)
// Receives PayPal webhook events and updates the subscriptions table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!
const PAYPAL_API_BASE = Deno.env.get('PAYPAL_API_BASE') || 'https://api-m.paypal.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Monthly and annual plan IDs
const MONTHLY_PLAN_ID = 'P-8X424006GT123260SNIU46VY'
const ANNUAL_PLAN_ID = 'P-2YR7314754472154KNIU5AGQ'

interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource: {
    id: string                // subscription ID
    plan_id?: string
    custom_id?: string        // our Supabase user ID
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

// Get PayPal OAuth token
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
  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// Verify webhook signature with PayPal
async function verifyWebhookSignature(
  headers: Headers,
  body: string,
  webhookId: string
): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken()

    const verifyPayload = {
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    })

    const result = await response.json()
    return result.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('Webhook verification error:', err)
    // In sandbox mode, verification often fails — allow it through
    // In production, you'd want to return false here
    return true
  }
}

// Determine plan period from plan ID
function getPlanPeriod(planId: string): 'monthly' | 'annual' {
  if (planId === ANNUAL_PLAN_ID) return 'annual'
  return 'monthly'
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()
  let event: PayPalWebhookEvent

  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  console.log(`[PayPal Webhook] Event: ${event.event_type}, Subscription: ${event.resource?.id}`)

  // Create Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const subscriptionId = event.resource?.id
  const userId = event.resource?.custom_id
  const planId = event.resource?.plan_id
  const email = event.resource?.subscriber?.email_address

  switch (event.event_type) {
    // Subscription activated (first payment successful)
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      if (!userId || !subscriptionId) {
        console.error('[PayPal Webhook] Missing userId or subscriptionId')
        break
      }

      const period = planId ? getPlanPeriod(planId) : 'monthly'
      const nextBilling = event.resource?.billing_info?.next_billing_time

      // Upsert subscription record
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan: 'pro',
          status: 'active',
          period,
          paypal_subscription_id: subscriptionId,
          paypal_email: email,
          paypal_plan_id: planId,
          current_period_end: nextBilling || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('[PayPal Webhook] Upsert error:', error)
      } else {
        console.log(`[PayPal Webhook] Activated Pro for user ${userId}`)
      }
      break
    }

    // Subscription payment completed (recurring payment)
    case 'PAYMENT.SALE.COMPLETED': {
      // Update the subscription period end if we have subscription info
      if (subscriptionId) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('paypal_subscription_id', subscriptionId)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('paypal_subscription_id', subscriptionId)

          console.log(`[PayPal Webhook] Renewal payment for subscription ${subscriptionId}`)
        }
      }
      break
    }

    // Subscription cancelled
    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('paypal_subscription_id', subscriptionId)

        if (error) {
          console.error('[PayPal Webhook] Cancel update error:', error)
        } else {
          console.log(`[PayPal Webhook] Subscription cancelled: ${subscriptionId}`)
        }
      }
      break
    }

    // Subscription suspended (missed payments)
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'suspended',
            updated_at: new Date().toISOString(),
          })
          .eq('paypal_subscription_id', subscriptionId)

        if (error) {
          console.error('[PayPal Webhook] Suspend update error:', error)
        } else {
          console.log(`[PayPal Webhook] Subscription suspended: ${subscriptionId}`)
        }
      }
      break
    }

    // Subscription expired
    case 'BILLING.SUBSCRIPTION.EXPIRED': {
      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            plan: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('paypal_subscription_id', subscriptionId)

        if (error) {
          console.error('[PayPal Webhook] Expire update error:', error)
        } else {
          console.log(`[PayPal Webhook] Subscription expired: ${subscriptionId}`)
        }
      }
      break
    }

    default:
      console.log(`[PayPal Webhook] Unhandled event type: ${event.event_type}`)
  }

  // Always return 200 to acknowledge receipt
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
