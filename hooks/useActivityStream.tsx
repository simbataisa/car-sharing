/**
 * Real-time Activity Stream Hook
 * Provides real-time activity updates using Server-Sent Events (SSE)
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ActivityAction, ActivitySeverity } from "@prisma/client";

export interface ActivityStreamMessage {
  type: "connection" | "activity" | "notification" | "heartbeat" | "system";
  data: {
    id?: string;
    timestamp: string;
    message?: string;
    activeConnections?: number;
    // Activity-specific data
    userId?: string;
    action?: ActivityAction;
    resource?: string;
    resourceId?: string;
    description?: string;
    severity?: ActivitySeverity;
    tags?: string[];
    correlationId?: string;
    metadata?: Record<string, any>;
    // Notification-specific data
    sentBy?: string;
    // System-specific data
    reason?: string;
  };
}

export interface ActivityStreamFilters {
  severity?: ActivitySeverity[];
  actions?: ActivityAction[];
  resources?: string[];
  userIds?: string[];
}

export interface ActivityStreamOptions {
  filters?: ActivityStreamFilters;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onError?: (error: Error) => void;
  onMessage?: (message: ActivityStreamMessage) => void;
  onConnectionChange?: (connected: boolean, activeConnections?: number) => void;
}

export interface ActivityStreamState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  messages: ActivityStreamMessage[];
  lastMessage: ActivityStreamMessage | null;
  activeConnections: number;
  connectionId: string | null;
  reconnectAttempts: number;
}

export function useActivityStream(options: ActivityStreamOptions = {}) {
  const {
    filters,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 5000,
    onError,
    onMessage,
    onConnectionChange,
  } = options;

  const [state, setState] = useState<ActivityStreamState>({
    connected: false,
    connecting: false,
    error: null,
    messages: [],
    lastMessage: null,
    activeConnections: 0,
    connectionId: null,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

  // Build query string from filters
  const buildQueryString = useCallback(() => {
    if (!filters) return "";

    const params = new URLSearchParams();

    if (filters.severity?.length) {
      params.append("severity", filters.severity.join(","));
    }
    if (filters.actions?.length) {
      params.append("actions", filters.actions.join(","));
    }
    if (filters.resources?.length) {
      params.append("resources", filters.resources.join(","));
    }
    if (filters.userIds?.length) {
      params.append("userIds", filters.userIds.join(","));
    }

    return params.toString() ? `?${params.toString()}` : "";
  }, [filters]);

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const queryString = buildQueryString();
      const eventSource = new EventSource(`/api/activity/live${queryString}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;

        reconnectAttemptsRef.current = 0;
        setState((prev) => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempts: 0,
        }));

        onConnectionChange?.(true);
      };

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const message: ActivityStreamMessage = JSON.parse(event.data);

          setState((prev) => {
            const newMessages = [...prev.messages, message].slice(-100); // Keep last 100 messages

            return {
              ...prev,
              messages: newMessages,
              lastMessage: message,
              activeConnections:
                message.data.activeConnections || prev.activeConnections,
              connectionId:
                message.type === "connection"
                  ? message.data.id || null
                  : prev.connectionId,
            };
          });

          onMessage?.(message);

          // Update connection info for heartbeat messages
          if (message.type === "heartbeat") {
            onConnectionChange?.(true, message.data.activeConnections);
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };

      eventSource.onerror = (event) => {
        if (!mountedRef.current) return;

        const error = new Error("SSE connection error");

        setState((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
          error: error.message,
        }));

        onConnectionChange?.(false);
        onError?.(error);

        // Auto-reconnect if enabled
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setState((prev) => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectDelay);
        }
      };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : "Failed to connect",
      }));

      onError?.(
        error instanceof Error ? error : new Error("Failed to connect")
      );
    }
  }, [
    buildQueryString,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    onError,
    onMessage,
    onConnectionChange,
  ]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
      connectionId: null,
    }));

    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Manually reconnect
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setState((prev) => ({ ...prev, reconnectAttempts: 0 }));
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [], lastMessage: null }));
  }, []);

  // Send notification (admin only)
  const sendNotification = useCallback(
    async (notification: {
      type: string;
      message: string;
      data?: any;
      targetUsers?: string[];
    }) => {
      try {
        const response = await fetch("/api/activity/live", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(notification),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to send notification: ${response.statusText}`
          );
        }

        return await response.json();
      } catch (error) {
        console.error("Error sending notification:", error);
        throw error;
      }
    },
    []
  );

  // Connect on mount and when filters change
  useEffect(() => {
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [buildQueryString]); // Only depend on buildQueryString which depends on filters

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array for cleanup only

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
    clearMessages,
    sendNotification,
  };
}

// Specialized hooks for common use cases

// Hook for admin dashboard real-time updates
export function useAdminActivityStream(filters?: ActivityStreamFilters) {
  const [notifications, setNotifications] = useState<ActivityStreamMessage[]>(
    []
  );
  const [criticalAlerts, setCriticalAlerts] = useState<ActivityStreamMessage[]>(
    []
  );

  const stream = useActivityStream({
    filters,
    onMessage: (message) => {
      // Collect notifications
      if (message.type === "notification") {
        setNotifications((prev) => [...prev, message].slice(-20)); // Keep last 20 notifications
      }

      // Collect critical alerts
      if (message.type === "activity" && message.data.severity === "CRITICAL") {
        setCriticalAlerts((prev) => [...prev, message].slice(-10)); // Keep last 10 critical alerts
      }
    },
  });

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearCriticalAlerts = useCallback(() => {
    setCriticalAlerts([]);
  }, []);

  return {
    ...stream,
    notifications,
    criticalAlerts,
    clearNotifications,
    clearCriticalAlerts,
  };
}

// Hook for error monitoring
export function useErrorStream() {
  const [errorEvents, setErrorEvents] = useState<ActivityStreamMessage[]>([]);

  const stream = useActivityStream({
    filters: {
      severity: ["ERROR", "CRITICAL"],
    },
    onMessage: (message) => {
      if (
        message.type === "activity" &&
        (message.data.severity === "ERROR" ||
          message.data.severity === "CRITICAL")
      ) {
        setErrorEvents((prev) => [...prev, message].slice(-50)); // Keep last 50 errors
      }
    },
  });

  const clearErrors = useCallback(() => {
    setErrorEvents([]);
  }, []);

  return {
    ...stream,
    errorEvents,
    clearErrors,
  };
}

// Hook for user activity monitoring
export function useUserActivityStream(userIds?: string[]) {
  const [userActivities, setUserActivities] = useState<ActivityStreamMessage[]>(
    []
  );

  const stream = useActivityStream({
    filters: {
      userIds,
    },
    onMessage: (message) => {
      if (message.type === "activity") {
        setUserActivities((prev) => [...prev, message].slice(-100)); // Keep last 100 activities
      }
    },
  });

  const clearActivities = useCallback(() => {
    setUserActivities([]);
  }, []);

  return {
    ...stream,
    userActivities,
    clearActivities,
  };
}
