# ScriptPad — Chrome Extension

> Your scripts. Always ready. One click away.

## How to Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **"Load unpacked"**
4. Select this `extension/` folder
5. Done! You'll see the ScriptPad icon (blue "SP") in your toolbar

## How to Use

- **Click the icon** → opens a popup with a button to launch the side panel
- **Ctrl+Shift+S** (or Cmd+Shift+S on Mac) → opens the side panel directly
- The side panel sits alongside your browser tab — perfect for use during calls

### Features

- **Create scripts** — title, rich text body (bold, bullets, highlights), tags
- **Organize in folders** — Openers, Objection Handlers, Closers, etc.
- **Search** — fuzzy search across titles, body, and tags
- **Copy to clipboard** — one click, "Copied ✓" toast
- **Pin favorites** — pinned scripts show at the top
- **Keyboard navigation** — `/` to search, arrow keys to navigate, Enter to open, Escape to go back
- **Dark & Light mode** — dark by default
- **EN/ES bilingual** — toggle in header or settings
- **Import/Export** — backup your scripts as JSON

### Sample Scripts Included

First time you open ScriptPad, you'll see 4 sample scripts:
1. Opening Script (pinned)
2. Price Objection Handler (pinned)
3. Soft Close Script
4. Refund Policy FAQ

Edit or delete these as you like!

## File Structure

```
extension/
├── manifest.json           # Extension config (Manifest V3)
├── background.js           # Service worker (keyboard shortcut, side panel)
├── sidepanel/
│   ├── index.html          # Side panel UI
│   ├── styles.css          # All styles (dark/light themes)
│   ├── app.js              # Main application logic
│   ├── storage.js          # Chrome Storage API layer
│   ├── search.js           # Fuzzy search engine
│   └── i18n.js             # EN/ES translations
├── popup/
│   ├── index.html          # Popup UI
│   └── popup.js            # Popup logic
├── icons/
│   ├── icon16.png          # Toolbar icon
│   ├── icon48.png          # Extensions page icon
│   └── icon128.png         # Chrome Web Store icon
└── README.md               # This file
```

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (no frameworks, no build step)
- Chrome Storage API (local)
- Chrome Side Panel API

## Known Limitations

- Icons are solid blue placeholders — replace with proper designed icons later
- Rich text editor is basic (bold, italic, bullets, highlight) — no undo/redo toolbar
- No cloud sync yet (Phase 2 feature)
- No branching scripts yet (Phase 2 feature)
- Folder reorder not implemented (drag & drop)

## Next Steps

- [ ] Design proper icons
- [ ] Add onboarding flow for first-time users
- [ ] Cloud sync with Supabase
- [ ] Branching/interactive scripts
- [ ] Call tracker
- [ ] Chrome Web Store listing
