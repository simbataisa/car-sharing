/**
 * Activity Analytics API Route
 * Provides analytics and insights for user activity data
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActivityTracker } from "@/lib/activity-tracker";
import { getUserWithRoles } from "@/lib/rbac";
import { withAnnotationTracking } from '@/lib/annotations/middleware';

async function getHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has admin permissions to view analytics
    const userWithRoles = await getUserWithRoles(session.user.id);
    const hasAdminAccess =
      userWithRoles?.userRoles.some((ur) =>
        ["SUPER_ADMIN", "ADMIN"].includes(ur.role.name)
      );

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy =
      (searchParams.get("groupBy") as "hour" | "day" | "week" | "month") ||
      "day";
    const userId = searchParams.get("userId");

    // Regular users can only view their own analytics
    const targetUserId = hasAdminAccess ? (userId || undefined) : session.user.id;

    const tracker = getActivityTracker();

    const analytics = await tracker.getActivityAnalytics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy,
      userId: targetUserId,
    });

    // Additional metrics for admin users
    if (hasAdminAccess) {
      // Add system-wide metrics
      const systemMetrics = {
        ...analytics,
        systemWide: true,
        requestedBy: session.user.id,
        generatedAt: new Date(),
      };

      return NextResponse.json(systemMetrics);
    }

    // Regular user metrics (limited to their own data)
    return NextResponse.json({
      ...analytics,
      systemWide: false,
      userId: session.user.id,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error fetching activity analytics:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST endpoint for custom analytics queries
async function postHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin permissions for custom queries
    const userWithRoles = await getUserWithRoles(session.user.id);
    const hasAdminAccess =
      userWithRoles?.userRoles.some((ur) =>
        ["SUPER_ADMIN", "ADMIN"].includes(ur.role.name)
      );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Admin access required for custom analytics queries" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { query, parameters } = body;

    // Validate query type
    const allowedQueries = [
      "user_activity_summary",
      "resource_usage_stats",
      "error_analysis",
      "performance_metrics",
      "security_events",
      "admin_actions",
    ];

    if (!allowedQueries.includes(query)) {
      return NextResponse.json(
        { error: "Invalid query type" },
        { status: 400 }
      );
    }

    // Execute custom analytics query
    const result = await executeCustomAnalyticsQuery(query, parameters);

    return NextResponse.json({
      query,
      parameters,
      result,
      executedAt: new Date(),
      executedBy: session.user.id,
    });
  } catch (error) {
    console.error("Error executing custom analytics query:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Custom analytics query executor
async function executeCustomAnalyticsQuery(query: string, parameters: any) {
  const { prisma } = await import("@/lib/prisma");

  switch (query) {
    case "user_activity_summary":
      return await prisma.userActivity.groupBy({
        by: ["userId"],
        where: {
          timestamp: {
            gte: parameters.startDate
              ? new Date(parameters.startDate)
              : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lte: parameters.endDate ? new Date(parameters.endDate) : new Date(),
          },
        },
        _count: {
          id: true,
        },
        _avg: {
          duration: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: parameters.limit || 50,
      });

    case "resource_usage_stats":
      return await prisma.userActivity.groupBy({
        by: ["resource", "action"],
        where: {
          timestamp: {
            gte: parameters.startDate
              ? new Date(parameters.startDate)
              : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lte: parameters.endDate ? new Date(parameters.endDate) : new Date(),
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      });

    case "error_analysis":
      return await prisma.userActivity.findMany({
        where: {
          severity: {
            in: ["ERROR", "CRITICAL"],
          },
          timestamp: {
            gte: parameters.startDate
              ? new Date(parameters.startDate)
              : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            lte: parameters.endDate ? new Date(parameters.endDate) : new Date(),
          },
        },
        select: {
          id: true,
          action: true,
          resource: true,
          description: true,
          severity: true,
          timestamp: true,
          metadata: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: parameters.limit || 100,
      });

    case "performance_metrics":
      return await prisma.userActivity.aggregate({
        where: {
          duration: {
            not: null,
          },
          timestamp: {
            gte: parameters.startDate
              ? new Date(parameters.startDate)
              : new Date(Date.now() - 24 * 60 * 60 * 1000),
            lte: parameters.endDate ? new Date(parameters.endDate) : new Date(),
          },
        },
        _avg: {
          duration: true,
        },
        _min: {
          duration: true,
        },
        _max: {
          duration: true,
        },
        _count: {
          duration: true,
        },
      });

    case "security_events":
      return await prisma.activityEvent.findMany({
        where: {
          eventCategory: "SECURITY_EVENT",
          timestamp: {
            gte: parameters.startDate
              ? new Date(parameters.startDate)
              : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            lte: parameters.endDate ? new Date(parameters.endDate) : new Date(),
          },
        },
        select: {
          id: true,
          eventType: true,
          source: true,
          sourceId: true,
          payload: true,
          timestamp: true,
          status: true,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: parameters.limit || 100,
      });

    case "admin_actions":
      return await prisma.userActivity.findMany({
        where: {
          action: {
            in: [
              "USER_PROMOTE",
              "USER_DEMOTE",
              "USER_ACTIVATE",
              "USER_DEACTIVATE",
              "ROLE_ASSIGN",
              "ROLE_REMOVE",
            ],
          },
          timestamp: {
            gte: parameters.startDate
              ? new Date(parameters.startDate)
              : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lte: parameters.endDate ? new Date(parameters.endDate) : new Date(),
          },
        },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          description: true,
          timestamp: true,
          metadata: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: parameters.limit || 100,
      });

    default:
      throw new Error(`Unknown query type: ${query}`);
  }
}

// Export tracked handlers
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "activity_analytics",
  description: "Get activity analytics and insights",
  tags: ["activity", "analytics", "insights"]
});

export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "activity_analytics",
  description: "Execute custom analytics queries",
  tags: ["activity", "analytics", "custom", "admin"]
});
