import { useEffect, useState } from 'react';
import { socialPostService } from '../services/api';

const REALTIME_STATUS_EVENT = 'sportgo:social-realtime-status';
const REALTIME_EVENT = 'sportgo:social-realtime';

function dispatchStatus(connected) {
  window.dispatchEvent(new CustomEvent(REALTIME_STATUS_EVENT, { detail: { connected } }));
}

/** One authenticated socket subscribes this browser to the visible feed posts. */
export function useSocialRealtime(postIds) {
  const idsKey = postIds.slice(0, 50).join(',');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!idsKey || import.meta.env.VITE_SOCIAL_REALTIME_ENABLED !== 'true') {
      const statusTimer = window.setTimeout(() => {
        setConnected(false);
        dispatchStatus(false);
      }, 0);
      return () => window.clearTimeout(statusTimer);
    }

    let active = true;
    let socket = null;
    let reconnectTimer = null;
    let heartbeatTimer = null;
    let reconnectAttempt = 0;

    const updateConnection = (value) => {
      if (!active) return;
      setConnected(value);
      dispatchStatus(value);
    };

    const connect = async () => {
      try {
        const ticketResult = await socialPostService.getRealtimeTicket();
        if (!active || !ticketResult?.enabled || !ticketResult.ticket) {
          updateConnection(false);
          return;
        }

        const apiBase = (import.meta.env.VITE_API_URL || `${window.location.origin}/api`).replace(/\/+$/, '');
        const socketBase = apiBase.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
        socket = new WebSocket(
          `${socketBase}/social/posts/realtime?post_ids=${encodeURIComponent(idsKey)}`,
          ['sportgo.social.v1', ticketResult.ticket],
        );

        socket.onopen = () => {
          reconnectAttempt = 0;
          updateConnection(true);
          heartbeatTimer = window.setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) socket.send('{"type":"ping"}');
          }, 20000);
        };

        socket.onmessage = (message) => {
          try {
            const event = JSON.parse(message.data);
            window.dispatchEvent(new CustomEvent(REALTIME_EVENT, { detail: event }));
          } catch {
            // Ignore malformed event frames; REST sync remains the fallback.
          }
        };

        socket.onerror = () => socket?.close();
        socket.onclose = () => {
          if (heartbeatTimer) window.clearInterval(heartbeatTimer);
          heartbeatTimer = null;
          updateConnection(false);
          if (!active) return;
          const delay = Math.min(1000 * (2 ** reconnectAttempt), 30000);
          reconnectAttempt += 1;
          reconnectTimer = window.setTimeout(connect, delay);
        };
      } catch {
        updateConnection(false);
        if (!active) return;
        const delay = Math.min(1000 * (2 ** reconnectAttempt), 30000);
        reconnectAttempt += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      }
    };

    const resetTimer = window.setTimeout(() => updateConnection(false), 0);
    connect();
    return () => {
      active = false;
      window.clearTimeout(resetTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      dispatchStatus(false);
      socket?.close(1000, 'feed changed');
    };
  }, [idsKey]);

  return connected;
}
