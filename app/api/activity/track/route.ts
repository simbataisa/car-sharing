/**
 * Activity Tracking API Route
 * Handles incoming activity tracking data from frontend and processes it async
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActivityTracker } from "@/lib/activity-tracker";
import { ActivityEventFactory } from "@/lib/events/factory";
import { ActivityAction, ActivitySeverity } from "@prisma/client";
import { withAnnotationTracking } from '@/lib/annotations/middleware';

interface ActivityTrackingRequest {
  activities: Array<{
    action: ActivityAction;
    resource: string;
    resourceId?: string;
    description?: string;
    metadata?: Record<string, any>;
    severity?: ActivitySeverity;
    tags?: string[];
    userId?: string;
    timestamp?: string;
    source?: string;
    userAgent?: string;
    url?: string;
    referrer?: string;
  }>;
}

async function postHandler(request: NextRequest) {
  try {
    // Get session for user context
    const session = await auth();

    // Parse request body
    const body: ActivityTrackingRequest = await request.json();

    if (!body.activities || !Array.isArray(body.activities)) {
      return NextResponse.json(
        { error: "Invalid request: activities array required" },
        { status: 400 }
      );
    }

    const tracker = getActivityTracker();
    const processedActivities = [];

    // Process each activity
    for (const activity of body.activities) {
      try {
        // Create context for the activity
        const context = ActivityEventFactory.createContext(request, {
          userId: session?.user?.id || activity.userId,
          source: (activity.source as "web" | "api" | "system" | "admin") || "web",
          timestamp: activity.timestamp
            ? new Date(activity.timestamp)
            : new Date(),
        });

        // Validate required fields
        if (!activity.action || !activity.resource) {
          console.warn("Skipping invalid activity:", activity);
          continue;
        }

        // Track the activity
        await tracker.trackActivity(
          activity.action,
          activity.resource,
          context,
          {
            resourceId: activity.resourceId,
            description: activity.description,
            metadata: {
              ...activity.metadata,
              url: activity.url,
              referrer: activity.referrer,
              userAgent: activity.userAgent,
              source: "frontend",
            },
            severity: activity.severity || "INFO",
            tags: activity.tags,
          }
        );

        processedActivities.push({
          action: activity.action,
          resource: activity.resource,
          timestamp: context.timestamp,
          status: "processed",
        });
      } catch (error) {
        console.error("Error processing activity:", error, activity);

        // Track the processing error
        try {
          const errorContext = ActivityEventFactory.createContext(request, {
            userId: session?.user?.id,
            source: "system",
          });

          await tracker.trackSystem("system.error", "ERROR", errorContext, {
            component: "activity-api",
            errorDetails: {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              code: "ACTIVITY_PROCESSING_ERROR",
            },
            metadata: {
              originalActivity: activity,
            },
          });
        } catch (trackingError) {
          console.error(
            "Error tracking activity processing error:",
            trackingError
          );
        }

        processedActivities.push({
          action: activity.action,
          resource: activity.resource,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedActivities.length,
      total: body.activities.length,
      activities: processedActivities,
    });
  } catch (error) {
    console.error("Error in activity tracking API:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET endpoint for activity history
async function getHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const actions = searchParams.get("actions")?.split(",") as ActivityAction[];
    const resources = searchParams.get("resources")?.split(",");
    const severity = searchParams
      .get("severity")
      ?.split(",") as ActivitySeverity[];

    const tracker = getActivityTracker();

    const result = await tracker.getUserActivityHistory(session.user.id, {
      limit: Math.min(limit, 100), // Max 100 records per request
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      actions,
      resources,
      severity,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching activity history:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Export tracked handlers
export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "activity_tracking",
  description: "Track user activities",
  tags: ["activity", "tracking", "analytics"]
});

export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "activity_tracking",
  description: "Get user activity history",
  tags: ["activity", "history", "analytics"]
});
