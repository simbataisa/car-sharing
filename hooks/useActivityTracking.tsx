/**
 * React Hooks for Activity Tracking
 * Provides frontend activity tracking capabilities for user interactions
 */

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { ActivityAction, ActivitySeverity } from "@prisma/client";

export interface ActivityTrackingOptions {
  enabled?: boolean;
  trackingLevel?: "minimal" | "standard" | "detailed" | "verbose";
  debounceMs?: number;
  batchSize?: number;
  autoFlush?: boolean;
}

export interface TrackActivityParams {
  action: ActivityAction;
  resource: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  severity?: ActivitySeverity;
  tags?: string[];
}

export interface TrackEventParams {
  event: string;
  category?: "user_action" | "navigation" | "interaction" | "error";
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

// Activity tracking hook
export function useActivityTracking(options: ActivityTrackingOptions = {}) {
  const { data: session } = useSession();
  const config = {
    enabled: options.enabled ?? true,
    trackingLevel: options.trackingLevel || "standard",
    debounceMs: options.debounceMs || 500,
    batchSize: options.batchSize || 10,
    autoFlush: options.autoFlush ?? true,
  };

  const batchRef = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flush batched activities
  const flushBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const batch = [...batchRef.current];
    batchRef.current = [];

    try {
      await fetch("/api/activity/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activities: batch }),
      });
    } catch (error) {
      console.error("Error sending activity batch:", error);
      // Re-add failed activities to batch for retry
      batchRef.current.unshift(...batch);
    }
  }, []);

  // Add activity to batch
  const addToBatch = useCallback(
    (activity: any) => {
      batchRef.current.push(activity);

      // Auto-flush when batch is full
      if (batchRef.current.length >= config.batchSize) {
        flushBatch();
      } else if (config.autoFlush) {
        // Debounced flush
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(flushBatch, config.debounceMs);
      }
    },
    [config.batchSize, config.autoFlush, config.debounceMs, flushBatch]
  );

  // Track activity
  const trackActivity = useCallback(
    async (params: TrackActivityParams) => {
      if (!config.enabled) return;

      const activity = {
        ...params,
        userId: session?.user?.id,
        timestamp: new Date().toISOString(),
        source: "web",
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      };

      // For immediate tracking (high priority events)
      if (params.severity === "ERROR" || params.severity === "CRITICAL") {
        try {
          await fetch("/api/activity/track", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ activities: [activity] }),
          });
        } catch (error) {
          console.error("Error tracking immediate activity:", error);
        }
      } else {
        addToBatch(activity);
      }
    },
    [config.enabled, session?.user?.id, addToBatch]
  );

  // Track custom events
  const trackEvent = useCallback(
    async (params: TrackEventParams) => {
      if (!config.enabled) return;

      const activity = {
        action: "CUSTOM" as ActivityAction,
        resource: "event",
        resourceId: params.event,
        description: `${params.category || "event"}: ${params.event}`,
        metadata: {
          ...params.metadata,
          category: params.category,
          label: params.label,
          value: params.value,
        },
        severity: "INFO" as ActivitySeverity,
        tags: ["event", params.category || "general"],
      };

      await trackActivity(activity);
    },
    [config.enabled, trackActivity]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (batchRef.current.length > 0) {
        flushBatch();
      }
    };
  }, [flushBatch]);

  return {
    trackActivity,
    trackEvent,
    flushBatch,
    isEnabled: config.enabled,
  };
}

// Hook for tracking page views
export function usePageViewTracking() {
  const { trackActivity } = useActivityTracking();

  useEffect(() => {
    const trackPageView = () => {
      trackActivity({
        action: "READ",
        resource: "page",
        resourceId: window.location.pathname,
        description: `Page view: ${document.title}`,
        metadata: {
          title: document.title,
          url: window.location.href,
          referrer: document.referrer,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
        severity: "DEBUG",
        tags: ["page-view"],
      });
    };

    // Track initial page view
    trackPageView();

    // Track navigation changes (for SPA)
    const handlePopState = () => trackPageView();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [trackActivity]);
}

// Hook for tracking form interactions
export function useFormTracking(formName: string) {
  const { trackEvent } = useActivityTracking();

  const trackFormStart = useCallback(() => {
    trackEvent({
      event: "form_start",
      category: "interaction",
      label: formName,
      metadata: { formName },
    });
  }, [trackEvent, formName]);

  const trackFormSubmit = useCallback(
    (success: boolean, errors?: string[]) => {
      trackEvent({
        event: "form_submit",
        category: "interaction",
        label: formName,
        value: success ? 1 : 0,
        metadata: {
          formName,
          success,
          errors,
        },
      });
    },
    [trackEvent, formName]
  );

  const trackFormError = useCallback(
    (field: string, error: string) => {
      trackEvent({
        event: "form_error",
        category: "error",
        label: formName,
        metadata: {
          formName,
          field,
          error,
        },
      });
    },
    [trackEvent, formName]
  );

  const trackFieldFocus = useCallback(
    (field: string) => {
      trackEvent({
        event: "field_focus",
        category: "interaction",
        label: `${formName}.${field}`,
        metadata: {
          formName,
          field,
        },
      });
    },
    [trackEvent, formName]
  );

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormError,
    trackFieldFocus,
  };
}

// Hook for tracking button clicks
export function useClickTracking() {
  const { trackEvent } = useActivityTracking();

  const trackClick = useCallback(
    (
      element: string,
      category: "navigation" | "action" | "interaction" = "interaction",
      metadata?: Record<string, any>
    ) => {
      trackEvent({
        event: "click",
        category,
        label: element,
        metadata: {
          element,
          ...metadata,
        },
      });
    },
    [trackEvent]
  );

  return { trackClick };
}

// Hook for tracking search and filters
export function useSearchTracking() {
  const { trackEvent } = useActivityTracking();

  const trackSearch = useCallback(
    (query: string, results: number, filters?: Record<string, any>) => {
      trackEvent({
        event: "search",
        category: "user_action",
        label: "search_query",
        value: results,
        metadata: {
          query,
          results,
          filters,
        },
      });
    },
    [trackEvent]
  );

  const trackFilter = useCallback(
    (filterType: string, filterValue: any, results: number) => {
      trackEvent({
        event: "filter",
        category: "user_action",
        label: filterType,
        value: results,
        metadata: {
          filterType,
          filterValue,
          results,
        },
      });
    },
    [trackEvent]
  );

  return { trackSearch, trackFilter };
}

// Hook for tracking errors
export function useErrorTracking() {
  const { trackActivity } = useActivityTracking();

  const trackError = useCallback(
    (
      error: Error | string,
      context?: string,
      metadata?: Record<string, any>
    ) => {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;

      trackActivity({
        action: "SYSTEM_ERROR",
        resource: "error",
        resourceId: context || "unknown",
        description: `Error: ${errorMessage}`,
        metadata: {
          message: errorMessage,
          stack: errorStack,
          context,
          url: window.location.href,
          ...metadata,
        },
        severity: "ERROR",
        tags: ["error", "frontend"],
      });
    },
    [trackActivity]
  );

  const trackApiError = useCallback(
    (
      endpoint: string,
      status: number,
      error: any,
      metadata?: Record<string, any>
    ) => {
      trackActivity({
        action: "SYSTEM_ERROR",
        resource: "api",
        resourceId: endpoint,
        description: `API Error: ${endpoint} (${status})`,
        metadata: {
          endpoint,
          status,
          error: error.message || error,
          ...metadata,
        },
        severity: status >= 500 ? "ERROR" : "WARN",
        tags: ["api-error", "frontend"],
      });
    },
    [trackActivity]
  );

  return { trackError, trackApiError };
}

// Hook for tracking performance metrics
export function usePerformanceTracking() {
  const { trackEvent } = useActivityTracking();

  useEffect(() => {
    const trackPerformance = () => {
      if ("performance" in window && "getEntriesByType" in performance) {
        const navigation = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;

        if (navigation) {
          trackEvent({
            event: "page_performance",
            category: "performance",
            label: "page_load",
            value: Math.round(navigation.loadEventEnd - navigation.fetchStart),
            metadata: {
              domContentLoaded: Math.round(
                navigation.domContentLoadedEventEnd - navigation.fetchStart
              ),
              firstContentfulPaint: Math.round(
                navigation.loadEventEnd - navigation.fetchStart
              ),
              pageLoadTime: Math.round(
                navigation.loadEventEnd - navigation.fetchStart
              ),
              dnsTime: Math.round(
                navigation.domainLookupEnd - navigation.domainLookupStart
              ),
              connectTime: Math.round(
                navigation.connectEnd - navigation.connectStart
              ),
              serverTime: Math.round(
                navigation.responseEnd - navigation.requestStart
              ),
              downloadTime: Math.round(
                navigation.responseEnd - navigation.responseStart
              ),
            },
          });
        }
      }
    };

    // Track performance after page load
    if (document.readyState === "complete") {
      trackPerformance();
    } else {
      window.addEventListener("load", trackPerformance);
      return () => window.removeEventListener("load", trackPerformance);
    }
  }, [trackEvent]);
}

// Activity tracking provider context
import { createContext, useContext, ReactNode } from "react";

interface ActivityTrackingContextType {
  trackActivity: (params: TrackActivityParams) => Promise<void>;
  trackEvent: (params: TrackEventParams) => Promise<void>;
  isEnabled: boolean;
}

const ActivityTrackingContext =
  createContext<ActivityTrackingContextType | null>(null);

export function ActivityTrackingProvider({
  children,
  options = {},
}: {
  children: ReactNode;
  options?: ActivityTrackingOptions;
}) {
  const tracking = useActivityTracking(options);

  return (
    <ActivityTrackingContext.Provider value={tracking}>
      {children}
    </ActivityTrackingContext.Provider>
  );
}

export function useActivityTrackingContext() {
  const context = useContext(ActivityTrackingContext);
  if (!context) {
    throw new Error(
      "useActivityTrackingContext must be used within ActivityTrackingProvider"
    );
  }
  return context;
}
