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

This is a Manifest V3 Chrome extension with no build step. Uses content script injection for a centered modal overlay.

**Key files:**
- `manifest.json` - Extension config, permissions (`tabs`, `scripting`), keyboard shortcut
- `background.js` - Service worker that handles shortcut, injects scripts, queries tabs
- `content.js` - Injected script that creates/manages the modal UI
- `content.css` - Styles for the centered command palette overlay

**Flow:**
1. `Cmd+E` triggers `background.js` via `chrome.commands.onCommand`
2. Background injects `content.js` + `content.css` into active tab
3. Content script requests tabs via message to background (`getTabs`)
4. User searches → `fuzzyMatch()` filters/scores tabs
5. Selection sends `switchToTab` message → background calls `chrome.tabs.update()`

**Fuzzy search** (`fuzzyMatch()`):
- Matches characters in sequence (not necessarily adjacent)
- Bonuses: consecutive matches (+10), word boundary matches (+5)
- Penalty for longer strings to prefer precise matches
- Returns match positions for highlighting
