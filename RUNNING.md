# Running Stealth Notes

## Sender (Device A)

```bash
cd sender
npm install
npm start
```

Opens on `http://localhost:3000`. Terminal prints LAN WebSocket addresses.

## Overlay (Device B)

```bash
cd overlay
npm install
npx electron .
```

Press **Cmd+Shift+.** to open settings, enter the sender address (e.g. `ws://192.168.1.x:3000/overlay`), click Connect.

## Build a distributable overlay

```bash
cd overlay
npm install --save-dev electron-builder
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
