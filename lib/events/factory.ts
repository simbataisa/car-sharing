/**
 * Event Factory Implementation
 * Creates standardized events for the activity tracking system
 */

import { v4 as uuidv4 } from "uuid";
import { ActivityAction, ActivitySeverity } from "@prisma/client";
import {
  EventFactory,
  EventContext,
  UserActivityEvent,
  AuthEvent,
  ResourceEvent,
  BookingEvent,
  SystemEvent,
  SecurityEvent,
  AdminEvent,
  AppEvent,
} from "./types";

export class ActivityEventFactory implements EventFactory {
  /**
   * Create a user activity event
   */
  createUserActivityEvent(
    action: ActivityAction,
    resource: string,
    context: EventContext,
    options: Partial<UserActivityEvent> = {}
  ): UserActivityEvent {
    return {
      id: uuidv4(),
      type: "user.activity",
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      userId: context.userId,
      sessionId: context.sessionId,
      action,
      resource,
      resourceId: options.resourceId,
      description:
        options.description || this.generateDescription(action, resource),
      context: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        referer: context.referer,
        method: options.context?.method,
        endpoint: options.context?.endpoint,
        statusCode: options.context?.statusCode,
        duration: options.context?.duration,
      },
      requestData: options.requestData,
      responseData: options.responseData,
      severity: options.severity || this.getSeverityForAction(action),
      tags: options.tags,
      metadata: options.metadata,
    };
  }

  /**
   * Create an authentication event
   */
  createAuthEvent(
    type: AuthEvent["type"],
    context: EventContext,
    options: Partial<AuthEvent> = {}
  ): AuthEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      userId: context.userId,
      email: options.email,
      success: options.success ?? true,
      failureReason: options.failureReason,
      context: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        method: options.context?.method || "POST",
      },
      metadata: options.metadata,
    };
  }

  /**
   * Create a resource event
   */
  createResourceEvent(
    type: ResourceEvent["type"],
    resource: string,
    resourceId: string,
    context: EventContext,
    options: Partial<ResourceEvent> = {}
  ): ResourceEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      userId: context.userId,
      resource,
      resourceId,
      action: options.action || this.getActionFromResourceEventType(type),
      changes: options.changes,
      previousValues: options.previousValues,
      newValues: options.newValues,
      metadata: options.metadata,
    };
  }

  /**
   * Create a booking event
   */
  createBookingEvent(
    type: BookingEvent["type"],
    bookingId: string,
    carId: number,
    context: EventContext,
    options: Partial<BookingEvent> = {}
  ): BookingEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      userId: context.userId!,
      bookingId,
      carId,
      action: options.action || this.getActionFromBookingEventType(type),
      previousStatus: options.previousStatus,
      newStatus: options.newStatus,
      totalPrice: options.totalPrice,
      dateRange: options.dateRange,
      metadata: options.metadata,
    };
  }

  /**
   * Create a system event
   */
  createSystemEvent(
    type: SystemEvent["type"],
    severity: ActivitySeverity,
    context: EventContext,
    options: Partial<SystemEvent> = {}
  ): SystemEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      severity,
      component: options.component,
      errorDetails: options.errorDetails,
      performanceMetrics: options.performanceMetrics,
      metadata: options.metadata,
    };
  }

  /**
   * Create a security event
   */
  createSecurityEvent(
    type: SecurityEvent["type"],
    severity: ActivitySeverity,
    context: EventContext,
    options: Partial<SecurityEvent> = {}
  ): SecurityEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      userId: context.userId,
      severity,
      securityContext: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        endpoint: options.securityContext?.endpoint,
        attemptedAction: options.securityContext?.attemptedAction,
        riskScore: options.securityContext?.riskScore,
      },
      details: options.details,
      metadata: options.metadata,
    };
  }

  /**
   * Create an admin event
   */
  createAdminEvent(
    type: AdminEvent["type"],
    adminUserId: string,
    action: ActivityAction,
    context: EventContext,
    options: Partial<AdminEvent> = {}
  ): AdminEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: context.timestamp,
      correlationId: context.correlationId,
      adminUserId,
      targetUserId: options.targetUserId,
      targetResourceId: options.targetResourceId,
      action,
      changes: options.changes,
      justification: options.justification,
      metadata: options.metadata,
    };
  }

  /**
   * Generate a human-readable description for an action
   */
  private generateDescription(
    action: ActivityAction,
    resource: string
  ): string {
    const actionMap: Record<ActivityAction, string> = {
      LOGIN: "User logged in",
      LOGOUT: "User logged out",
      REGISTER: "User registered",
      PASSWORD_RESET: "User reset password",
      EMAIL_VERIFY: "User verified email",
      CREATE: `Created ${resource}`,
      READ: `Viewed ${resource}`,
      UPDATE: `Updated ${resource}`,
      DELETE: `Deleted ${resource}`,
      BOOK: `Booked ${resource}`,
      CANCEL_BOOKING: `Cancelled booking for ${resource}`,
      CONFIRM_BOOKING: `Confirmed booking for ${resource}`,
      COMPLETE_BOOKING: `Completed booking for ${resource}`,
      ADMIN_LOGIN: "Admin logged in",
      USER_PROMOTE: "Promoted user",
      USER_DEMOTE: "Demoted user",
      USER_ACTIVATE: "Activated user",
      USER_DEACTIVATE: "Deactivated user",
      ROLE_ASSIGN: "Assigned role",
      ROLE_REMOVE: "Removed role",
      SEARCH: `Searched ${resource}`,
      FILTER: `Filtered ${resource}`,
      EXPORT: `Exported ${resource}`,
      IMPORT: `Imported ${resource}`,
      BACKUP: `Backed up ${resource}`,
      SYSTEM_ERROR: "System error occurred",
      CUSTOM: `Custom action on ${resource}`,
    };

    return actionMap[action] || `Performed ${action} on ${resource}`;
  }

  /**
   * Get severity level for an action
   */
  private getSeverityForAction(action: ActivityAction): ActivitySeverity {
    const severityMap: Record<ActivityAction, ActivitySeverity> = {
      LOGIN: "INFO",
      LOGOUT: "INFO",
      REGISTER: "INFO",
      PASSWORD_RESET: "WARN",
      EMAIL_VERIFY: "INFO",
      CREATE: "INFO",
      READ: "DEBUG",
      UPDATE: "INFO",
      DELETE: "WARN",
      BOOK: "INFO",
      CANCEL_BOOKING: "INFO",
      CONFIRM_BOOKING: "INFO",
      COMPLETE_BOOKING: "INFO",
      ADMIN_LOGIN: "INFO",
      USER_PROMOTE: "WARN",
      USER_DEMOTE: "WARN",
      USER_ACTIVATE: "INFO",
      USER_DEACTIVATE: "WARN",
      ROLE_ASSIGN: "WARN",
      ROLE_REMOVE: "WARN",
      SEARCH: "DEBUG",
      FILTER: "DEBUG",
      EXPORT: "INFO",
      IMPORT: "WARN",
      BACKUP: "INFO",
      SYSTEM_ERROR: "ERROR",
      CUSTOM: "INFO",
    };

    return severityMap[action] || "INFO";
  }

  /**
   * Get action from resource event type
   */
  private getActionFromResourceEventType(
    type: ResourceEvent["type"]
  ): ActivityAction {
    const typeMap: Record<ResourceEvent["type"], ActivityAction> = {
      "resource.created": "CREATE",
      "resource.updated": "UPDATE",
      "resource.deleted": "DELETE",
      "resource.viewed": "READ",
    };

    return typeMap[type];
  }

  /**
   * Get action from booking event type
   */
  private getActionFromBookingEventType(
    type: BookingEvent["type"]
  ): ActivityAction {
    const typeMap: Record<BookingEvent["type"], ActivityAction> = {
      "booking.created": "BOOK",
      "booking.updated": "UPDATE",
      "booking.cancelled": "CANCEL_BOOKING",
      "booking.confirmed": "CONFIRM_BOOKING",
      "booking.completed": "COMPLETE_BOOKING",
    };

    return typeMap[type];
  }

  /**
   * Create event context from request
   */
  static createContext(
    req?: any,
    options: Partial<EventContext> = {}
  ): EventContext {
    const timestamp = new Date();
    const correlationId = options.correlationId || uuidv4();

    if (!req) {
      return {
        timestamp,
        correlationId,
        source: options.source || "system",
        ...options,
      };
    }

    return {
      userId: options.userId || req.user?.id,
      sessionId: options.sessionId || req.sessionID,
      ipAddress: options.ipAddress || this.getClientIP(req),
      userAgent: options.userAgent || req.headers["user-agent"],
      referer: options.referer || req.headers["referer"],
      correlationId,
      timestamp,
      source: options.source || "web",
      ...options,
    };
  }

  /**
   * Extract client IP from request
   */
  private static getClientIP(req: any): string {
    return (
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Create a batch of events
   */
  createBatch(
    events: Array<{
      type: string;
      context: EventContext;
      options?: any;
    }>
  ): AppEvent[] {
    return events.map(({ type, context, options = {} }) => {
      // This would need to be expanded based on specific event types
      return this.createUserActivityEvent(
        options.action || "CUSTOM",
        options.resource || "unknown",
        context,
        options
      );
    });
  }

  /**
   * Enrich event with additional context
   */
  enrichEvent<T extends AppEvent>(
    event: T,
    enrichmentData: Record<string, any>
  ): T {
    return {
      ...event,
      metadata: {
        ...event.metadata,
        ...enrichmentData,
      },
    };
  }
}

// Singleton instance
let eventFactoryInstance: ActivityEventFactory | null = null;

export function getEventFactory(): ActivityEventFactory {
  if (!eventFactoryInstance) {
    eventFactoryInstance = new ActivityEventFactory();
  }
  return eventFactoryInstance;
}

export default ActivityEventFactory;
