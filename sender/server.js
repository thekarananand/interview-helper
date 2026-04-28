const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const path = require('path');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Track connected clients by role
const overlayClients = new Set();
const senderClients  = new Set();

function broadcastOverlayCount() {
  const msg = JSON.stringify({ type: 'overlay_count', count: overlayClients.size });
  for (const client of senderClients) {
    if (client.readyState === 1 /* OPEN */) client.send(msg);
  }
}

wss.on('connection', (ws, req) => {
  const isSender = req.url === '/sender';
  const isOverlay = req.url === '/overlay';

  if (isOverlay) {
    overlayClients.add(ws);
    console.log(`[overlay] connected  (total: ${overlayClients.size})`);
    broadcastOverlayCount();
  } else if (isSender) {
    senderClients.add(ws);
    console.log('[sender] connected');
    // Immediately tell this sender how many overlays are connected
    ws.send(JSON.stringify({ type: 'overlay_count', count: overlayClients.size }));
  }

  ws.on('message', (raw, isBinary) => {
    if (!isSender) return;
    // Fan out to all overlay clients, preserving text/binary frame type
    for (const client of overlayClients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(raw, { binary: isBinary });
      }
    }
  });

  ws.on('close', () => {
    if (isOverlay) {
      overlayClients.delete(ws);
      console.log(`[overlay] disconnected (total: ${overlayClients.size})`);
      broadcastOverlayCount();
    } else if (isSender) {
      senderClients.delete(ws);
      console.log('[sender] disconnected');
    }
  });

  ws.on('error', (err) => {
    console.error('[ws error]', err.message);
    overlayClients.delete(ws);
    senderClients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log('\n=== Stealth Notes — Sender ===');
  console.log(`Sender UI: http://localhost:${PORT}\n`);
  console.log('LAN addresses (use one of these in the overlay):');
  for (const [iface, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  ws://${addr.address}:${PORT}/overlay   (${iface})`);
      }
    }
  }
  console.log('');
});
