/**
 * Activity Tracking Middleware
 * Automatically tracks API requests and user actions in Next.js
 */

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActivityTracker } from "./activity-tracker";
import { ActivityEventFactory } from "./events/factory";
import { EventContext } from "./events/types";

export interface TrackingMiddlewareConfig {
  enableApiTracking: boolean;
  enablePageTracking: boolean;
  enableErrorTracking: boolean;
  excludePatterns: string[];
  trackingLevel: "minimal" | "standard" | "detailed" | "verbose";
  maxRequestSize: number;
  maxResponseSize: number;
}

const defaultConfig: TrackingMiddlewareConfig = {
  enableApiTracking: true,
  enablePageTracking: true,
  enableErrorTracking: true,
  excludePatterns: [
    "/api/health",
    "/favicon.ico",
    "/robots.txt",
    "/_next",
    "/api/activity", // Avoid recursive tracking
  ],
  trackingLevel: "standard",
  maxRequestSize: 10000, // 10KB
  maxResponseSize: 10000, // 10KB
};

export class ActivityTrackingMiddleware {
  private config: TrackingMiddlewareConfig;
  private tracker = getActivityTracker();

  constructor(config: Partial<TrackingMiddlewareConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Next.js middleware function
   */
  async middleware(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const response = NextResponse.next();

    // Skip if path should be excluded
    if (this.shouldExclude(request.nextUrl.pathname)) {
      return response;
    }

    try {
      // Get user context
      const token = await getToken({ req: request });
      const context = this.createContext(request, token);

      // Track API requests
      if (
        request.nextUrl.pathname.startsWith("/api") &&
        this.config.enableApiTracking
      ) {
        await this.trackApiRequest(request, response, context, startTime);
      }

      // Track page views
      if (
        !request.nextUrl.pathname.startsWith("/api") &&
        this.config.enablePageTracking
      ) {
        await this.trackPageView(request, context);
      }
    } catch (error) {
      console.error("Error in activity tracking middleware:", error);

      if (this.config.enableErrorTracking) {
        await this.trackError(error, request);
      }
    }

    return response;
  }

  /**
   * API route wrapper for automatic tracking
   */
  withApiTracking<T = any>(handler: (req: any, res: any) => Promise<T> | T) {
    return async (req: any, res: any): Promise<T> => {
      const startTime = Date.now();

      try {
        // Create context
        const context = await this.createApiContext(req);

        // Execute the handler
        const result = await handler(req, res);

        // Track successful API call
        await this.trackApiSuccess(req, res, context, startTime);

        return result;
      } catch (error) {
        // Track API error
        await this.trackApiError(req, res, error, startTime);
        throw error;
      }
    };
  }

  /**
   * React component wrapper for page tracking
   */
  withPageTracking<P = {}>(
    Component: React.ComponentType<P>,
    pageName?: string
  ) {
    return function TrackedComponent(props: P) {
      React.useEffect(() => {
        const trackPageView = async () => {
          try {
            const context: EventContext = {
              timestamp: new Date(),
              source: "web",
              correlationId:
                crypto.randomUUID?.() || Math.random().toString(36),
            };

            await getActivityTracker().trackPageView(
              pageName || window.location.pathname,
              context,
              {
                title: document.title,
                referrer: document.referrer,
                metadata: {
                  userAgent: navigator.userAgent,
                  viewport: `${window.innerWidth}x${window.innerHeight}`,
                },
              }
            );
          } catch (error) {
            console.error("Error tracking page view:", error);
          }
        };

        trackPageView();
      }, []);

      return React.createElement(Component, props);
    };
  }

  /**
   * Track API requests in middleware
   */
  private async trackApiRequest(
    request: NextRequest,
    response: NextResponse,
    context: EventContext,
    startTime: number
  ): Promise<void> {
    const duration = Date.now() - startTime;
    const method = request.method;
    const endpoint = request.nextUrl.pathname;

    // Get request data (limited size)
    let requestData: any = null;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      try {
        const body = await request.clone().text();
        if (body && body.length <= this.config.maxRequestSize) {
          requestData = JSON.parse(body);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    await this.tracker.trackApiRequest(method, endpoint, context, {
      requestData: this.sanitizeData(requestData),
      duration,
      metadata: {
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        contentType: request.headers.get("content-type"),
      },
    });
  }

  /**
   * Track page views in middleware
   */
  private async trackPageView(
    request: NextRequest,
    context: EventContext
  ): Promise<void> {
    const path = request.nextUrl.pathname;
    const searchParams = request.nextUrl.searchParams.toString();

    await this.tracker.trackPageView(
      path + (searchParams ? `?${searchParams}` : ""),
      context,
      {
        referrer: request.headers.get("referer") || undefined,
        metadata: {
          userAgent: request.headers.get("user-agent"),
          searchParams: Object.fromEntries(request.nextUrl.searchParams),
        },
      }
    );
  }

  /**
   * Track API success in wrapper
   */
  private async trackApiSuccess(
    req: any,
    res: any,
    context: EventContext,
    startTime: number
  ): Promise<void> {
    const duration = Date.now() - startTime;

    await this.tracker.trackApiRequest(
      req.method,
      req.url || req.originalUrl,
      context,
      {
        statusCode: res.statusCode,
        duration,
        metadata: {
          success: true,
        },
      }
    );
  }

  /**
   * Track API errors
   */
  private async trackApiError(
    req: any,
    res: any,
    error: any,
    startTime: number
  ): Promise<void> {
    const duration = Date.now() - startTime;

    try {
      const context = await this.createApiContext(req);

      await this.tracker.trackSystem("system.error", "ERROR", context, {
        component: "api",
        errorDetails: {
          message: error.message || String(error),
          stack: error.stack,
          code: error.code || "API_ERROR",
        },
        metadata: {
          method: req.method,
          url: req.url || req.originalUrl,
          duration,
        },
      });
    } catch (trackingError) {
      console.error("Error tracking API error:", trackingError);
    }
  }

  /**
   * Track general errors
   */
  private async trackError(error: any, request: NextRequest): Promise<void> {
    try {
      const context: EventContext = {
        timestamp: new Date(),
        source: "system",
        correlationId: crypto.randomUUID?.() || Math.random().toString(36),
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get("user-agent") || undefined,
      };

      await this.tracker.trackSystem("system.error", "ERROR", context, {
        component: "middleware",
        errorDetails: {
          message: error.message || String(error),
          stack: error.stack,
          code: "MIDDLEWARE_ERROR",
        },
        metadata: {
          path: request.nextUrl.pathname,
          method: request.method,
        },
      });
    } catch (trackingError) {
      console.error("Error tracking middleware error:", trackingError);
    }
  }

  /**
   * Create context for middleware
   */
  private createContext(request: NextRequest, token: any): EventContext {
    return {
      userId: token?.sub,
      timestamp: new Date(),
      source: "web",
      correlationId: crypto.randomUUID?.() || Math.random().toString(36),
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get("user-agent") || undefined,
      referer: request.headers.get("referer") || undefined,
    };
  }

  /**
   * Create context for API routes
   */
  private async createApiContext(req: any): Promise<EventContext> {
    // Try to get user from session or token
    let userId: string | undefined;

    try {
      // For Next.js API routes with NextAuth
      const token = await getToken({ req });
      userId = token?.sub;
    } catch (error) {
      // Fallback: try to get from request object if available
      userId = req.user?.id || req.userId;
    }

    return {
      userId,
      timestamp: new Date(),
      source: "api",
      correlationId: crypto.randomUUID?.() || Math.random().toString(36),
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.["user-agent"],
      referer: req.headers?.["referer"],
    };
  }

  /**
   * Check if path should be excluded from tracking
   */
  private shouldExclude(pathname: string): boolean {
    return this.config.excludePatterns.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace("*", ".*"));
        return regex.test(pathname);
      }
      return pathname.includes(pattern);
    });
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest | any): string {
    // For Next.js middleware
    if (request.ip) return request.ip;

    // Check various headers
    const forwardedFor =
      request.headers?.get?.("x-forwarded-for") ||
      request.headers?.["x-forwarded-for"];
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }

    const realIP =
      request.headers?.get?.("x-real-ip") || request.headers?.["x-real-ip"];
    if (realIP) return realIP;

    const clientIP =
      request.headers?.get?.("x-client-ip") || request.headers?.["x-client-ip"];
    if (clientIP) return clientIP;

    // Fallback for Node.js request objects
    return (
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== "object") return data;

    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "authorization",
    ];
    const sanitized = { ...data };

    for (const key in sanitized) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = "***masked***";
      } else if (typeof sanitized[key] === "object") {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Configure the middleware
   */
  configure(config: Partial<TrackingMiddlewareConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TrackingMiddlewareConfig {
    return { ...this.config };
  }
}

// Singleton instance
let middlewareInstance: ActivityTrackingMiddleware | null = null;

export function getTrackingMiddleware(
  config?: Partial<TrackingMiddlewareConfig>
): ActivityTrackingMiddleware {
  if (!middlewareInstance) {
    middlewareInstance = new ActivityTrackingMiddleware(config);
  }
  return middlewareInstance;
}

/**
 * Helper function to create Next.js middleware
 */
export function createTrackingMiddleware(
  config?: Partial<TrackingMiddlewareConfig>
) {
  const middleware = getTrackingMiddleware(config);
  return middleware.middleware.bind(middleware);
}

/**
 * Helper function to wrap API routes
 */
export function withApiTracking<T = any>(
  handler: (req: any, res: any) => Promise<T> | T,
  config?: Partial<TrackingMiddlewareConfig>
) {
  const middleware = getTrackingMiddleware(config);
  return middleware.withApiTracking(handler);
}

/**
 * Helper function to wrap React components
 */
export function withPageTracking<P = {}>(
  Component: React.ComponentType<P>,
  pageName?: string,
  config?: Partial<TrackingMiddlewareConfig>
) {
  const middleware = getTrackingMiddleware(config);
  return middleware.withPageTracking(Component, pageName);
}

export default ActivityTrackingMiddleware;
