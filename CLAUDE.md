# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tab Portal is a Chrome extension that provides a Raycast-style command palette for quickly searching and switching between open browser tabs across all windows.

## Installation & Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select this project directory
4. Press `Cmd+E` (Mac) / `Ctrl+E` (Windows/Linux) to open the palette

To reload after code changes: Click the refresh icon on the extension card in `chrome://extensions/`

## Architecture

Manifest V3 Chrome extension with no build step. Uses content script injection for a centered modal overlay, with popup window fallback for restricted pages.

**Key files:**
- `manifest.json` - Extension config, permissions (`tabs`, `scripting`), keyboard shortcut
- `background.js` - Service worker: handles shortcut, injects scripts, queries tabs, manages tab operations
- `content.js` / `content.css` - Injected modal UI for normal pages
- `popup.html` / `popup.js` - Fallback UI for restricted pages (`chrome://`, Web Store, etc.)

**Flow:**
1. `Cmd+E` triggers `background.js` via `chrome.commands.onCommand`
2. Background checks if URL is restricted → opens popup window if so
3. Otherwise injects `content.js` + `content.css` into active tab
4. Content script requests tabs via message to background (`getTabs`)
5. User searches → `fuzzyMatch()` filters/scores tabs
6. Actions send messages to background: `switchToTab`, `deleteTab`

**Keyboard shortcuts:**
- `↑/↓` or `Ctrl+K/J` - Navigate list
- `Enter` - Switch to tab
- `Ctrl+Delete/Backspace` - Close tab
- `Esc` - Close palette

**Sorting:**
- Default: `lastAccessed` descending (most recent first)
- Searching: fuzzy match `score` descending (best match first)

**Fuzzy search** (`fuzzyMatch()`):
- Matches characters in sequence (not necessarily adjacent)
- Bonuses: consecutive matches (+10), word boundary matches (+5)
- Penalty for longer strings to prefer precise matches
- Returns match positions for highlighting
