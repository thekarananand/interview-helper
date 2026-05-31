# Ghost Protocol: Minimize/Maximize & Drag Design

**Date:** 2026-05-31  
**Feature:** Overlay minimize/maximize button + draggable overlay window  
**Scope:** Electron overlay renderer + main process + WebSocket message fan

---

## Overview

Add two capabilities to the Ghost Protocol overlay:

1. **Minimize/Maximize Button** — Hide overlay content, move window 200px down; show maximize button to restore
2. **Draggable Overlay** — Click anywhere on overlay and drag to reposition the window in real-time

Both features sync across all connected endpoints via WebSocket.

---

## State & Architecture

### Renderer State

Track in `overlay/renderer/index.html`:
- `minimized: boolean` — current minimize state (default: `false`)
- `originalPosition: { x, y }` — saved position before minimize

### Minimize Flow

1. User clicks minimize button
2. Renderer sends WS message: `{ type: 'minimize', minimized: true }`
3. Server broadcasts to all `/overlay` clients
4. Each overlay client:
   - Sets `minimized = true`
   - Hides `#notes` and `#hint` elements
   - Hides minimize button, shows maximize button
   - Sends IPC to main.js to move window +200px down
   - Saves `originalPosition` before move

### Maximize Flow

Reverse of minimize:
1. User clicks maximize button
2. Renderer sends `{ type: 'minimize', minimized: false }`
3. Server broadcasts to all overlays
4. Each overlay:
   - Sets `minimized = false`
   - Shows `#notes` and `#hint`
   - Shows minimize button, hides maximize button
   - Sends IPC to main.js to restore `originalPosition`

### Drag Flow

1. User `mousedown` on `#notes-wrap` (anywhere on overlay)
2. Renderer tracks initial `clientX`, `clientY`
3. On `mousemove`, calculate `deltaX`, `deltaY`
4. Send IPC: `{ x: newX, y: newY }` to main.js
5. main.js calls `win.setPosition(newX, newY)` (live position update)
6. Drag disabled when `minimized === true`

---

## UI & Button Placement

### Minimize Button

- **Placement:** Bottom center, below `#notes`, inside `#notes-wrap`
- **State:** Visible when `minimized === false`
- **Styling:** Same as settings hotkey hint (small, uppercase label, dark background)
- **Icon:** Minus/collapse SVG
- **Interaction:** Click → send minimize message

### Maximize Button

- **Placement:** Center of minimized overlay area (replaces minimize button)
- **State:** Visible when `minimized === true`
- **Styling:** Larger, more prominent than minimize button
- **Icon:** Plus/expand SVG
- **Interaction:** Click → send maximize message

### Minimized Overlay

- **Width:** Unchanged from current window width
- **Height:** Shrinks to button area + padding (approx. 60-80px)
- **Content:** Only maximize button visible
- **Movement:** Window repositioned 200px lower than pre-minimize position

---

## Message Schema

### New WebSocket Message

```json
{
  "type": "minimize",
  "minimized": true
}
```

Broadcast by `/overlay` clients; fanned by server to all other `/overlay` clients. Controller (`/sender`) clients do not send this message.

---

## IPC Channels

### New Renderer → Main Channel

**Channel:** `drag-window`

**Payload:**
```json
{ "x": 100, "y": 200 }
```

**Handler in main.js:**
```javascript
ipcMain.on('drag-window', (_, { x, y }) => {
  if (win) win.setPosition(x, y);
});
```

---

## Implementation Files

### 1. `overlay/renderer/index.html`

- Add minimize/maximize buttons to DOM (inside `#notes-wrap`)
- Add CSS for button styling and visibility toggles
- Track `minimized`, `originalPosition` state in script
- Add `mousedown`/`mousemove`/`mouseup` listeners on `#notes-wrap` for drag
- Send minimize/maximize WS messages
- Send drag IPC messages to main.js
- Handle incoming `minimize` WS messages from server
- Optional: persist minimized state to localStorage

### 2. `overlay/main.js`

- Add IPC handler for `drag-window` channel
- Call `win.setPosition(x, y)` to apply dragged position

### 3. `overlay/server.js`

- No changes — existing WS message fan handles minimize broadcasts

---

## Behavioral Notes

- **Drag precision:** Drag updates live as mouse moves; no snap-to-grid
- **Minimize position offset:** Always 200px below pre-minimize position (fixed, not proportional)
- **Drag while minimized:** Drag listeners remain, but ignored (can be skipped if UI hidden)
- **Controller behavior:** Unchanged — position buttons remain, no drag interaction
- **Sync:** Minimize/maximize state syncs across all `/overlay` clients; drag position updates only on local Electron window (not broadcast)

---

## Testing

- [ ] Minimize button shows/hides correctly
- [ ] Maximize button shows/hides correctly
- [ ] Minimize moves window 200px down
- [ ] Maximize restores original position
- [ ] Drag repositions window in real-time
- [ ] Minimize state syncs across multiple overlay clients
- [ ] Controller position buttons still work alongside drag
- [ ] Minimize persists after page reload (if localStorage enabled)
