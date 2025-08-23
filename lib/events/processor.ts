/**
 * Async Event Processor
 * Handles batch processing of events with queue management and persistence
 */

import { PrismaClient } from "@prisma/client";
import {
  AppEvent,
  EventListener,
  EventProcessorConfig,
  QueuedEvent,
  EventMetrics,
  UserActivityEvent,
  AuthEvent,
  ResourceEvent,
  BookingEvent,
  SystemEvent,
  SecurityEvent,
  AdminEvent,
} from "./types";
import { getEventEmitter } from "./emitter";
import { prisma } from "../prisma";

export class AsyncEventProcessor {
  private config: EventProcessorConfig;
  private processingBatch = false;
  private deadLetterQueue: QueuedEvent[] = [];
  private listeners: Map<string, EventListener[]> = new Map();
  private metrics: EventMetrics = {
    totalEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0,
    queueSize: 0,
    errorRate: 0,
    throughput: 0,
  };
  private batchTimer: NodeJS.Timeout | null = null;
  private eventBatch: AppEvent[] = [];

  constructor(config: Partial<EventProcessorConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 50,
      batchTimeout: config.batchTimeout || 5000, // 5 seconds
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000, // 1 second
      deadLetterQueue: config.deadLetterQueue ?? true,
      enableMetrics: config.enableMetrics ?? true,
    };

    this.registerDefaultListeners();
    this.startBatchProcessor();
  }

  /**
   * Register default event listeners
   */
  private registerDefaultListeners(): void {
    const eventEmitter = getEventEmitter();

    // Activity tracking listener
    eventEmitter.on("user.activity", {
      name: "activity-tracker",
      eventTypes: ["user.activity"],
      priority: 100,
      handle: this.handleUserActivity.bind(this),
      onError: this.handleListenerError.bind(this),
    });

    // Authentication listener
    eventEmitter.on("auth.*", {
      name: "auth-tracker",
      eventTypes: ["auth.login", "auth.logout", "auth.register", "auth.failed"],
      priority: 100,
      handle: this.handleAuthEvent.bind(this),
      onError: this.handleListenerError.bind(this),
    });

    // Resource event listener
    eventEmitter.on("resource.*", {
      name: "resource-tracker",
      eventTypes: [
        "resource.created",
        "resource.updated",
        "resource.deleted",
        "resource.viewed",
      ],
      priority: 100,
      handle: this.handleResourceEvent.bind(this),
      onError: this.handleListenerError.bind(this),
    });

    // Booking event listener
    eventEmitter.on("booking.*", {
      name: "booking-tracker",
      eventTypes: [
        "booking.created",
        "booking.updated",
        "booking.cancelled",
        "booking.confirmed",
        "booking.completed",
      ],
      priority: 100,
      handle: this.handleBookingEvent.bind(this),
      onError: this.handleListenerError.bind(this),
    });

    // System event listener
    eventEmitter.on("system.*", {
      name: "system-tracker",
      eventTypes: [
        "system.error",
        "system.performance",
        "system.maintenance",
        "system.backup",
      ],
      priority: 100,
      handle: this.handleSystemEvent.bind(this),
      onError: this.handleListenerError.bind(this),
    });

    // Security event listener
    eventEmitter.on("security.*", {
      name: "security-tracker",
      eventTypes: [
        "security.unauthorized",
        "security.suspicious",
        "security.breach",
        "security.audit",
      ],
      priority: 100,
      handle: this.handleSecurityEvent.bind(this),
      onError: this.handleListenerError.bind(this),
    });

    // Admin event listener
    eventEmitter.on("admin.*", {
      name: "admin-tracker",
      eventTypes: [
        "admin.user.created",
        "admin.user.updated",
        "admin.role.assigned",
        "admin.permission.granted",
      ],
      priority: 100,
      handle: this.handleAdminEvent.bind(this),
      onError: this.handleListenerError.bind(this),
    });
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(() => {
      if (this.eventBatch.length > 0) {
        this.processBatch();
      }
    }, this.config.batchTimeout);
  }

  /**
   * Add event to batch for processing
   */
  addToBatch(event: AppEvent): void {
    this.eventBatch.push(event);
    this.metrics.totalEvents++;

    // Process batch if it reaches the batch size
    if (this.eventBatch.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Process a batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.eventBatch.length === 0) {
      return;
    }

    this.processingBatch = true;
    const batch = [...this.eventBatch];
    this.eventBatch = [];

    const startTime = Date.now();

    try {
      // Group events by type for efficient processing
      const groupedEvents = this.groupEventsByType(batch);

      // Process each group
      for (const [eventType, events] of groupedEvents.entries()) {
        await this.processEventGroup(eventType, events);
      }

      this.metrics.processedEvents += batch.length;
    } catch (error) {
      console.error("Error processing event batch:", error);
      this.metrics.failedEvents += batch.length;

      // Add failed events to dead letter queue if enabled
      if (this.config.deadLetterQueue) {
        const failedEvents: QueuedEvent[] = batch.map((event) => ({
          event,
          attempts: this.config.retryAttempts,
          scheduledAt: new Date(),
          processAfter: new Date(),
          lastError: error instanceof Error ? error.message : String(error),
        }));

        this.deadLetterQueue.push(...failedEvents);
      }
    } finally {
      this.processingBatch = false;

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);
    }
  }

  /**
   * Group events by type for efficient batch processing
   */
  private groupEventsByType(events: AppEvent[]): Map<string, AppEvent[]> {
    const grouped = new Map<string, AppEvent[]>();

    for (const event of events) {
      const eventType = event.type;
      if (!grouped.has(eventType)) {
        grouped.set(eventType, []);
      }
      grouped.get(eventType)!.push(event);
    }

    return grouped;
  }

  /**
   * Process a group of events of the same type
   */
  private async processEventGroup(
    eventType: string,
    events: AppEvent[]
  ): Promise<void> {
    try {
      // Handle different event types with optimized batch processing
      if (eventType === "user.activity") {
        await this.batchInsertUserActivities(events as UserActivityEvent[]);
      } else if (eventType.startsWith("auth.")) {
        await this.batchInsertActivityEvents(events, "USER_ACTION");
      } else if (eventType.startsWith("resource.")) {
        await this.batchInsertActivityEvents(events, "BUSINESS_EVENT");
      } else if (eventType.startsWith("booking.")) {
        await this.batchInsertActivityEvents(events, "BUSINESS_EVENT");
      } else if (eventType.startsWith("system.")) {
        await this.batchInsertActivityEvents(events, "SYSTEM_EVENT");
      } else if (eventType.startsWith("security.")) {
        await this.batchInsertActivityEvents(events, "SECURITY_EVENT");
      } else if (eventType.startsWith("admin.")) {
        await this.batchInsertActivityEvents(events, "USER_ACTION");
      } else {
        // Generic handling for unknown event types
        await this.batchInsertActivityEvents(events, "USER_ACTION");
      }
    } catch (error) {
      console.error(`Error processing event group ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Batch insert user activities
   */
  private async batchInsertUserActivities(
    events: UserActivityEvent[]
  ): Promise<void> {
    const activities = events.map((event) => ({
      id: event.id,
      userId: event.userId,
      sessionId: event.sessionId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      description: event.description,
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
      referer: event.context.referer,
      method: event.context.method,
      endpoint: event.context.endpoint,
      requestData: event.requestData ? JSON.stringify(event.requestData) : null,
      responseData: event.responseData
        ? JSON.stringify(event.responseData)
        : null,
      statusCode: event.context.statusCode,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      tags: event.tags?.join(","),
      severity: event.severity,
      duration: event.context.duration,
      timestamp: event.timestamp,
    }));

    await prisma.userActivity.createMany({
      data: activities,
    });
  }

  /**
   * Batch insert activity events
   */
  private async batchInsertActivityEvents(
    events: AppEvent[],
    category:
      | "USER_ACTION"
      | "SYSTEM_EVENT"
      | "SECURITY_EVENT"
      | "BUSINESS_EVENT"
      | "PERFORMANCE_EVENT"
  ): Promise<void> {
    const activityEvents = events.map((event) => ({
      id: event.id,
      eventType: event.type,
      eventCategory: category,
      source: "system",
      sourceId: (event as any).userId || null,
      payload: JSON.stringify(event),
      correlationId: event.correlationId,
      status: "COMPLETED" as const,
      processedAt: new Date(),
      timestamp: event.timestamp,
    }));

    await prisma.activityEvent.createMany({
      data: activityEvents,
    });
  }

  /**
   * Handle user activity events
   */
  private async handleUserActivity(event: UserActivityEvent): Promise<void> {
    this.addToBatch(event);
  }

  /**
   * Handle authentication events
   */
  private async handleAuthEvent(event: AuthEvent): Promise<void> {
    this.addToBatch(event);

    // Create additional user activity record for authentication
    if (event.userId) {
      const activityEvent: UserActivityEvent = {
        id: `${event.id}-activity`,
        type: "user.activity",
        timestamp: event.timestamp,
        correlationId: event.correlationId,
        userId: event.userId,
        action: event.type.includes("login")
          ? "LOGIN"
          : event.type.includes("logout")
          ? "LOGOUT"
          : event.type.includes("register")
          ? "REGISTER"
          : "CUSTOM",
        resource: "auth",
        description: `Authentication: ${event.type}`,
        context: {
          ipAddress: event.context.ipAddress,
          userAgent: event.context.userAgent,
          method: event.context.method,
        },
        severity: event.success ? "INFO" : "WARN",
        metadata: {
          success: event.success,
          failureReason: event.failureReason,
        },
      };

      this.addToBatch(activityEvent);
    }
  }

  /**
   * Handle resource events
   */
  private async handleResourceEvent(event: ResourceEvent): Promise<void> {
    this.addToBatch(event);
  }

  /**
   * Handle booking events
   */
  private async handleBookingEvent(event: BookingEvent): Promise<void> {
    this.addToBatch(event);
  }

  /**
   * Handle system events
   */
  private async handleSystemEvent(event: SystemEvent): Promise<void> {
    this.addToBatch(event);
  }

  /**
   * Handle security events
   */
  private async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    this.addToBatch(event);
  }

  /**
   * Handle admin events
   */
  private async handleAdminEvent(event: AdminEvent): Promise<void> {
    this.addToBatch(event);
  }

  /**
   * Handle listener errors
   */
  private async handleListenerError(
    error: Error,
    event: AppEvent
  ): Promise<void> {
    console.error("Event listener error:", {
      error: error.message,
      eventType: event.type,
      eventId: event.id,
      stack: error.stack,
    });

    // Create a system error event
    const errorEvent: SystemEvent = {
      id: `${event.id}-error`,
      type: "system.error",
      timestamp: new Date(),
      correlationId: event.correlationId,
      severity: "ERROR",
      component: "event-processor",
      errorDetails: {
        message: error.message,
        stack: error.stack,
        code: "EVENT_PROCESSING_ERROR",
      },
      metadata: {
        originalEvent: event,
      },
    };

    this.addToBatch(errorEvent);
  }

  /**
   * Update metrics
   */
  private updateMetrics(processingTime: number): void {
    if (!this.config.enableMetrics) return;

    // Update average processing time (simple moving average)
    this.metrics.averageProcessingTime =
      this.metrics.averageProcessingTime * 0.9 + processingTime * 0.1;

    // Update error rate
    if (this.metrics.totalEvents > 0) {
      this.metrics.errorRate =
        (this.metrics.failedEvents / this.metrics.totalEvents) * 100;
    }

    // Update queue size
    this.metrics.queueSize = this.eventBatch.length;

    // Calculate throughput (events per second)
    const now = Date.now();
    if (!this.lastThroughputCheck) {
      this.lastThroughputCheck = now;
      this.eventsInLastPeriod = 0;
    } else {
      const timeDiff = (now - this.lastThroughputCheck) / 1000;
      if (timeDiff >= 1) {
        this.metrics.throughput = this.eventsInLastPeriod / timeDiff;
        this.eventsInLastPeriod = 0;
        this.lastThroughputCheck = now;
      }
    }
  }

  private lastThroughputCheck?: number;
  private eventsInLastPeriod = 0;

  /**
   * Get current metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Get dead letter queue status
   */
  getDeadLetterQueue(): QueuedEvent[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Reprocess dead letter queue events
   */
  async reprocessDeadLetterQueue(): Promise<void> {
    const events = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    for (const queuedEvent of events) {
      this.addToBatch(queuedEvent.event);
    }

    // Force process the batch
    await this.processBatch();
  }

  /**
   * Shutdown the processor gracefully
   */
  async shutdown(): Promise<void> {
    // Clear the batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Process remaining events
    if (this.eventBatch.length > 0) {
      await this.processBatch();
    }

    // Wait for current processing to finish
    while (this.processingBatch) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Configure the processor
   */
  configure(config: Partial<EventProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let processorInstance: AsyncEventProcessor | null = null;

export function getEventProcessor(
  config?: Partial<EventProcessorConfig>
): AsyncEventProcessor {
  if (!processorInstance) {
    processorInstance = new AsyncEventProcessor(config);
  }
  return processorInstance;
}

export function resetEventProcessor(): void {
  if (processorInstance) {
    processorInstance.shutdown();
    processorInstance = null;
  }
}

export default AsyncEventProcessor;
