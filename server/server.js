const http = require('http');
const WebSocket = require('ws');

const PORT = 3571;
const HOST = '127.0.0.1';              // loopback only — not reachable from the LAN
const MAX_BODY = 50 * 1024 * 1024;     // 50 MB — base64 image fills can be large

let pluginSocket = null;
const pending = new Map();
let reqId = 0;

// curl and native clients send no Origin header; browsers always do. Allow
// no-origin and localhost, reject anything that looks like a real website —
// this stops a malicious page you have open in a browser from driving the bridge.
function isLocalOrigin(origin) {
  if (!origin || origin === 'null') return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;

  if (origin && !isLocalOrigin(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden origin' }));
    return;
  }

  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({ connected: pluginSocket?.readyState === WebSocket.OPEN }));
    return;
  }

  if (req.method === 'POST' && req.url === '/command') {
    if (!pluginSocket || pluginSocket.readyState !== WebSocket.OPEN) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Figma plugin not connected' }));
      return;
    }

    let body = '';
    let aborted = false;
    req.on('data', chunk => {
      if (aborted) return;
      body += chunk;
      if (body.length > MAX_BODY) {
        aborted = true;
        res.writeHead(413);
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) return;
      let command;
      try {
        command = JSON.parse(body);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const id = ++reqId;
      command.id = id;

      const timeout = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          res.writeHead(504);
          res.end(JSON.stringify({ error: 'Timeout — no response from plugin' }));
        }
      }, 15000);

      pending.set(id, { res, timeout });

      // If the HTTP client disconnects before the plugin replies, drop the pending
      // entry so the late response isn't written to a dead socket — which otherwise
      // left a stale entry that could desync a later request's response.
      res.on('close', () => {
        const entry = pending.get(id);
        if (entry) {
          clearTimeout(entry.timeout);
          pending.delete(id);
        }
      });

      pluginSocket.send(JSON.stringify(command));
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// The Figma plugin UI runs in a sandboxed iframe and connects with Origin 'null'
// (or a figma.com origin). Reject WebSocket upgrades from real websites so an
// open browser tab can't hijack the plugin channel and intercept commands.
function isAllowedWsOrigin(origin) {
  if (isLocalOrigin(origin)) return true;
  try {
    return /(^|\.)figma\.com$/i.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

const wss = new WebSocket.Server({
  server,
  verifyClient: ({ origin }, done) => {
    if (isAllowedWsOrigin(origin)) return done(true);
    console.warn('✗ Rejected WebSocket from origin:', origin);
    done(false, 403, 'Forbidden origin');
  },
});

wss.on('connection', (ws) => {
  pluginSocket = ws;
  console.log('✓ Figma plugin connected');

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    const entry = pending.get(msg.id);
    if (entry) {
      clearTimeout(entry.timeout);
      pending.delete(msg.id);
      // Guard against a response arriving in the same tick the client disconnected.
      if (!entry.res.writableEnded && !entry.res.destroyed) {
        entry.res.writeHead(200);
        entry.res.end(JSON.stringify(msg.result));
      }
    }
  });

  ws.on('close', () => {
    if (pluginSocket === ws) pluginSocket = null;  // don't null out a newer connection
    console.log('✗ Figma plugin disconnected');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Claude Bridge server running on http://${HOST}:${PORT}`);
  console.log('Waiting for Figma plugin connection...');
});
