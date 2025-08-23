/**
 * Page Tracking Higher-Order Component
 * Automatically tracks page views and user interactions
 */

"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useActivityTrackingContext,
  usePageViewTracking,
  usePerformanceTracking,
} from "@/hooks/useActivityTracking";

interface WithPageTrackingProps {
  pageName?: string;
  trackPerformance?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Higher-order component for page tracking
 */
export function withPageTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithPageTrackingProps = {}
) {
  const TrackedComponent = (props: P) => {
    const pathname = usePathname();
    const { trackActivity } = useActivityTrackingContext();

    // Use page view tracking hook
    usePageViewTracking();

    // Use performance tracking if enabled
    if (options.trackPerformance) {
      usePerformanceTracking();
    }

    // Track page-specific events
    useEffect(() => {
      if (options.pageName) {
        trackActivity({
          action: "READ",
          resource: "page",
          resourceId: pathname,
          description: `Accessed page: ${options.pageName}`,
          metadata: {
            pageName: options.pageName,
            ...options.metadata,
          },
          severity: "DEBUG",
          tags: ["page-access", "navigation"],
        });
      }
    }, [pathname, trackActivity]);

    return <WrappedComponent {...props} />;
  };

  TrackedComponent.displayName = `withPageTracking(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return TrackedComponent;
}

/**
 * Hook for tracking user interactions
 */
export function useInteractionTracking() {
  const { trackEvent } = useActivityTrackingContext();

  const trackButtonClick = (
    buttonName: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent({
      event: "button_click",
      category: "interaction",
      label: buttonName,
      metadata,
    });
  };

  const trackLinkClick = (href: string, linkText?: string) => {
    trackEvent({
      event: "link_click",
      category: "navigation",
      label: href,
      metadata: {
        href,
        linkText,
      },
    });
  };

  const trackModalOpen = (modalName: string) => {
    trackEvent({
      event: "modal_open",
      category: "interaction",
      label: modalName,
    });
  };

  const trackModalClose = (modalName: string, timeOpen?: number) => {
    trackEvent({
      event: "modal_close",
      category: "interaction",
      label: modalName,
      value: timeOpen,
    });
  };

  const trackTabChange = (fromTab: string, toTab: string) => {
    trackEvent({
      event: "tab_change",
      category: "navigation",
      label: `${fromTab} -> ${toTab}`,
      metadata: {
        fromTab,
        toTab,
      },
    });
  };

  return {
    trackButtonClick,
    trackLinkClick,
    trackModalOpen,
    trackModalClose,
    trackTabChange,
  };
}

/**
 * Hook for tracking business events
 */
export function useBusinessEventTracking() {
  const { trackActivity } = useActivityTrackingContext();

  const trackCarView = (carId: number, carDetails?: any) => {
    trackActivity({
      action: "READ",
      resource: "car",
      resourceId: carId.toString(),
      description: `Viewed car details`,
      metadata: carDetails,
      severity: "INFO",
      tags: ["car-view", "business"],
    });
  };

  const trackBookingAttempt = (
    carId: number,
    startDate: string,
    endDate: string
  ) => {
    trackActivity({
      action: "BOOK",
      resource: "booking",
      resourceId: carId.toString(),
      description: `Attempted to book car ${carId}`,
      metadata: {
        carId,
        startDate,
        endDate,
        status: "attempted",
      },
      severity: "INFO",
      tags: ["booking-attempt", "business"],
    });
  };

  const trackBookingSuccess = (
    bookingId: string,
    carId: number,
    totalPrice: number
  ) => {
    trackActivity({
      action: "BOOK",
      resource: "booking",
      resourceId: bookingId,
      description: `Successfully booked car ${carId}`,
      metadata: {
        bookingId,
        carId,
        totalPrice,
        status: "completed",
      },
      severity: "INFO",
      tags: ["booking-success", "business", "conversion"],
    });
  };

  const trackSearchQuery = (
    query: string,
    filters: any,
    resultCount: number
  ) => {
    trackActivity({
      action: "SEARCH",
      resource: "car",
      description: `Searched for cars: \"${query}\"`,
      metadata: {
        query,
        filters,
        resultCount,
      },
      severity: "DEBUG",
      tags: ["search", "business"],
    });
  };

  const trackFilterApply = (
    filterType: string,
    filterValue: any,
    resultCount: number
  ) => {
    trackActivity({
      action: "FILTER",
      resource: "car",
      description: `Applied filter: ${filterType}`,
      metadata: {
        filterType,
        filterValue,
        resultCount,
      },
      severity: "DEBUG",
      tags: ["filter", "business"],
    });
  };

  return {
    trackCarView,
    trackBookingAttempt,
    trackBookingSuccess,
    trackSearchQuery,
    trackFilterApply,
  };
}

/**
 * Component for tracking scroll depth
 */
export function ScrollDepthTracker({
  children,
}: {
  children: React.ReactNode;
}) {
  const { trackEvent } = useActivityTrackingContext();

  useEffect(() => {
    let maxScrollDepth = 0;
    const thresholds = [25, 50, 75, 90, 100];
    const trackedThresholds = new Set<number>();

    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent;

        // Track threshold milestones
        thresholds.forEach((threshold) => {
          if (scrollPercent >= threshold && !trackedThresholds.has(threshold)) {
            trackedThresholds.add(threshold);
            trackEvent({
              event: "scroll_depth",
              category: "interaction",
              label: `${threshold}%`,
              value: threshold,
              metadata: {
                url: window.location.href,
                scrollPercent: threshold,
              },
            });
          }
        });
      }
    };

    const throttledScroll = throttle(handleScroll, 500);
    window.addEventListener("scroll", throttledScroll);

    return () => {
      window.removeEventListener("scroll", throttledScroll);

      // Track final scroll depth on unmount
      if (maxScrollDepth > 0) {
        trackEvent({
          event: "page_scroll_complete",
          category: "interaction",
          label: "final_depth",
          value: maxScrollDepth,
          metadata: {
            url: window.location.href,
            maxScrollDepth,
          },
        });
      }
    };
  }, [trackEvent]);

  return <>{children}</>;
}

/**
 * Component for tracking time on page
 */
export function TimeOnPageTracker({ children }: { children: React.ReactNode }) {
  const { trackEvent } = useActivityTrackingContext();

  useEffect(() => {
    const startTime = Date.now();
    const intervals = [30, 60, 180, 300]; // 30s, 1m, 3m, 5m
    const trackedIntervals = new Set<number>();

    const trackTimeInterval = () => {
      const timeOnPage = Math.floor((Date.now() - startTime) / 1000);

      intervals.forEach((interval) => {
        if (timeOnPage >= interval && !trackedIntervals.has(interval)) {
          trackedIntervals.add(interval);
          trackEvent({
            event: "time_on_page",
            category: "engagement",
            label: `${interval}s`,
            value: interval,
            metadata: {
              url: window.location.href,
              timeOnPage: interval,
            },
          });
        }
      });
    };

    const intervalId = setInterval(trackTimeInterval, 10000); // Check every 10s

    return () => {
      clearInterval(intervalId);

      // Track final time on page
      const finalTime = Math.floor((Date.now() - startTime) / 1000);
      if (finalTime > 5) {
        // Only track if more than 5 seconds
        trackEvent({
          event: "page_exit",
          category: "engagement",
          label: "time_on_page",
          value: finalTime,
          metadata: {
            url: window.location.href,
            timeOnPage: finalTime,
          },
        });
      }
    };
  }, [trackEvent]);

  return <>{children}</>;
}

// Utility function for throttling
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
