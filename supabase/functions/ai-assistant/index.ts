import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are a sales assistant AI embedded in ScriptPad, a tool for call center agents. You have access to the agent's knowledge base containing product info, pricing, bundles, retention offers, and objection handlers. Use this information to give specific, actionable recommendations. Be concise — the agent is on a live call. Format with bullet points when listing multiple items. Always reference specific products/prices from the knowledge base when available. If the knowledge base doesn't contain relevant info, say so honestly. Respond in the same language the agent uses (English or Spanish).`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Daily AI limits per account, enforced server-side (cannot be bypassed by
  // the client). Free accounts get FREE_DAILY; Pro accounts get PRO_DAILY. The
  // Pro cap is generous for one person but stops a single shared login from
  // serving a whole team for free and running up the AI bill.
  const FREE_DAILY = 5;
  const PRO_DAILY = 100;

  // Require a signed-in ScriptPad user. The public anon key is a valid JWT but
  // has role "anon"; supabase.auth.getUser() only returns a user for a real
  // account token, so this rejects anonymous callers.
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'auth_required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let userId: string;
  try {
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'auth_required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    userId = user.id;
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'auth_required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Enforce the per-account daily cap using the service role. If this table or
  // function isn't set up yet (SUPABASE_AI_USAGE_SETUP.sql not run), we log and
  // allow, so the endpoint keeps working — the cap simply isn't active until
  // the SQL is applied.
  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    const cap = sub?.plan === 'pro' ? PRO_DAILY : FREE_DAILY;

    const { data: allowed, error: usageErr } = await adminClient
      .rpc('check_and_increment_ai_usage', { p_user_id: userId, p_cap: cap });

    if (usageErr) {
      console.error('[ai-assistant] usage check failed (allowing):', usageErr.message);
    } else if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'daily_limit' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (e) {
    console.error('[ai-assistant] usage check error (allowing):', e);
  }

  try {
    const { message, context, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "message" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build contents array for Gemini
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add conversation history (max 6 messages)
    if (Array.isArray(history)) {
      const trimmedHistory = history.slice(-6);
      for (const msg of trimmedHistory) {
        if (msg.role && msg.content) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }
    }

    // Build user message with KB context
    let userContent = message;
    if (context && typeof context === 'string' && context.trim()) {
      userContent = `${context}\n\n--- AGENT'S QUESTION ---\n${message}`;
    }
    contents.push({ role: 'user', parts: [{ text: userContent }] });

    // Call Gemini with streaming
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: geminiResponse.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response back to the client
    const reader = geminiResponse.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: 'No response stream' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Send done signal
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        } catch (err) {
          console.error('Stream processing error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
