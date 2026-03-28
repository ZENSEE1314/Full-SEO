"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AgentAction } from "@/types";

const RECONNECT_DELAY_MS = 3000;
const MAX_EVENTS = 100;

interface UseSseOptions {
  clientId?: string;
  initialData?: AgentAction[];
}

interface UseSseReturn {
  events: AgentAction[];
  isConnected: boolean;
  error: string | null;
}

export function useSse({
  clientId,
  initialData = [],
}: UseSseOptions = {}): UseSseReturn {
  const [events, setEvents] = useState<AgentAction[]>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);

    const url = `/api/sse/actions${params.toString() ? `?${params}` : ""}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    es.addEventListener("action", (event) => {
      try {
        const action = JSON.parse(event.data) as AgentAction;
        setEvents((prev) => {
          const isDuplicate = prev.some((e) => e.id === action.id);
          if (isDuplicate) return prev;
          const next = [action, ...prev];
          return next.slice(0, MAX_EVENTS);
        });
      } catch {
        // Malformed event data -- skip silently
      }
    });

    es.addEventListener("heartbeat", () => {
      // Connection alive -- nothing to update
    });

    es.onerror = () => {
      setIsConnected(false);
      setError("Connection lost. Reconnecting...");
      es.close();

      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY_MS);
    };
  }, [clientId]);

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  useEffect(() => {
    if (initialData.length > 0) {
      setEvents((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newFromInitial = initialData.filter(
          (a) => !existingIds.has(a.id),
        );
        if (newFromInitial.length === 0) return prev;
        return [...prev, ...newFromInitial]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, MAX_EVENTS);
      });
    }
  }, [initialData]);

  return { events, isConnected, error };
}
