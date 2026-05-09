import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = `ws://${window.location.hostname}:3000/ws`;

/**
 * WebSocket hook with auto-reconnect and message dispatch.
 */
export default function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const listenersRef = useRef(new Map()); // type → Set<callback>

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { data = event.data; }
        setLastMessage(data);

        const type = data?.type || "message";
        const cbs = listenersRef.current.get(type);
        if (cbs) cbs.forEach((fn) => fn(data));
        const allCbs = listenersRef.current.get("*");
        if (allCbs) allCbs.forEach((fn) => fn(data));
      };

      ws.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      scheduleReconnect();
    }
  }, []);

  const scheduleReconnect = () => {
    if (reconnectTimer.current) return;
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, 5000);
  };

  const subscribe = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);
    return () => {
      listenersRef.current.get(type)?.delete(callback);
    };
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  return { connected, lastMessage, subscribe, send };
}
