#!/bin/bash
# Register webhook URL with PayPal Sandbox
# Run this once to tell PayPal where to send subscription events

# Credentials are read from the environment — never hardcode them here.
# This file is committed to a public repo; anything written below is public.
#
# Run it like this (the leading space keeps the secret out of your shell history):
#   export PAYPAL_CLIENT_ID="..."
#   export PAYPAL_CLIENT_SECRET="..."
#   ./scripts/register-paypal-webhook.sh
#
# Get sandbox credentials from developer.paypal.com → Sandbox → Apps & Credentials.
CLIENT_ID="${PAYPAL_CLIENT_ID:-}"
CLIENT_SECRET="${PAYPAL_CLIENT_SECRET:-}"
PAYPAL_BASE="${PAYPAL_BASE:-https://api-m.sandbox.paypal.com}"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "ERROR: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set."
  echo "See the comment at the top of this file for how to set them."
  exit 1
fi

WEBHOOK_URL="https://okwbfzzbysfkpiuobjkx.supabase.co/functions/v1/paypal-webhook"

echo "=== Getting PayPal access token ==="
TOKEN_RESPONSE=$(curl -s -X POST "${PAYPAL_BASE}/v1/oauth2/token" \
  -u "${CLIENT_ID}:${CLIENT_SECRET}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "ERROR: Failed to get access token"
  echo "$TOKEN_RESPONSE"
  exit 1
fi
echo "Got access token: ${ACCESS_TOKEN:0:20}..."

echo ""
echo "=== Checking existing webhooks ==="
EXISTING=$(curl -s "${PAYPAL_BASE}/v1/notifications/webhooks" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")
echo "$EXISTING" | python3 -m json.tool 2>/dev/null || echo "$EXISTING"

echo ""
echo "=== Registering webhook ==="
REGISTER_RESPONSE=$(curl -s -X POST "${PAYPAL_BASE}/v1/notifications/webhooks" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"event_types\": [
      { \"name\": \"BILLING.SUBSCRIPTION.ACTIVATED\" },
      { \"name\": \"BILLING.SUBSCRIPTION.CANCELLED\" },
      { \"name\": \"BILLING.SUBSCRIPTION.SUSPENDED\" },
      { \"name\": \"BILLING.SUBSCRIPTION.EXPIRED\" },
      { \"name\": \"PAYMENT.SALE.COMPLETED\" }
    ]
  }")

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract webhook ID for use in signature verification
WEBHOOK_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$WEBHOOK_ID" ]; then
  echo ""
  echo "=== SUCCESS ==="
  echo "Webhook ID: ${WEBHOOK_ID}"
  echo ""
  echo "IMPORTANT: Save this webhook ID!"
  echo "You need to set it as a Supabase secret:"
  echo "  Set PAYPAL_WEBHOOK_ID = ${WEBHOOK_ID}"
  echo "  in your Supabase project > Edge Functions > Secrets"
fi
