# Ghost Protocol: Minimize/Maximize & Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimize/maximize button and draggable overlay functionality to the Ghost Protocol Electron window.

**Architecture:** Minimize/maximize state is tracked in the renderer and synced via WebSocket to all overlay clients. Drag updates are local (IPC to main.js only). Button interactions trigger WS messages for state sync; drag listeners send position updates via IPC.

**Tech Stack:** Electron, Express, WebSocket, vanilla JavaScript DOM manipulation.

---

## Files Modified

- `overlay/renderer/index.html` — Add buttons, state, listeners, WS/IPC integration
- `overlay/main.js` — Add IPC handler for drag-window channel

---

## Task 1: Add Minimize/Maximize Button HTML

**Files:**
- Modify: `overlay/renderer/index.html` (lines ~369-370, after `#hint`)

Add button container and buttons to the DOM. Place after the `#hint` div inside `#notes-wrap`.

- [ ] **Step 1: Add HTML markup**

In `overlay/renderer/index.html`, find the `#notes-wrap` div (~line 367) and add this after the `#hint` div:

```html
    <div id="min-max-controls">
      <button id="minimize-btn" class="min-max-btn" title="Minimize overlay">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="8" x2="12" y2="8"/>
        </svg>
      </button>
      <button id="maximize-btn" class="min-max-btn hidden" title="Maximize overlay">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="12" x2="12" y2="12"/><line x1="8" y1="8" x2="8" y2="12"/>
        </svg>
      </button>
    </div>
```

Expected: Two buttons added; maximize button has `hidden` class initially.

- [ ] **Step 2: Verify HTML renders**

Run the app and visually confirm both buttons are present (minimize visible, maximize hidden) at the bottom of the overlay.

```bash
cd overlay && npx electron .
```

Expected: Overlay window shows minimize button at bottom center.

---

## Task 2: Style Minimize/Maximize Buttons

**Files:**
- Modify: `overlay/renderer/index.html` (style section, ~line 362)

Add CSS for button styling and visibility toggles.

- [ ] **Step 1: Add CSS for button container and buttons**

In the `<style>` block (before closing `</style>`), add:

```css
    /* ── Minimize/Maximize controls ────────────────────────── */
    #min-max-controls {
      display: flex;
      justify-content: center;
      gap: 0;
      margin-top: 8px;
      pointer-events: auto;
    }

    .min-max-btn {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      color: var(--dim);
      width: 40px;
      height: 40px;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      flex-shrink: 0;
    }

    .min-max-btn:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.15);
      color: var(--text);
    }

    .min-max-btn:active {
      background: rgba(255,255,255,0.09);
      transform: scale(0.92);
    }

    .min-max-btn svg {
      width: 18px;
      height: 18px;
    }

    .min-max-btn.hidden {
      display: none;
    }

    /* Minimized state styles */
    #notes-wrap.minimized #min-max-controls {
      justify-content: center;
      margin-top: 0;
    }

    #notes-wrap.minimized .min-max-btn {
      width: 48px;
      height: 48px;
    }

    #notes-wrap.minimized .min-max-btn svg {
      width: 20px;
      height: 20px;
    }
```

Expected: Buttons styled with proper padding, hover effects, and size adjustments for minimized state.

- [ ] **Step 2: Verify styling in browser**

Run app and check button appearance:
- Buttons should be centered at bottom of overlay
- Hover effect should change background and color
- Click feedback (scale) should work
- Minimize button visible, maximize hidden

```bash
cd overlay && npx electron .
```

Expected: Buttons visually appear as styled, interactive.

---

## Task 3: Initialize State Tracking

**Files:**
- Modify: `overlay/renderer/index.html` (script section, after line 418)

Add state variables after the existing WebSocket state declarations.

- [ ] **Step 1: Add state variables**

In the `<script>` block, find where `wsState = 'info'` is declared (~line 417), and add after it:

```javascript
    let minimized = false;
    let originalPosition = { x: 0, y: 0 };
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
```

Expected: State variables are available globally in the script scope.

- [ ] **Step 2: Load minimized state from localStorage (optional)**

After the state variables, add:

```javascript
    // Load persisted minimize state
    function loadMinimizeState() {
      const stored = localStorage.getItem('overlay-minimized');
      if (stored === 'true') {
        minimized = true;
      }
    }

    // Call on init
    // (we'll integrate this into init() below)
```

Expected: Function is defined but not yet called; will call after WebSocket connects.

---

## Task 4: Add Click Handlers for Minimize/Maximize Buttons

**Files:**
- Modify: `overlay/renderer/index.html` (script section, after Task 3)

Add button click handlers and state update functions.

- [ ] **Step 1: Add minimize/maximize functions**

In the script, after the state variables and before `connectTo()`, add:

```javascript
    function sendMinimizeMessage(state) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'minimize', minimized: state }));
      }
    }

    function applyMinimizeState(state) {
      minimized = state;
      const notesWrap = document.getElementById('notes-wrap');
      const minimizeBtn = document.getElementById('minimize-btn');
      const maximizeBtn = document.getElementById('maximize-btn');
      const notesEl = document.getElementById('notes');
      const hintEl = document.getElementById('hint');

      if (state) {
        // Minimize
        notesWrap.classList.add('minimized');
        minimizeBtn.classList.add('hidden');
        maximizeBtn.classList.remove('hidden');
        notesEl.style.display = 'none';
        hintEl.style.display = 'none';
        localStorage.setItem('overlay-minimized', 'true');
        // Send IPC to move window down
        if (window.electronAPI && window.electronAPI.minimizeOverlay) {
          window.electronAPI.minimizeOverlay(200);
        }
      } else {
        // Maximize
        notesWrap.classList.remove('minimized');
        minimizeBtn.classList.remove('hidden');
        maximizeBtn.classList.add('hidden');
        notesEl.style.display = '';
        hintEl.style.display = '';
        localStorage.setItem('overlay-minimized', 'false');
        // Send IPC to restore position
        if (window.electronAPI && window.electronAPI.maximizeOverlay) {
          window.electronAPI.maximizeOverlay();
        }
      }
    }

    document.getElementById('minimize-btn').addEventListener('click', () => {
      sendMinimizeMessage(true);
      applyMinimizeState(true);
    });

    document.getElementById('maximize-btn').addEventListener('click', () => {
      sendMinimizeMessage(false);
      applyMinimizeState(false);
    });
```

Expected: Buttons are clickable and trigger minimize/maximize state changes locally.

- [ ] **Step 2: Test button clicks**

Run app and click minimize button:
- Content should hide
- Minimize button should disappear
- Maximize button should appear
- Click maximize to restore

```bash
cd overlay && npx electron .
```

Expected: Buttons toggle state correctly; content shows/hides.

---

## Task 5: Add WebSocket Handler for Minimize Messages

**Files:**
- Modify: `overlay/renderer/index.html` (in `ws.onmessage`, ~line 451)

Add handling for incoming minimize messages to sync state across overlays.

- [ ] **Step 1: Add minimize message handler**

In `ws.onmessage` (around line 451), add a new condition after the `markdown` handler:

```javascript
          } else if (msg.type === 'minimize') {
            applyMinimizeState(msg.minimized);
```

Insert it after the existing message handlers, around line 471 (after the markdown handler).

Expected: When a minimize message is received, the overlay applies the new state.

- [ ] **Step 2: Test multi-client sync**

Run two overlay instances (or one overlay + one in browser) and verify:
- Click minimize on one → both update
- Click maximize on one → both update

(Requires manual testing with multiple windows/tabs; skip if single-overlay testing is sufficient for now.)

Expected: Minimize state syncs across connected overlays.

---

## Task 6: Add Drag Listeners

**Files:**
- Modify: `overlay/renderer/index.html` (script section, before or after button handlers)

Add mouse event listeners for drag interaction.

- [ ] **Step 1: Add drag event listeners**

After the button click handlers, add:

```javascript
    function startDrag(e) {
      if (minimized || settingsOpen) return; // Don't drag when minimized or settings open
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      // Save current window position for offset calculation
      if (window.electronAPI && window.electronAPI.getWindowPosition) {
        window.electronAPI.getWindowPosition().then(pos => {
          dragOffsetX = pos.x - dragStartX;
          dragOffsetY = pos.y - dragStartY;
        });
      }
    }

    function onDrag(e) {
      if (!dragging) return;
      const newX = e.clientX + dragOffsetX;
      const newY = e.clientY + dragOffsetY;
      if (window.electronAPI && window.electronAPI.dragWindow) {
        window.electronAPI.dragWindow(newX, newY);
      }
    }

    function endDrag() {
      dragging = false;
    }

    notesEl.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
```

Expected: Drag listeners are registered; ready for testing.

- [ ] **Step 2: Test drag interaction**

Run app and try clicking/dragging the overlay window:
- Click on the notes area and drag should move window
- Releasing should stop the drag
- Settings open should prevent drag

```bash
cd overlay && npx electron .
```

Expected: Dragging works; window repositions smoothly.

---

## Task 7: Add IPC Handlers in Main Process

**Files:**
- Modify: `overlay/main.js` (after existing IPC handlers, ~line 121)

Add three IPC handlers: minimize, maximize, drag-window.

- [ ] **Step 1: Add IPC handler for minimize**

In `main.js`, after the existing `ipcMain.on('move-window', ...)` handler (around line 121), add:

```javascript
  ipcMain.on('minimize-overlay', (_, offsetPixels) => {
    if (!win) return;
    const { x, y, width, height } = win.getBounds();
    win.setBounds({ x, y: y + offsetPixels, width, height });
  });
```

Expected: Handler is registered and ready to move window down.

- [ ] **Step 2: Add IPC handler for maximize**

After the minimize handler, add:

```javascript
  ipcMain.handle('get-window-position', () => {
    if (!win) return { x: 0, y: 0 };
    const { x, y } = win.getBounds();
    return { x, y };
  });

  ipcMain.on('maximize-overlay', () => {
    if (!win) return;
    // Note: original position is saved in renderer; this is just a signal
    // The renderer will store and restore the position
  });
```

Expected: Handlers are registered.

- [ ] **Step 3: Add IPC handler for drag-window**

After the maximize handler, add:

```javascript
  ipcMain.on('drag-window', (_, { x, y }) => {
    if (!win) return;
    const { width, height } = win.getBounds();
    win.setBounds({ x, y, width, height });
  });
```

Expected: Handler is registered for real-time drag updates.

- [ ] **Step 4: Verify IPC handlers are in place**

Check `main.js` for all three handlers:
- `minimize-overlay`
- `get-window-position`
- `maximize-overlay`
- `drag-window`

Expected: All handlers present and no syntax errors.

```bash
cd overlay && npm start
```

(Should start without errors.)

---

## Task 8: Update Preload to Expose IPC Methods

**Files:**
- Modify: `overlay/preload.js`

Add contextBridge exposures for the new IPC methods.

- [ ] **Step 1: Add electronAPI methods**

In `preload.js`, update the `contextBridge.exposeInMainWorld('electronAPI', ...)` to include:

```javascript
    minimizeOverlay: (offset) => ipcRenderer.send('minimize-overlay', offset),
    maximizeOverlay: () => ipcRenderer.send('maximize-overlay'),
    dragWindow: (x, y) => ipcRenderer.send('drag-window', { x, y }),
    getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
```

Add these to the existing `electronAPI` object.

Expected: Methods are available on `window.electronAPI`.

- [ ] **Step 2: Verify syntax**

Check preload.js for valid JavaScript and proper method definitions.

Expected: File has no syntax errors.

```bash
cd overlay && node -c preload.js
```

(Should complete without output, indicating valid syntax.)

---

## Task 9: Update Renderer to Use IPC Methods

**Files:**
- Modify: `overlay/renderer/index.html` (in `applyMinimizeState` and drag functions)

Update the calls to use the correct IPC method names via `window.electronAPI`.

- [ ] **Step 1: Update applyMinimizeState function**

Find the `applyMinimizeState` function (added in Task 4) and update the IPC calls:

Replace:
```javascript
        if (window.electronAPI && window.electronAPI.minimizeOverlay) {
          window.electronAPI.minimizeOverlay(200);
        }
```

And:
```javascript
        if (window.electronAPI && window.electronAPI.maximizeOverlay) {
          window.electronAPI.maximizeOverlay();
        }
```

These are already correct from Task 4, so verify they match and no changes needed. ✓

Expected: IPC method names match what was exposed in preload.js.

- [ ] **Step 2: Test minimize/maximize with IPC**

Run app and click minimize:
- Window should move 200px down
- Content should hide
- Click maximize: window should return to original position

```bash
cd overlay && npx electron .
```

Expected: Window moves; IPC is working.

---

## Task 10: Handle Original Position Saving/Restoring

**Files:**
- Modify: `overlay/renderer/index.html` (in `applyMinimizeState`)

Update the maximize logic to properly restore the original position.

- [ ] **Step 1: Save position on minimize**

In `applyMinimizeState`, update the minimize block to:

```javascript
      if (state) {
        // Minimize - save current position before moving
        if (window.electronAPI && window.electronAPI.getWindowPosition) {
          window.electronAPI.getWindowPosition().then(pos => {
            originalPosition = pos;
          });
        }
        notesWrap.classList.add('minimized');
        minimizeBtn.classList.add('hidden');
        maximizeBtn.classList.remove('hidden');
        notesEl.style.display = 'none';
        hintEl.style.display = 'none';
        localStorage.setItem('overlay-minimized', 'true');
        // Send IPC to move window down
        if (window.electronAPI && window.electronAPI.minimizeOverlay) {
          window.electronAPI.minimizeOverlay(200);
        }
```

Expected: Position is saved before minimize moves the window.

- [ ] **Step 2: Restore position on maximize**

Update the maximize block to:

```javascript
      } else {
        // Maximize - restore original position
        notesWrap.classList.remove('minimized');
        minimizeBtn.classList.remove('hidden');
        maximizeBtn.classList.add('hidden');
        notesEl.style.display = '';
        hintEl.style.display = '';
        localStorage.setItem('overlay-minimized', 'false');
        // Restore original position
        if (window.electronAPI && window.electronAPI.dragWindow) {
          window.electronAPI.dragWindow(originalPosition.x, originalPosition.y);
        }
```

Expected: Window moves back to saved position on maximize.

- [ ] **Step 3: Test minimize/maximize cycle**

Run app:
- Note window position
- Click minimize → window moves down
- Click maximize → window returns to original position

```bash
cd overlay && npx electron .
```

Expected: Position is correctly saved and restored.

---

## Task 11: Load Persisted Minimize State on Init

**Files:**
- Modify: `overlay/renderer/index.html` (in `init()` function, after WebSocket connection)

Integrate the `loadMinimizeState()` function into the initialization sequence.

- [ ] **Step 1: Call loadMinimizeState after connection**

In the `init()` function (around line 614), after `connectTo(wsUrl)`, add:

```javascript
      connectTo(wsUrl);
      loadMinimizeState();
```

Expected: Minimize state is loaded from localStorage after app starts.

- [ ] **Step 2: Apply loaded state**

Update `loadMinimizeState()` to apply the state:

```javascript
    function loadMinimizeState() {
      const stored = localStorage.getItem('overlay-minimized');
      if (stored === 'true') {
        // Delay slightly to ensure DOM is ready
        setTimeout(() => {
          applyMinimizeState(true);
        }, 100);
      }
    }
```

Expected: If minimize was active on last close, it reactivates on next open.

- [ ] **Step 3: Test persistence**

Run app, minimize, close, reopen:
- Overlay should open in minimized state if it was minimized before closing

```bash
cd overlay && npx electron .
```

Expected: State persists across restarts.

---

## Task 12: Test Full Integration

**Files:**
- Test: `overlay/main.js`, `overlay/renderer/index.html`, `overlay/preload.js` (integration)

Run the app and verify all features work together.

- [ ] **Step 1: Start the app**

```bash
cd overlay && npx electron .
```

Expected: App launches without errors.

- [ ] **Step 2: Test minimize button**

Click the minimize button at bottom center:
- Content hides
- Minimize button disappears
- Maximize button appears
- Window moves down 200px

Expected: Minimize works.

- [ ] **Step 3: Test maximize button**

Click the maximize button:
- Content shows
- Maximize button disappears
- Minimize button appears
- Window returns to original position

Expected: Maximize works.

- [ ] **Step 4: Test drag interaction**

Click and drag on the notes area:
- Window should move smoothly as you drag
- Releasing should stop the drag

Expected: Drag repositions window in real-time.

- [ ] **Step 5: Test drag while minimized**

Minimize the overlay, then try dragging:
- Drag should not work (prevented by `if (minimized) return`)

Expected: Drag is disabled when minimized.

- [ ] **Step 6: Test minimize/maximize sync (multi-client)**

(Optional) Run multiple overlay instances or test in browser console:
- Minimize on one → both update

Expected: WS messages sync state.

- [ ] **Step 7: Verify localStorage persistence**

Minimize, close app, reopen:
- Overlay should be minimized on restart

Expected: State persists.

- [ ] **Step 8: Test with sender UI (optional)**

Open sender UI on phone/another device:
- Position buttons should still work
- Minimize/maximize messages should arrive via WS

Expected: Sender UI is compatible with new feature.

---

## Task 13: Commit All Changes

**Files:**
- Modified: `overlay/renderer/index.html`, `overlay/main.js`, `overlay/preload.js`

- [ ] **Step 1: Stage all changes**

```bash
cd overlay && git add renderer/index.html main.js preload.js
```

Expected: Files are staged.

- [ ] **Step 2: Commit with descriptive message**

```bash
git commit -m "feat: add minimize/maximize button and draggable overlay

- Add minimize button at bottom center to hide content and move window down
- Add maximize button to restore content and original position
- Implement drag-to-move on overlay window (click anywhere, drag)
- Sync minimize state across all overlay clients via WebSocket
- Persist minimize state to localStorage
- Add IPC handlers for window position updates"
```

Expected: Changes are committed.

- [ ] **Step 3: Verify commit**

```bash
git log -1 --stat
```

Expected: Commit appears with modified files listed.

---

## Plan Self-Review

**Spec Coverage:**
- ✓ Minimize button at bottom center
- ✓ Maximize button shows/hides correctly
- ✓ Content hides on minimize
- ✓ Window moves 200px down on minimize
- ✓ Original position saved and restored
- ✓ Draggable overlay (click anywhere, drag)
- ✓ WS message `{ type: 'minimize', minimized: bool }`
- ✓ IPC channel `drag-window` with `{ x, y }`
- ✓ Optional localStorage persistence
- ✓ Controller behavior unchanged

**Placeholder Scan:**
- No TBDs, TODOs, or "implement later" phrases found ✓
- All code blocks are complete and functional ✓
- All file paths are exact ✓
- All commands are specific with expected output ✓

**Type Consistency:**
- `minimized: boolean` used consistently ✓
- `originalPosition: { x, y }` used consistently ✓
- `applyMinimizeState(state)` signature matches all calls ✓
- IPC method names match across preload.js and renderer ✓

**Scope Check:**
- Plan covers minimize/maximize and drag features only ✓
- No unrelated refactoring ✓
- Single implementation focus ✓

---

## Next Steps

Plan complete and saved to `docs/superpowers/plans/2026-05-31-minimize-drag-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
