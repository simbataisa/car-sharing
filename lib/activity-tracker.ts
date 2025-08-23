/**
 * Activity Tracking Service
 * Main service for tracking user activities with configurable levels and async processing
 */

import { ActivityAction, ActivitySeverity } from "@prisma/client";
import { NextRequest } from "next/server";
import { getSession } from "next-auth/react";
import {
  ActivityTrackingConfig,
  EventContext,
  UserActivityEvent,
  AuthEvent,
  ResourceEvent,
  BookingEvent,
  SystemEvent,
  SecurityEvent,
  AdminEvent,
} from "./events/types";
import { getEventEmitter } from "./events/emitter";
import { getEventFactory, ActivityEventFactory } from "./events/factory";
import { getEventProcessor } from "./events/processor";
import { prisma } from "./prisma";

export class ActivityTrackingService {
  private config: ActivityTrackingConfig;
  private eventEmitter = getEventEmitter();
  private eventFactory = getEventFactory();
  private eventProcessor = getEventProcessor();

  constructor(config: Partial<ActivityTrackingConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      trackingLevel: config.trackingLevel || "standard",
      excludeActions: config.excludeActions || [],
      excludeResources: config.excludeResources || [],
      excludeEndpoints: config.excludeEndpoints || [
        "/api/health",
        "/favicon.ico",
      ],
      maskSensitiveData: config.maskSensitiveData ?? true,
      sensitiveFields: config.sensitiveFields || [
        "password",
        "token",
        "secret",
        "key",
      ],
      maxRequestDataSize: config.maxRequestDataSize || 10000, // 10KB
      maxResponseDataSize: config.maxResponseDataSize || 10000, // 10KB
      retentionDays: config.retentionDays || 90,
    };
  }

  /**
   * Track user activity
   */
  async trackActivity(
    action: ActivityAction,
    resource: string,
    context: EventContext,
    options: {
      resourceId?: string;
      description?: string;
      requestData?: any;
      responseData?: any;
      duration?: number;
      statusCode?: number;
      tags?: string[];
      severity?: ActivitySeverity;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.shouldTrack(action, resource, context)) {
      return;
    }

    try {
      // Create user activity event
      const event = this.eventFactory.createUserActivityEvent(
        action,
        resource,
        context,
        {
          resourceId: options.resourceId,
          description: options.description,
          requestData: this.sanitizeData(options.requestData),
          responseData: this.sanitizeData(options.responseData),
          context: {
            ...context,
            duration: options.duration,
            statusCode: options.statusCode,
          },
          tags: options.tags,
          severity: options.severity,
          metadata: options.metadata,
        }
      );

      // Emit event for async processing
      await this.eventEmitter.emit(event);
    } catch (error) {
      console.error("Error tracking activity:", error);
      // Don't throw to avoid breaking the main application flow
    }
  }

  /**
   * Track authentication events
   */
  async trackAuth(
    type: AuthEvent["type"],
    context: EventContext,
    options: {
      email?: string;
      success?: boolean;
      failureReason?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const event = this.eventFactory.createAuthEvent(type, context, options);
      await this.eventEmitter.emit(event);
    } catch (error) {
      console.error("Error tracking auth event:", error);
    }
  }

  /**
   * Track resource operations (CRUD)
   */
  async trackResource(
    type: ResourceEvent["type"],
    resource: string,
    resourceId: string,
    context: EventContext,
    options: {
      changes?: Record<string, any>;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.shouldTrackResource(resource)) return;

    try {
      const event = this.eventFactory.createResourceEvent(
        type,
        resource,
        resourceId,
        context,
        {
          changes: this.sanitizeData(options.changes),
          previousValues: this.sanitizeData(options.previousValues),
          newValues: this.sanitizeData(options.newValues),
          metadata: options.metadata,
        }
      );

      await this.eventEmitter.emit(event);
    } catch (error) {
      console.error("Error tracking resource event:", error);
    }
  }

  /**
   * Track booking events
   */
  async trackBooking(
    type: BookingEvent["type"],
    bookingId: string,
    carId: number,
    context: EventContext,
    options: {
      previousStatus?: string;
      newStatus?: string;
      totalPrice?: number;
      dateRange?: { startDate: Date; endDate: Date };
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const event = this.eventFactory.createBookingEvent(
        type,
        bookingId,
        carId,
        context,
        options
      );

      await this.eventEmitter.emit(event);
    } catch (error) {
      console.error("Error tracking booking event:", error);
    }
  }

  /**
   * Track system events
   */
  async trackSystem(
    type: SystemEvent["type"],
    severity: ActivitySeverity,
    context: EventContext,
    options: {
      component?: string;
      errorDetails?: {
        message: string;
        stack?: string;
        code?: string;
      };
      performanceMetrics?: {
        responseTime: number;
        memoryUsage: number;
        cpuUsage: number;
      };
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const event = this.eventFactory.createSystemEvent(
        type,
        severity,
        context,
        options
      );
      await this.eventEmitter.emit(event);
    } catch (error) {
      console.error("Error tracking system event:", error);
    }
  }

  /**
   * Track security events
   */
  async trackSecurity(
    type: SecurityEvent["type"],
    severity: ActivitySeverity,
    context: EventContext,
    options: {
      attemptedAction?: string;
      riskScore?: number;
      details?: Record<string, any>;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const event = this.eventFactory.createSecurityEvent(
        type,
        severity,
        context,
        {
          securityContext: {
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            attemptedAction: options.attemptedAction,
            riskScore: options.riskScore,
          },
          details: options.details,
          metadata: options.metadata,
        }
      );

      await this.eventEmitter.emit(event);
    } catch (error) {
      console.error("Error tracking security event:", error);
    }
  }

  /**
   * Track admin actions
   */
  async trackAdmin(
    type: AdminEvent["type"],
    adminUserId: string,
    action: ActivityAction,
    context: EventContext,
    options: {
      targetUserId?: string;
      targetResourceId?: string;
      changes?: Record<string, any>;
      justification?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const event = this.eventFactory.createAdminEvent(
        type,
        adminUserId,
        action,
        context,
        {
          targetUserId: options.targetUserId,
          targetResourceId: options.targetResourceId,
          changes: this.sanitizeData(options.changes),
          justification: options.justification,
          metadata: options.metadata,
        }
      );

      await this.eventEmitter.emit(event);
    } catch (error) {
      console.error("Error tracking admin event:", error);
    }
  }

  /**
   * Track page views
   */
  async trackPageView(
    path: string,
    context: EventContext,
    options: {
      title?: string;
      referrer?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (this.config.trackingLevel === "minimal") return;

    await this.trackActivity("READ", "page", context, {
      resourceId: path,
      description: `Viewed page: ${path}`,
      metadata: {
        title: options.title,
        referrer: options.referrer,
        ...options.metadata,
      },
      severity: "DEBUG",
      tags: ["page-view"],
    });
  }

  /**
   * Track API requests
   */
  async trackApiRequest(
    method: string,
    endpoint: string,
    context: EventContext,
    options: {
      requestData?: any;
      responseData?: any;
      statusCode?: number;
      duration?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (this.shouldExcludeEndpoint(endpoint)) return;

    const action = this.getActionFromMethod(method);

    await this.trackActivity(action, "api", context, {
      resourceId: endpoint,
      description: `${method} ${endpoint}`,
      requestData: options.requestData,
      responseData: options.responseData,
      statusCode: options.statusCode,
      duration: options.duration,
      metadata: options.metadata,
      severity: this.getSeverityFromStatusCode(options.statusCode),
      tags: ["api-request"],
    });
  }

  /**
   * Get user activity history
   */
  async getUserActivityHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      actions?: ActivityAction[];
      resources?: string[];
      severity?: ActivitySeverity[];
    } = {}
  ) {
    const where: any = { userId };

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    if (options.actions?.length) {
      where.action = { in: options.actions };
    }

    if (options.resources?.length) {
      where.resource = { in: options.resources };
    }

    if (options.severity?.length) {
      where.severity = { in: options.severity };
    }

    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.userActivity.count({ where }),
    ]);

    return {
      activities: activities.map((activity) => ({
        ...activity,
        requestData: activity.requestData
          ? JSON.parse(activity.requestData)
          : null,
        responseData: activity.responseData
          ? JSON.parse(activity.responseData)
          : null,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        tags: activity.tags ? activity.tags.split(",") : [],
      })),
      total,
      hasMore: (options.offset || 0) + activities.length < total,
    };
  }

  /**
   * Get activity analytics
   */
  async getActivityAnalytics(
    options: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: "hour" | "day" | "week" | "month";
      userId?: string;
    } = {}
  ) {
    const { startDate, endDate, groupBy = "day", userId } = options;

    // This would typically use a time-series database or specialized analytics queries
    // For now, we'll provide basic aggregations
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (userId) {
      where.userId = userId;
    }

    const [
      totalActivities,
      activitiesByAction,
      activitiesByResource,
      activitiesBySeverity,
      recentActivities,
    ] = await Promise.all([
      prisma.userActivity.count({ where }),

      prisma.userActivity.groupBy({
        by: ["action"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      prisma.userActivity.groupBy({
        by: ["resource"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      prisma.userActivity.groupBy({
        by: ["severity"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      prisma.userActivity.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      totalActivities,
      activitiesByAction,
      activitiesByResource,
      activitiesBySeverity,
      recentActivities,
    };
  }

  /**
   * Configure tracking
   */
  configure(config: Partial<ActivityTrackingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ActivityTrackingConfig {
    return { ...this.config };
  }

  /**
   * Clean up old activities based on retention policy
   */
  async cleanup(): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const result = await prisma.userActivity.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return { deleted: result.count };
  }

  // Private helper methods

  private shouldTrack(
    action: ActivityAction,
    resource: string,
    context: EventContext
  ): boolean {
    if (!this.config.enabled) return false;

    if (this.config.excludeActions.includes(action)) return false;

    if (this.config.excludeResources.includes(resource)) return false;

    if (context.endpoint && this.shouldExcludeEndpoint(context.endpoint))
      return false;

    // Check tracking level
    if (this.config.trackingLevel === "minimal") {
      return [
        "LOGIN",
        "LOGOUT",
        "REGISTER",
        "CREATE",
        "UPDATE",
        "DELETE",
      ].includes(action);
    }

    if (this.config.trackingLevel === "standard") {
      return !["READ", "SEARCH", "FILTER"].includes(action);
    }

    return true; // detailed or verbose
  }

  private shouldTrackResource(resource: string): boolean {
    return !this.config.excludeResources.includes(resource);
  }

  private shouldExcludeEndpoint(endpoint: string): boolean {
    return this.config.excludeEndpoints.some(
      (excluded) =>
        endpoint.includes(excluded) || endpoint.match(new RegExp(excluded))
    );
  }

  private sanitizeData(data: any): any {
    if (!data || !this.config.maskSensitiveData) return data;

    const sanitized = JSON.parse(JSON.stringify(data));

    const maskSensitive = (obj: any): any => {
      if (typeof obj !== "object" || obj === null) return obj;

      for (const key in obj) {
        if (
          this.config.sensitiveFields.some((field) =>
            key.toLowerCase().includes(field.toLowerCase())
          )
        ) {
          obj[key] = "***masked***";
        } else if (typeof obj[key] === "object") {
          obj[key] = maskSensitive(obj[key]);
        }
      }

      return obj;
    };

    return maskSensitive(sanitized);
  }

  private getActionFromMethod(method: string): ActivityAction {
    const methodMap: Record<string, ActivityAction> = {
      GET: "READ",
      POST: "CREATE",
      PUT: "UPDATE",
      PATCH: "UPDATE",
      DELETE: "DELETE",
    };

    return methodMap[method.toUpperCase()] || "CUSTOM";
  }

  private getSeverityFromStatusCode(statusCode?: number): ActivitySeverity {
    if (!statusCode) return "INFO";

    if (statusCode >= 500) return "ERROR";
    if (statusCode >= 400) return "WARN";
    if (statusCode >= 300) return "INFO";
    return "INFO";
  }
}

// Singleton instance
let activityTrackerInstance: ActivityTrackingService | null = null;

export function getActivityTracker(
  config?: Partial<ActivityTrackingConfig>
): ActivityTrackingService {
  if (!activityTrackerInstance) {
    activityTrackerInstance = new ActivityTrackingService(config);
  }
  return activityTrackerInstance;
}

export function resetActivityTracker(): void {
  activityTrackerInstance = null;
}

export default ActivityTrackingService;
