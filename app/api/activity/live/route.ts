/**
 * Real-time Activity Notifications using Server-Sent Events (SSE)
 * Provides live activity updates to admin dashboard and monitoring interfaces
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWithRoles } from "@/lib/rbac";
import { getActivityTracker } from "@/lib/activity-tracker";
import { getEventEmitter } from "@/lib/events/emitter";
import { AppEvent, UserActivityEvent } from "@/lib/events/types";
import { withAnnotationTracking } from '@/lib/annotations/middleware';

// Store active SSE connections
const activeConnections = new Map<
  string,
  {
    response: ReadableStreamDefaultController;
    userId: string;
    filters?: {
      severity?: string[];
      actions?: string[];
      resources?: string[];
      userIds?: string[];
    };
    lastHeartbeat: number;
  }
>();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Connection cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Start connection cleanup
setInterval(() => {
  const now = Date.now();
  for (const [connectionId, connection] of activeConnections.entries()) {
    if (now - connection.lastHeartbeat > CLEANUP_INTERVAL) {
      console.log(`Cleaning up stale SSE connection: ${connectionId}`);
      try {
        connection.response.close();
      } catch (error) {
        console.error("Error closing stale connection:", error);
      }
      activeConnections.delete(connectionId);
    }
  }
}, CLEANUP_INTERVAL);

// SSE endpoint for real-time activity updates
async function getHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Authentication required", { status: 401 });
    }

    // Check admin permissions
    const userWithRoles = await getUserWithRoles(session.user.id);
    const hasAdminAccess =
      userWithRoles?.userRoles.some((ur) =>
        ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(ur.role.name)
      );

    if (!hasAdminAccess) {
      return new NextResponse("Admin access required", { status: 403 });
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const filters = {
      severity: searchParams.get("severity")?.split(",").filter(Boolean),
      actions: searchParams.get("actions")?.split(",").filter(Boolean),
      resources: searchParams.get("resources")?.split(",").filter(Boolean),
      userIds: searchParams.get("userIds")?.split(",").filter(Boolean),
    };

    // Create unique connection ID
    const connectionId = `${session.user.id}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log(`New SSE connection established: ${connectionId}`);

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        activeConnections.set(connectionId, {
          response: controller,
          userId: session.user.id,
          filters,
          lastHeartbeat: Date.now(),
        });

        // Send initial connection message
        const initMessage = {
          type: "connection",
          data: {
            connectionId,
            timestamp: new Date().toISOString(),
            message: "Real-time activity stream connected",
            activeConnections: activeConnections.size,
          },
        };

        controller.enqueue(`data: ${JSON.stringify(initMessage)}\n\n`);

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            const connection = activeConnections.get(connectionId);
            if (connection) {
              connection.lastHeartbeat = Date.now();
              const heartbeatMessage = {
                type: "heartbeat",
                data: {
                  timestamp: new Date().toISOString(),
                  activeConnections: activeConnections.size,
                },
              };
              controller.enqueue(
                `data: ${JSON.stringify(heartbeatMessage)}\n\n`
              );
            } else {
              clearInterval(heartbeatInterval);
            }
          } catch (error) {
            console.error("Heartbeat error:", error);
            clearInterval(heartbeatInterval);
            activeConnections.delete(connectionId);
          }
        }, HEARTBEAT_INTERVAL);

        // Register event listener for activity updates
        const eventEmitter = getEventEmitter();

        const activityListener = {
          name: `sse-${connectionId}`,
          eventTypes: [
            "user.activity",
            "auth.*",
            "resource.*",
            "booking.*",
            "system.*",
            "security.*",
            "admin.*",
          ],
          priority: 50,
          handle: async (event: AppEvent) => {
            try {
              const connection = activeConnections.get(connectionId);
              if (!connection) return;

              // Apply filters
              if (!shouldSendEvent(event, connection.filters)) {
                return;
              }

              // Format event for SSE
              const sseMessage = {
                type: "activity",
                data: {
                  id: event.id,
                  type: event.type,
                  timestamp: event.timestamp,
                  correlationId: event.correlationId,
                  metadata: event.metadata,
                  // Add type-specific data
                  ...(event.type === "user.activity" && {
                    userId: (event as UserActivityEvent).userId,
                    action: (event as UserActivityEvent).action,
                    resource: (event as UserActivityEvent).resource,
                    resourceId: (event as UserActivityEvent).resourceId,
                    description: (event as UserActivityEvent).description,
                    severity: (event as UserActivityEvent).severity,
                    tags: (event as UserActivityEvent).tags,
                  }),
                },
              };

              connection.response.enqueue(
                `data: ${JSON.stringify(sseMessage)}\n\n`
              );
            } catch (error) {
              console.error("Error sending SSE message:", error);
              // Remove failed connection
              activeConnections.delete(connectionId);
            }
          },
          onError: async (error: Error) => {
            console.error(`SSE listener error for ${connectionId}:`, error);
          },
        };

        eventEmitter.on("*", activityListener);

        // Cleanup on connection close
        return () => {
          console.log(`SSE connection closed: ${connectionId}`);
          eventEmitter.off("*", activityListener.name);
          activeConnections.delete(connectionId);
          clearInterval(heartbeatInterval);
        };
      },

      cancel() {
        console.log(`SSE connection cancelled: ${connectionId}`);
        activeConnections.delete(connectionId);
      },
    });

    // Set SSE headers
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error("Error setting up SSE connection:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

// Helper function to determine if event should be sent based on filters
function shouldSendEvent(
  event: AppEvent,
  filters?: {
    severity?: string[];
    actions?: string[];
    resources?: string[];
    userIds?: string[];
  }
): boolean {
  if (!filters) return true;

  // Check severity filter (for user activity events)
  if (filters.severity?.length && event.type === "user.activity") {
    const activityEvent = event as UserActivityEvent;
    if (!filters.severity.includes(activityEvent.severity)) {
      return false;
    }
  }

  // Check actions filter (for user activity events)
  if (filters.actions?.length && event.type === "user.activity") {
    const activityEvent = event as UserActivityEvent;
    if (!filters.actions.includes(activityEvent.action)) {
      return false;
    }
  }

  // Check resources filter (for user activity events)
  if (filters.resources?.length && event.type === "user.activity") {
    const activityEvent = event as UserActivityEvent;
    if (!filters.resources.includes(activityEvent.resource)) {
      return false;
    }
  }

  // Check user ID filter
  if (filters.userIds?.length) {
    const userId = (event as any).userId;
    if (userId && !filters.userIds.includes(userId)) {
      return false;
    }
  }

  return true;
}

// POST endpoint for sending custom notifications
async function postHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin permissions
    const userWithRoles = await getUserWithRoles(session.user.id);
    const hasAdminAccess =
      userWithRoles?.userRoles.some((ur) =>
        ["SUPER_ADMIN", "ADMIN"].includes(ur.role.name)
      );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, message, data, targetUsers } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    // Create notification message
    const notification = {
      type: "notification",
      data: {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        data,
        sentBy: session.user.id,
        timestamp: new Date().toISOString(),
      },
    };

    // Send to active connections
    let sentCount = 0;
    for (const [connectionId, connection] of activeConnections.entries()) {
      try {
        // Check if notification should be sent to this user
        if (targetUsers && !targetUsers.includes(connection.userId)) {
          continue;
        }

        connection.response.enqueue(
          `data: ${JSON.stringify(notification)}\n\n`
        );
        sentCount++;
      } catch (error) {
        console.error(`Error sending notification to ${connectionId}:`, error);
        activeConnections.delete(connectionId);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notification sent",
      sentTo: sentCount,
      totalConnections: activeConnections.size,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export tracked handlers
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "activity_live",
  description: "Establish SSE connection for real-time activity updates",
  tags: ["activity", "live", "sse", "realtime"]
});

export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "activity_live",
  description: "Send custom notifications to live connections",
  tags: ["activity", "live", "notification", "admin"]
});

export const DELETE = withAnnotationTracking(deleteHandler, {
  action: "DELETE",
  resource: "activity_live",
  description: "Close all SSE connections (admin maintenance)",
  tags: ["activity", "live", "maintenance", "admin"]
});

// GET connection status
async function deleteHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin permissions
    const userWithRoles = await getUserWithRoles(session.user.id);
    const isSuperAdmin = userWithRoles?.userRoles.some(
      (ur) => ur.role.name === "SUPER_ADMIN"
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    // Close all connections (admin maintenance)
    const connectionIds = Array.from(activeConnections.keys());

    for (const [connectionId, connection] of activeConnections.entries()) {
      try {
        const closeMessage = {
          type: "system",
          data: {
            message: "Connection closed by administrator",
            timestamp: new Date().toISOString(),
            reason: "maintenance",
          },
        };

        connection.response.enqueue(
          `data: ${JSON.stringify(closeMessage)}\n\n`
        );
        connection.response.close();
      } catch (error) {
        console.error("Error closing connection:", error);
      }
    }

    activeConnections.clear();

    return NextResponse.json({
      success: true,
      message: "All SSE connections closed",
      closedConnections: connectionIds.length,
    });
  } catch (error) {
    console.error("Error closing connections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
