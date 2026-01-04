# Tab Portal

A Chrome extension that provides a Raycast-style command palette for instantly searching and switching between open browser tabs across all windows.

![Tab Portal](https://img.shields.io/badge/Chrome-Extension-blue) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)

## Features

- **Instant Tab Search** - Fuzzy search across all open tabs by title or URL
- **Cross-Window Support** - Find and switch to tabs in any Chrome window
- **Keyboard-First Navigation** - Full keyboard control for power users
- **Tab Management** - Close tabs directly from the palette without switching to them
- **Smart Sorting** - Tabs sorted by last accessed; search results sorted by relevance
- **Minimal Design** - Clean, dark interface inspired by Raycast

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked** and select the project directory
5. Press `Cmd+E` (Mac) or `Ctrl+E` (Windows/Linux) to open Tab Portal

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+E` | Open Tab Portal |
| `↑` / `↓` | Navigate tabs |
| `Ctrl+K` / `Ctrl+J` | Navigate up/down (vim-style) |
| `Enter` | Switch to selected tab |
| `Ctrl+Delete` or `Ctrl+Backspace` | Close selected tab |
| `Esc` | Close palette |

## How It Works

Tab Portal injects a modal overlay into the current page when triggered. On restricted pages (like `chrome://` URLs or the Chrome Web Store), it falls back to opening a popup window.

### Fuzzy Search

The search algorithm matches characters in sequence (not necessarily adjacent), with scoring bonuses for:
- Consecutive character matches
- Matches at word boundaries (start of words, after `-`, `_`, `.`, `/`)
- Shorter strings (prefers more precise matches)

### Tab Sorting

- **Default view**: Tabs sorted by last accessed time (most recent first)
- **Search results**: Tabs sorted by fuzzy match score (best matches first)

## Files

```
tabportal/
├── manifest.json    # Extension configuration
├── background.js    # Service worker for shortcuts and tab queries
├── content.js       # Injected modal UI
├── content.css      # Modal styles
├── popup.html       # Fallback popup for restricted pages
├── popup.js         # Popup logic
└── icons/           # Extension icons
```

## Permissions

- `tabs` - Query and manage browser tabs
- `scripting` - Inject content scripts
- `<all_urls>` - Inject into any webpage (required for the overlay)

## Browser Support

- Chrome (Manifest V3)
- Edge (Chromium-based)

## License

MIT
