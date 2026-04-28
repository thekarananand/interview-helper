# Running Stealth Notes

## Start

```bash
cd overlay
npm install
npx electron .
```

The overlay window appears immediately on screen — transparent, always-on-top, hidden from screen capture.

## Connect a sender device

1. Press **Cmd/Ctrl+Shift+.** on the overlay machine to open settings
2. Scan the QR code with your phone (or open the displayed URL in any browser on the same network)
3. The mobile sender UI opens — start typing and notes appear on the overlay in real time
4. Settings close automatically the moment you start typing

## Sender UI controls

| Control | Action |
|---|---|
| **clear** | Clear the overlay |
| **↖ ↗ ↙ ↘** | Move overlay to a corner |
| **▲ ▼** | Scroll overlay content up/down |

## Change the port

```bash
PORT=4000 npx electron .
```

## Build a distributable

```bash
cd overlay
npx electron-builder --mac        # macOS .dmg
npx electron-builder --win        # Windows .exe
```

Add to `overlay/package.json` before building:

```json
"build": {
  "appId": "com.stealthnotes.overlay",
  "productName": "Stealth Notes",
  "mac": { "target": "dmg" },
  "win": { "target": "nsis" }
}
```
