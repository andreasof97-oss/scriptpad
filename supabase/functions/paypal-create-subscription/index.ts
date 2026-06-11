// ScriptPad — Create PayPal Subscription (Supabase Edge Function)

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!
// LIVE PayPal API
const PAYPAL_API_BASE = Deno.env.get('PAYPAL_API_BASE') || 'https://api-m.paypal.com'

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

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { plan_id, user_id, user_email } = await req.json()

    if (!plan_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'plan_id and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = await getPayPalAccessToken()

    const subscriptionPayload: Record<string, unknown> = {
      plan_id,
      custom_id: user_id,
      application_context: {
        brand_name: 'ScriptPad Pro',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: 'https://andreasof97-oss.github.io/scriptpad/subscription-success.html',
        cancel_url: 'https://andreasof97-oss.github.io/scriptpad/',
      }
    }

    if (user_email) {
      subscriptionPayload.subscriber = {
        email_address: user_email
      }
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(subscriptionPayload),
    })

    const subscription = await response.json()

    if (!response.ok) {
      console.error('PayPal create subscription error:', subscription)
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription', details: subscription }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const approveLink = subscription.links?.find(
      (link: { rel: string; href: string }) => link.rel === 'approve'
    )

    if (!approveLink) {
      return new Response(
        JSON.stringify({ error: 'No approval URL returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        approve_url: approveLink.href,
        status: subscription.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Create subscription error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
