# ScriptPad — Product Spec v0.1

> **Tagline:** Your scripts. Always ready. One click away.
> **What:** Chrome extension that gives call center agents, telemarketers, and sales reps instant access to organized call scripts, objection handlers, and quick-reference info — right alongside whatever dialer or CRM they're already using.

---

## 🎯 Target Users

### Primary: Individual Call Center / Telemarketer Agents
- Work from home (WFH) or in-office
- Use browser-based dialers (Five9, Genesys, RingCentral, Aircall, etc.)
- Currently keep scripts in messy Google Docs, sticky notes, or printed paper
- Need fast access mid-call — can't be tabbing around

### Secondary: Team Leads / Managers
- Want to distribute standardized scripts to their team
- Need to update scripts and have changes push to all agents instantly

### Tertiary: Freelance Sales Reps / SDRs
- Juggle multiple clients/campaigns with different scripts
- Need to switch context fast

---

## 🧩 MVP Features (v1.0 — Free)

### 1. Script Library
- Create, edit, and organize scripts
- **Folders/categories:** e.g., "Openers", "Objection Handlers", "Closers", "FAQs", "Compliance"
- Each script has a **title**, **body** (rich text — bold, bullets, highlights), and optional **tags**
- Limit: 15 scripts on free tier

### 2. Instant Search
- Search bar at the top — always visible
- Searches across titles, body text, and tags
- Results update as you type (fuzzy matching)
- Keyboard shortcut to focus search (e.g., Ctrl+Shift+S)

### 3. Quick Copy
- One-click copy any script or section to clipboard
- Visual confirmation ("Copied! ✓")
- Useful for pasting into chat/email during calls

### 4. Sidebar Mode
- Opens as a **side panel** (Chrome Side Panel API) so it sits alongside the active tab
- Doesn't cover the dialer or CRM
- Can also open as a popup for quick access
- Resizable width

### 5. Keyboard Navigation
- Open extension: `Ctrl+Shift+S` (customizable)
- Navigate scripts with arrow keys
- Enter to expand, Escape to close
- Fast enough for mid-call use

### 6. Local Storage (MVP)
- All data stored locally in Chrome storage
- No account needed to start
- Export/import as JSON for backup

### 7. Bilingual UI
- English and Spanish interface
- Auto-detect browser language or manual toggle
- Scripts themselves can be in any language

---

## 🚀 Phase 2 Features (Pro — $5-8/mo)

### 8. Branching Scripts (Interactive Flows)
- "If customer says X → show section Y"
- Simple decision-tree UI — click a response option, see the next step
- Visual flow builder for creating branches
- Game-changer for complex calls (insurance, tech support, sales)

### 9. Personal Call Tracker
- Quick log after each call: outcome (sale, callback, not interested, etc.)
- Dashboard with daily/weekly stats
- Conversion rate, calls per hour, common objections
- Export to CSV

### 10. Cloud Sync
- Create account (email or Google sign-in)
- Scripts sync across devices
- Never lose scripts if you switch computers

### 11. Script Pinning & Favorites
- Pin your most-used scripts to the top
- "Quick access" section for the 3-5 scripts you use on every call

### 12. Custom Hotkeys
- Assign keyboard shortcuts to specific scripts
- e.g., `Ctrl+1` = Opening script, `Ctrl+2` = Price objection handler

### 13. Unlimited Scripts
- Remove the 15-script cap

---

## 👥 Phase 3 Features (Team — $3-5/user/mo)

### 14. Team Workspaces
- Manager creates a workspace, invites agents
- Shared script library that manager controls
- Agents can also have personal scripts alongside team scripts

### 15. Script Versioning & Push Updates
- Manager updates a script → all agents get the new version instantly
- Version history — roll back if needed
- "What's new" badge so agents notice updates

### 16. Analytics Dashboard (Manager)
- See which scripts agents use most
- Track team performance (if call tracker is enabled)
- Identify top performers and what scripts they use

### 17. Role-Based Access
- Manager: full edit access
- Agent: view + use team scripts, edit personal scripts
- Admin: manage team members, billing

---

## 🎨 UI / UX Design Direction

### Visual Style
- **Clean, minimal, fast** — this is a work tool, not a social app
- Dark mode by default (agents stare at screens all day)
- Light mode option
- High contrast text for readability during calls
- Accent color: Electric blue (#0066FF) or teal

### Layout (Side Panel)
```
┌─────────────────────────┐
│ 🔍 Search scripts...    │
├─────────────────────────┤
│ 📌 Pinned               │
│  ├─ Opening Script      │
│  └─ Price Objection     │
├─────────────────────────┤
│ 📁 Openers              │
│ 📁 Objection Handlers   │
│ 📁 Closers              │
│ 📁 FAQs                 │
│ 📁 Compliance           │
├─────────────────────────┤
│ [+ New Script]          │
└─────────────────────────┘
```

### Script View (expanded)
```
┌─────────────────────────┐
│ ← Back    📋 Copy All   │
├─────────────────────────┤
│ Price Objection Handler │
│ Tags: #objection #price │
├─────────────────────────┤
│                         │
│ "I understand price is  │
│ important. Let me share │
│ what's included..."     │
│                         │
│ ✦ Feature 1 — value     │
│ ✦ Feature 2 — value     │
│ ✦ Feature 3 — value     │
│                         │
│ If still hesitant:      │
│ → [Payment plan option] │
│ → [Trial offer]         │
│                         │
│ 📋 Copy Section         │
├─────────────────────────┤
│ [Edit] [Delete]         │
└─────────────────────────┘
```

---

## 🛠 Technical Architecture

### Stack
- **Extension framework:** Chrome Extension Manifest V3
- **UI:** HTML/CSS/JS (or lightweight framework — Svelte or Preact for small bundle)
- **Storage (MVP):** Chrome Storage API (local + sync)
- **Storage (Pro/Team):** Supabase or Firebase for cloud sync + auth
- **Search:** Client-side fuzzy search (Fuse.js or similar)

### Extension Components
- **Side Panel** — main interface (Chrome Side Panel API)
- **Popup** — quick access fallback
- **Background Service Worker** — handles keyboard shortcuts, storage sync
- **Content Script** — (Phase 2+) could inject floating widget on specific dialer pages

### Data Model (MVP)
```json
{
  "folders": [
    {
      "id": "uuid",
      "name": "Objection Handlers",
      "order": 1
    }
  ],
  "scripts": [
    {
      "id": "uuid",
      "folderId": "uuid",
      "title": "Price Objection",
      "body": "Rich text content...",
      "tags": ["objection", "price"],
      "pinned": true,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "settings": {
    "language": "en",
    "theme": "dark",
    "hotkey": "Ctrl+Shift+S"
  }
}
```

---

## 📋 MVP User Stories

1. **As an agent**, I can open ScriptPad in a side panel so I can see my scripts while on a call
2. **As an agent**, I can create a new script with a title, body, and tags
3. **As an agent**, I can organize scripts into folders
4. **As an agent**, I can search across all my scripts and find results instantly
5. **As an agent**, I can copy a script to clipboard with one click
6. **As an agent**, I can use a keyboard shortcut to open ScriptPad without clicking
7. **As an agent**, I can switch the UI between English and Spanish
8. **As an agent**, I can export/import my scripts as a backup
9. **As an agent**, my scripts persist between browser sessions (local storage)
10. **As an agent**, I can use dark or light mode

---

## 🗓 Suggested Build Phases

### Phase 0 — Setup (Week 1)
- Chrome extension boilerplate (Manifest V3)
- Basic popup + side panel shell
- Local storage layer

### Phase 1 — Core MVP (Weeks 2-4)
- Script CRUD (create, read, update, delete)
- Folder organization
- Search functionality
- Copy to clipboard
- Keyboard shortcuts
- Dark/light theme
- English/Spanish UI

### Phase 2 — Polish & Launch (Weeks 5-6)
- Import/export
- Onboarding flow (first-time user experience)
- Landing page / marketing site
- Chrome Web Store listing
- Beta testing with real agents

### Phase 3 — Monetization (Weeks 7-10)
- Account system (auth)
- Cloud sync
- Branching scripts
- Call tracker
- Payment integration (Stripe)

### Phase 4 — Team Features (Weeks 11-16)
- Team workspaces
- Manager dashboard
- Script versioning
- Analytics

---

## 💡 Working Name Options

1. **ScriptPad** — simple, clear, memorable
2. **CallFlow** — implies flow/process
3. **ScriptDock** — "docked" sidebar feel
4. **QuickScript** — speed-focused
5. **CallScript Pro** — descriptive but generic
6. **Prompter** — like a teleprompter for calls

---

## 🏁 Success Metrics

### Launch (Month 1)
- 100+ installs
- 4.0+ star rating
- <3 sec load time

### Growth (Month 3)
- 1,000+ installs
- 50+ daily active users
- First paying customers (Pro)

### Scale (Month 6)
- 5,000+ installs
- First team workspace sold
- Revenue covering hosting costs

---

*Last updated: May 15, 2026*
*Status: Brainstorming → Ready for review*
