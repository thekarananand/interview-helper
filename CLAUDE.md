# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Stealth Notes** — a two-device local-network note streaming system. Device A runs the sender (Node.js web server); Device B runs the overlay (Electron). Notes typed in the sender UI stream in real time to a transparent, always-on-top, click-through window on the overlay device that is hidden from screen capture on macOS and Windows.

## Commands

### Sender (Device A)
```bash
cd sender
npm install
npm start           # node server.js — listens on :3000
```
Open `http://localhost:3000` in a browser. The terminal prints all LAN `ws://` addresses to paste into the overlay settings.

### Overlay (Device B)
```bash
cd overlay
npm install
npx electron .
```
Press **Cmd/Ctrl+Shift+.** to open the settings panel and enter the sender's WebSocket address (e.g. `ws://192.168.1.x:3000/overlay`).

## Architecture

```
sender/server.js          HTTP + WebSocket server (Express + ws)
sender/public/index.html  Sender UI — plain JS, no framework

overlay/main.js           Electron main process — window config, global hotkey, IPC
overlay/preload.js        contextBridge — exposes electronAPI to renderer
overlay/renderer/index.html  Overlay UI — WebSocket client, notes display, settings panel
```

### WebSocket paths
| Path | Role |
|---|---|
| `/sender` | Browser on Device A |
| `/overlay` | Electron overlay on Device B |

Server fans messages from `/sender` to all `/overlay` clients. It also pushes `{ type: "overlay_count", count }` back to sender clients so the UI shows how many overlays are connected.

### Message schema
```json
{ "type": "note",  "content": "..." }   // replace overlay text
{ "type": "clear" }                      // clear overlay text
{ "type": "overlay_count", "count": 1 } // server → sender only
```

### Key Electron window properties (`overlay/main.js`)
- `setAlwaysOnTop(true, 'screen-saver')` — highest z-order
- `setContentProtection(true)` — hides from capture (macOS: `NSWindowSharingNone`, Windows: `SetWindowDisplayAffinity`)
- `setIgnoreMouseEvents(true, { forward: true })` — click-through when settings are closed
- `setVisibleOnAllWorkspaces(true)` — survives Space/desktop switches

Mouse passthrough is toggled off (`setIgnoreMouse(false)`) when the settings panel is open so the user can type in the input field.

## Changing the port
Set `PORT` env var before starting the sender: `PORT=4000 npm start`. Update the overlay address accordingly.
