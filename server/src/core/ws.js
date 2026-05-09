import logger from "../utils/logger.js";

const clients = new Set();

/**
 * Broadcast a JSON message to all connected WebSocket clients.
 */
export function broadcast(type, payload) {
  const msg = JSON.stringify({ type, ...payload, ts: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

/**
 * Handle a new WebSocket connection.
 */
export function handleConnection(ws) {
  clients.add(ws);
  logger.info({ total: clients.size }, "WebSocket client connected");

  ws.on("close", () => {
    clients.delete(ws);
    logger.info({ total: clients.size }, "WebSocket client disconnected");
  });

  ws.on("error", (err) => {
    logger.warn({ error: err.message }, "WebSocket error");
    clients.delete(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: "connected", total: clients.size }));
}

/**
 * Get current connection count.
 */
export function getClientCount() {
  return clients.size;
}
