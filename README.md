# QWERTY Club — Membership Site

A members' club for mechanical keyboard people: monthly keycap drops, members-only group buys and build nights. Marketing + membership site with a Claude-powered "club concierge" chatbot.

> Portfolio concept designed and built by [The Daly Creative](https://thedalycreative.com). QWERTY is a fictional brand; the contact email `hello@qwerty.club` is a placeholder.

**Stack:** Static HTML/CSS/JS + Vercel serverless function + Anthropic API. No build step, no framework.

---

## What's in here

```
qwerty-membership-site/
├── index.html          Homepage (hero, perks, this month's drop, member notes)
├── membership.html     Membership tiers (Switch $9 · Keycap $29 · Custom $79) + FAQ
├── styles.css          Shared brand styles (palette, keycap components, chatbot)
├── site.js             Light/dark theme toggle (remembers choice)
├── chatbot.js          Concierge chat widget — talks to /api/chat
├── api/
│   └── chat.js         Vercel serverless function calling Claude Haiku 4.5 with the QWERTY system prompt
├── assets/             SVG brand assets (favicon, app icon, QWERTY keycap lockup)
├── vercel.json         Routing, redirects (/join, /book, /setup-day → /membership), security headers
└── .env.example        Required env vars
```

`styles.css` lives at the root, not in `/assets/`, because `vercel.json` serves `/assets/*` with a one-year immutable cache.

---

## Brand

| Token | Value | Use |
|-------|-------|-----|
| Ink | `#1c1b19` | Text, dark band |
| Cream | `#f3eee4` | Page background |
| Paper | `#fbf8f2` | Cards, neutral keycaps |
| Escape blue | `#3355ff` | Primary accent, "Q" key, buttons |
| Butter | `#ffcf3f` | Secondary accent, "Y" key, highlights |

- **Type:** Space Grotesk (display/body), JetBrains Mono (labels, keycaps)
- **Logo:** six keycaps spelling QWERTY — blue Q, butter Y, cream in between (`assets/qwerty-lockup.svg`). Mark: a single blue Q keycap (`assets/qwerty-favicon.svg`).
- **Buttons** press down like keys (offset bottom shadow collapses on `:active`).

---

## Deploy

1. Vercel project is connected to this repo — pushing to `main` deploys production.
2. Required env var: `ANTHROPIC_API_KEY` (Vercel → Project → Settings → Environment Variables).
3. Test the chatbot: click the **Q** key bottom-right and send a message. "Server config error" means the env var is missing.

## Local development

```bash
npm i -g vercel
vercel dev        # http://localhost:3000, serves static files + /api/chat
```

Add `ANTHROPIC_API_KEY` to `.env.local` (copy from `.env.example`).

---

## Editing notes

- **Drop counter / dates** ("Drop #14", "212 / 300 claimed") are hardcoded in `index.html` and `membership.html`.
- **Tiers & policies** appear in `membership.html` *and* the system prompt in `api/chat.js` — update both together so the concierge doesn't contradict the page.
- **Join buttons** are `mailto:` placeholders; swap for a Stripe Checkout / Memberful link if this goes live.
