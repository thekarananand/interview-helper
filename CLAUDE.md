# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Stealth Notes** — a single Electron app that embeds an HTTP + WebSocket server. Run the overlay on any machine; open the displayed LAN URL (or scan the QR code) on a phone or another device to send notes. Notes stream in real time to a transparent, always-on-top, click-through window hidden from screen capture on macOS and Windows.

## Commands

```bash
cd overlay
npm install
npx electron .
```

Press **Cmd/Ctrl+Shift+.** to open the settings panel — shows a QR code and LAN URL(s). Scan the QR on any phone on the same network to open the mobile sender UI.

## Architecture

```
overlay/main.js              Electron main — window config, embedded server startup, IPC
overlay/server.js            Express + ws server (HTTP :3000, WS /sender + /overlay)
overlay/preload.js           contextBridge — exposes electronAPI to renderer
overlay/renderer/index.html  Overlay UI — WS client, notes display, settings panel
overlay/public/index.html    Sender web UI — mobile-first, served to external browser clients
```

### WebSocket paths
| Path | Role |
|---|---|
| `/sender` | External browser sender (phone or any device on LAN) |
| `/overlay` | Electron overlay (auto-connects to localhost on startup) |

The server fans all messages from `/sender` to `/overlay` clients. It also pushes live counts in both directions.

### Message schema
```json
{ "type": "note",         "content": "..." }  // replace overlay text
{ "type": "clear" }                            // clear overlay text
{ "type": "move",         "position": "..." } // reposition overlay window (top-left/top-right/bottom-left/bottom-right)
{ "type": "scroll",       "delta": 120 }      // scroll overlay content
{ "type": "direction",    "from": "top" }     // anchor notes from top or bottom
{ "type": "overlay_count","count": 1 }        // server → sender only
{ "type": "sender_count", "count": 1 }        // server → overlay only
```

### Settings panel (`overlay/renderer/index.html`)
- Opens/closes with **Cmd/Ctrl+Shift+.**
- Auto-closes when a `note` or `clear` message arrives (sender started typing)
- Shows QR code (generated in main process via `qrcode` package, passed as data URL over IPC)
- Shows LAN URL(s) as copy buttons with globe icon
- Shows live sender count (how many browser tabs are connected) next to each URL
- Exit button shuts down the Electron process

### IPC channels
| Channel | Direction | Pattern | Payload |
|---|---|---|---|
| `toggle-settings` | main → renderer | send/on | — |
| `set-ignore-mouse` | renderer → main | send/on | `boolean` |
| `move-window` | renderer → main | send/on | position string |
| `quit-app` | renderer → main | send/on | — |
| `get-server-urls` | renderer → main | invoke/handle | returns `{ wsUrl, lanUrls, qrDataUrl }` |

### Key Electron window properties (`overlay/main.js`)
- `setAlwaysOnTop(true, 'screen-saver')` — highest z-order, stays above full-screen apps
- `setContentProtection(true)` — hides from screen capture (macOS: `NSWindowSharingNone`, Windows: `SetWindowDisplayAffinity`)
- `setIgnoreMouseEvents(true, { forward: true })` — click-through when settings are closed
- `setVisibleOnAllWorkspaces(true)` — survives Space/desktop switches

### Sender web UI (`overlay/public/index.html`)
Mobile-first design. Controls: clear, overlay position (↖↗↙↘), scroll (▲▼), char count. Connects to `/sender` WS and streams every keystroke as a `note` message.

## Changing the port
```bash
PORT=4000 npx electron .
```
