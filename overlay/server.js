'use strict';

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

/**
 * Start the HTTP + WebSocket server.
 * @param {number} [port]  Defaults to process.env.PORT || 3000
 * @returns {Promise<{ port: number, server: http.Server, wss: WebSocketServer }>}
 */
function startServer(port) {
  port = port || parseInt(process.env.PORT, 10) || 3000;

  const app    = express();
  const server = http.createServer(app);
  const wss    = new WebSocketServer({ server });

  // Serve the sender UI for external browser clients
  app.use(express.static(path.join(__dirname, 'public')));

  const overlayClients = new Set();
  const senderClients  = new Set();

  function broadcastOverlayCount() {
    const msg = JSON.stringify({ type: 'overlay_count', count: overlayClients.size });
    for (const c of senderClients) if (c.readyState === 1) c.send(msg);
  }

  function broadcastSenderCount() {
    const msg = JSON.stringify({ type: 'sender_count', count: senderClients.size });
    for (const c of overlayClients) if (c.readyState === 1) c.send(msg);
  }

  wss.on('connection', (ws, req) => {
    const isSender  = req.url === '/sender';
    const isOverlay = req.url === '/overlay';

    if (isOverlay) {
      overlayClients.add(ws);
      broadcastOverlayCount();
      ws.send(JSON.stringify({ type: 'sender_count', count: senderClients.size }));
    } else if (isSender) {
      senderClients.add(ws);
      ws.send(JSON.stringify({ type: 'overlay_count', count: overlayClients.size }));
      broadcastSenderCount();
    }

    ws.on('message', (raw, isBinary) => {
      if (!isSender) return;
      for (const c of overlayClients) if (c.readyState === 1) c.send(raw, { binary: isBinary });
    });

    ws.on('close', () => {
      if (isOverlay) { overlayClients.delete(ws); broadcastOverlayCount(); }
      else if (isSender) { senderClients.delete(ws); broadcastSenderCount(); }
    });

    ws.on('error', (err) => {
      console.error('[ws]', err.message);
      overlayClients.delete(ws);
      senderClients.delete(ws);
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, () => {
      console.log(`[server] listening on :${port}`);
      resolve({ port, server, wss });
    });
  });
}

module.exports = { startServer };
