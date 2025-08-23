import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTrackingMiddleware } from "./lib/activity-middleware";
import { getActivityTracker } from "./lib/activity-tracker";
import { ActivityEventFactory } from "./lib/events/factory";

// Initialize activity tracking
const trackingMiddleware = getTrackingMiddleware({
  enableApiTracking: true,
  enablePageTracking: true,
  enableErrorTracking: true,
  trackingLevel: "standard",
  excludePatterns: [
    "/api/health",
    "/favicon.ico",
    "/robots.txt",
    "/_next",
    "/api/activity",
  ],
});

export async function middleware(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get user token for activity tracking
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Create context for activity tracking
    const context = ActivityEventFactory.createContext(request, {
      userId: token?.sub,
      source: "web",
    });

    // Check if accessing admin routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
      // Track admin access attempts
      if (request.nextUrl.pathname !== "/admin/login") {
        await getActivityTracker().trackActivity("READ", "admin", context, {
          resourceId: request.nextUrl.pathname,
          description: `Accessed admin route: ${request.nextUrl.pathname}`,
          tags: ["admin-access"],
          severity: "INFO",
        });
      }

      // Allow access to admin login page
      if (request.nextUrl.pathname === "/admin/login") {
        return NextResponse.next();
      }

      if (!token) {
        // Track unauthorized admin access attempt
        await getActivityTracker().trackSecurity(
          "security.unauthorized",
          "WARN",
          context,
          {
            attemptedAction: "admin_access",
            riskScore: 75,
            details: {
              path: request.nextUrl.pathname,
              reason: "No authentication token",
            },
          }
        );

        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      // For other admin routes, we'll let the AdminLayout component handle admin role checking
      // since we need to make API calls to verify admin status
    }

    // Check if accessing dashboard routes
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      // Track dashboard access
      await getActivityTracker().trackActivity("READ", "dashboard", context, {
        resourceId: request.nextUrl.pathname,
        description: `Accessed dashboard: ${request.nextUrl.pathname}`,
        tags: ["dashboard-access"],
        severity: "INFO",
      });

      if (!token) {
        // Track unauthorized dashboard access attempt
        await getActivityTracker().trackSecurity(
          "security.unauthorized",
          "WARN",
          context,
          {
            attemptedAction: "dashboard_access",
            riskScore: 50,
            details: {
              path: request.nextUrl.pathname,
              reason: "No authentication token",
            },
          }
        );

        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Track authentication events
    if (token) {
      // Track successful authentication for protected routes
      if (
        request.nextUrl.pathname.startsWith("/admin") ||
        request.nextUrl.pathname.startsWith("/dashboard")
      ) {
        await getActivityTracker().trackAuth("auth.login", context, {
          email: token.email,
          success: true,
          metadata: {
            route: request.nextUrl.pathname,
            userAgent: request.headers.get("user-agent"),
          },
        });
      }
    }

    // Apply general activity tracking middleware
    const shouldTrack = !["/api/health", "/favicon.ico", "/robots.txt"].some(
      (pattern) => request.nextUrl.pathname.includes(pattern)
    );

    if (shouldTrack) {
      // Track page views for non-API routes
      if (!request.nextUrl.pathname.startsWith("/api")) {
        await getActivityTracker().trackPageView(
          request.nextUrl.pathname,
          context,
          {
            title: "Page View",
            referrer: request.headers.get("referer") || undefined,
            metadata: {
              searchParams: Object.fromEntries(request.nextUrl.searchParams),
              userAgent: request.headers.get("user-agent"),
            },
          }
        );
      }

      // Track API requests
      if (request.nextUrl.pathname.startsWith("/api")) {
        const duration = Date.now() - startTime;
        await getActivityTracker().trackApiRequest(
          request.method,
          request.nextUrl.pathname,
          context,
          {
            duration,
            metadata: {
              userAgent: request.headers.get("user-agent"),
              contentType: request.headers.get("content-type"),
            },
          }
        );
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Track middleware errors
    console.error("Middleware error:", error);

    try {
      const context = ActivityEventFactory.createContext(request, {
        source: "system",
      });

      await getActivityTracker().trackSystem("system.error", "ERROR", context, {
        component: "middleware",
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          code: "MIDDLEWARE_ERROR",
        },
        metadata: {
          path: request.nextUrl.pathname,
          method: request.method,
          duration: Date.now() - startTime,
        },
      });
    } catch (trackingError) {
      console.error("Error tracking middleware error:", trackingError);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/api/:path*",
    "/cars/:path*",
    "/login",
    "/signup",
    "/",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
