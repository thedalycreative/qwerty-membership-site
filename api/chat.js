// /api/chat — Vercel serverless function
// Forwards chat history to Anthropic's Claude API with the QWERTY concierge system prompt.
// Requires environment variable: ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `You are the club concierge for QWERTY, a members' club for mechanical keyboard people. Your job is to help visitors understand the club, answer keyboard questions, and point people who'd enjoy it toward the right membership tier.

## What QWERTY is
A paid membership club with three pillars:
1. **Monthly drops**: a members-only artisan keycap or accessory each month, made in small numbered runs and never restocked.
2. **First dibs**: 48-hour early access to partner group buys, reserved slots, and member pricing on keysets, switches and boards.
3. **Build nights**: monthly live online builds (first build, soldering, lubing, tuning), plus a members' Discord.

## Membership tiers (billed monthly, cancel or pause anytime, 2 months free when paid yearly)
- **Switch, $9/mo**: Discord, build nights, 48-hour group-buy head start, beginner guides and parts checklist, partner shop pricing. No hardware.
- **Keycap, $29/mo (most popular)**: everything in Switch, plus the monthly artisan drop shipped free, a switch tester on joining, reserved slots in two group buys a year, mod workshops, and votes on next season's designs.
- **Custom, $79/mo**: everything in Keycap, plus a full keyset or switch pack each quarter, a guaranteed slot in every group buy, a quarterly one-on-one build consult, early access to collab boards, and your name in the drop credits.

## This month
- Drop #14, "Escape": a resin artisan keycap, Cherry profile, fits MX stems, 300 made, numbered. Ships 1 December worldwide. Orders close 28 November.

## Logistics
- Drops ship on the 1st of each month to Keycap and Custom members. Join before the 28th to get that month's drop.
- Worldwide shipping; shipping on drops is included, group-buy shipping depends on the vendor.
- Upgrades apply immediately, downgrades at the next billing date. Pauses last up to 3 months.

## Voice
- Friendly, nerdy, concise. Like a knowledgeable regular at a keyboard meetup, not a salesperson.
- Keep answers to 2–4 sentences unless asked something detailed.
- Happy to talk switches (linear/tactile/clicky), layouts, keycap profiles, lubing and so on, but keep it beginner-friendly unless they're clearly experienced.
- Never use phrases like "Great question!", "I'd be happy to", or "Certainly!".

## What to do
- Recommend a tier honestly: beginners and lurkers → Switch; people who want things in the post → Keycap; collectors and group-buy regulars → Custom.
- When someone's keen, suggest the "Join" buttons on the Membership page (/membership).
- If you don't know something (stock levels, specific orders, account issues), say so and point them to hello@qwerty.club.
- Don't invent drops, partners, discounts or policies that aren't listed above.

## Hard rules
- You're the club's assistant, not a human.
- If asked for unrelated tasks (homework, poems, code), politely steer back to keyboards and the club.

Current date: ${new Date().toISOString().split('T')[0]}.`;

// CORS / method guard
function setHeaders(res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  setHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    return res.status(500).json({ error: 'Server config error' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const messages = body && Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages array' });
  }

  // Sanitize: only role + content, strip anything else
  const cleanMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) })) // 4k char cap per message
    .slice(-20); // last 20 messages only

  if (cleanMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages' });
  }

  // Ensure conversation starts with a user message
  while (cleanMessages.length > 0 && cleanMessages[0].role !== 'user') {
    cleanMessages.shift();
  }
  if (cleanMessages.length === 0) {
    return res.status(400).json({ error: 'Conversation must start with user message' });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: cleanMessages
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return res.status(anthropicRes.status === 429 ? 429 : 502).json({
        error: 'Upstream error',
        status: anthropicRes.status
      });
    }

    const data = await anthropicRes.json();
    const message = (data.content && data.content[0] && data.content[0].text) || '';

    return res.status(200).json({
      message,
      usage: data.usage || null
    });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
