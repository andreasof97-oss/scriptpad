# ScriptPad — Project Notes

Chrome extension (Manifest V3) that gives call center agents, telemarketers, and
sales reps instant access to their scripts. Side panel UI, opened with
`Ctrl+Shift+S` (`Cmd+Shift+S` on Mac).

**Owner is non-technical.** Explain changes in plain language, avoid unexplained
jargon, and say what a change will do before doing it. Prefer small, verifiable
steps over large rewrites.

## Layout

```
extension/          The actual Chrome extension (this is the product)
  manifest.json     Version lives here — bump it for every release
  background.js     Service worker
  sidepanel/        Main UI — nearly all the code
  popup/            Fallback popup
  icons/
supabase/functions/ Backend (Deno edge functions)
  ai-assistant/            AI features
  paypal-create-subscription/
  paypal-webhook/
docs/               GitHub Pages site (privacy policy, sitemap, success page)
landing/            Marketing landing page
store-listing/      Chrome Web Store assets — screenshots, promo art, copy (EN/ES)
mockup/, preview/   Design mockups, not shipped
*.sql               Supabase schema and migrations
```

### Key files in `extension/sidepanel/`

| File          | Lines | Purpose                                    |
|---------------|-------|--------------------------------------------|
| `app.js`      | ~3200 | Main app logic. Large — read before editing |
| `styles.css`  | ~2800 | All styling, incl. dark/light themes        |
| `index.html`  | ~700  | UI structure                                |
| `i18n.js`     | ~700  | EN/ES translations                          |
| `storage.js`  | ~750  | chrome.storage persistence                  |
| `teams.js`    | ~240  | Team/shared-scripts features                |
| `search.js`   | ~150  | Fuzzy search                                |
| `auth.js`     | ~150  | Supabase auth                               |
| `config.js`   | ~20   | Public keys and endpoint URLs               |

## Stack

No build step, no bundler, no `package.json`. Plain HTML/CSS/JS loaded directly
by Chrome. Edit a file and reload the extension — that is the whole loop.

- **Supabase** — auth, database, edge functions
- **PayPal** — subscriptions (live mode; `PAYPAL_SANDBOX: false`)
- **GitHub Pages** — serves `docs/` at `andreasof97-oss.github.io/scriptpad/`

## Testing a change

1. Open `chrome://extensions`
2. Enable Developer mode
3. **Load unpacked** → select the `extension/` folder
4. After edits, click the reload icon on the ScriptPad card
5. `Ctrl+Shift+S` to open

There is no automated test suite. Changes must be verified by hand in Chrome.

## Releasing

1. Bump `version` in `extension/manifest.json`
2. Zip the `extension/` folder as `scriptpad-vX.Y.Z.zip` in the repo root
   (past release zips are kept there)
3. Upload to the Chrome Web Store dashboard

**Status: not yet published to the Chrome Web Store.** Getting it published is
the current goal.

## Secrets — important

`extension/sidepanel/config.js` holds the Supabase anon key and PayPal client ID.
**These are meant to be public** and are safe to commit. The anon key is only safe
because Row Level Security is enabled — see the `*.sql` files. Never weaken RLS.

Real secrets belong in Supabase edge function environment variables, accessed via
`Deno.env.get(...)` — the PayPal functions already do this correctly. Never
hardcode a secret into a file under `extension/` or `scripts/`.

## Conventions

- Every user-facing string needs both EN and ES entries in `i18n.js`
- Any new color must work in both dark and light themes
- Keep `manifest.json` permissions minimal — Web Store review scrutinizes these
