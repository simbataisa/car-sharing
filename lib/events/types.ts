/**
 * Event System Types and Interfaces
 * Defines the core types for the async event-driven user activity tracking system
 */

import {
  ActivityAction,
  ActivitySeverity,
  EventCategory,
} from "@prisma/client";

// Base event interface
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  correlationId?: string;
  metadata?: Record<string, any>;
}

// User activity event
export interface UserActivityEvent extends BaseEvent {
  type: "user.activity";
  userId?: string;
  sessionId?: string;
  action: ActivityAction;
  resource: string;
  resourceId?: string;
  description?: string;
  context: {
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    method?: string;
    endpoint?: string;
    statusCode?: number;
    duration?: number;
  };
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  severity: ActivitySeverity;
  tags?: string[];
}

// Authentication events
export interface AuthEvent extends BaseEvent {
  type: "auth.login" | "auth.logout" | "auth.register" | "auth.failed";
  userId?: string;
  email?: string;
  success: boolean;
  failureReason?: string;
  context: {
    ipAddress?: string;
    userAgent?: string;
    method?: string;
  };
}

// Resource events (CRUD operations)
export interface ResourceEvent extends BaseEvent {
  type:
    | "resource.created"
    | "resource.updated"
    | "resource.deleted"
    | "resource.viewed";
  userId?: string;
  resource: string;
  resourceId: string;
  action: ActivityAction;
  changes?: Record<string, any>;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

// Booking events
export interface BookingEvent extends BaseEvent {
  type:
    | "booking.created"
    | "booking.updated"
    | "booking.cancelled"
    | "booking.confirmed"
    | "booking.completed";
  userId: string;
  bookingId: string;
  carId: number;
  action: ActivityAction;
  previousStatus?: string;
  newStatus?: string;
  totalPrice?: number;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

// System events
export interface SystemEvent extends BaseEvent {
  type:
    | "system.error"
    | "system.performance"
    | "system.maintenance"
    | "system.backup";
  severity: ActivitySeverity;
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
}

// Security events
export interface SecurityEvent extends BaseEvent {
  type:
    | "security.unauthorized"
    | "security.suspicious"
    | "security.breach"
    | "security.audit";
  userId?: string;
  severity: ActivitySeverity;
  securityContext: {
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    attemptedAction?: string;
    riskScore?: number;
  };
  details?: Record<string, any>;
}

// Admin events
export interface AdminEvent extends BaseEvent {
  type:
    | "admin.user.created"
    | "admin.user.updated"
    | "admin.role.assigned"
    | "admin.permission.granted";
  adminUserId: string;
  targetUserId?: string;
  targetResourceId?: string;
  action: ActivityAction;
  changes?: Record<string, any>;
  justification?: string;
}

// Union type for all events
export type AppEvent =
  | UserActivityEvent
  | AuthEvent
  | ResourceEvent
  | BookingEvent
  | SystemEvent
  | SecurityEvent
  | AdminEvent;

// Event listener interface
export interface EventListener<T extends AppEvent = AppEvent> {
  name: string;
  eventTypes: string[];
  priority: number; // Higher number = higher priority
  handle(event: T): Promise<void>;
  onError?(error: Error, event: T): Promise<void>;
}

// Event emitter interface
export interface EventEmitter {
  emit<T extends AppEvent>(event: T): Promise<void>;
  on<T extends AppEvent>(eventType: string, listener: EventListener<T>): void;
  off(eventType: string, listenerName: string): void;
  once<T extends AppEvent>(eventType: string, listener: EventListener<T>): void;
  removeAllListeners(eventType?: string): void;
}

// Event processor configuration
export interface EventProcessorConfig {
  batchSize: number;
  batchTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  deadLetterQueue: boolean;
  enableMetrics: boolean;
}

// Event queue item
export interface QueuedEvent {
  event: AppEvent;
  attempts: number;
  scheduledAt: Date;
  processAfter: Date;
  lastError?: string;
}

// Event metrics
export interface EventMetrics {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  queueSize: number;
  errorRate: number;
  throughput: number; // events per second
}

// Activity tracking configuration
export interface ActivityTrackingConfig {
  enabled: boolean;
  trackingLevel: "minimal" | "standard" | "detailed" | "verbose";
  excludeActions: ActivityAction[];
  excludeResources: string[];
  excludeEndpoints: string[];
  maskSensitiveData: boolean;
  sensitiveFields: string[];
  maxRequestDataSize: number;
  maxResponseDataSize: number;
  retentionDays: number;
}

// Event context interface
export interface EventContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  correlationId?: string;
  timestamp: Date;
  source: "web" | "api" | "system" | "admin";
}

// Event factory interface
export interface EventFactory {
  createUserActivityEvent(
    action: ActivityAction,
    resource: string,
    context: EventContext,
    options?: Partial<UserActivityEvent>
  ): UserActivityEvent;

  createAuthEvent(
    type: AuthEvent["type"],
    context: EventContext,
    options?: Partial<AuthEvent>
  ): AuthEvent;

  createResourceEvent(
    type: ResourceEvent["type"],
    resource: string,
    resourceId: string,
    context: EventContext,
    options?: Partial<ResourceEvent>
  ): ResourceEvent;

  createBookingEvent(
    type: BookingEvent["type"],
    bookingId: string,
    carId: number,
    context: EventContext,
    options?: Partial<BookingEvent>
  ): BookingEvent;

  createSystemEvent(
    type: SystemEvent["type"],
    severity: ActivitySeverity,
    context: EventContext,
    options?: Partial<SystemEvent>
  ): SystemEvent;

  createSecurityEvent(
    type: SecurityEvent["type"],
    severity: ActivitySeverity,
    context: EventContext,
    options?: Partial<SecurityEvent>
  ): SecurityEvent;

  createAdminEvent(
    type: AdminEvent["type"],
    adminUserId: string,
    action: ActivityAction,
    context: EventContext,
    options?: Partial<AdminEvent>
  ): AdminEvent;
}

// Event validation interface
export interface EventValidator {
  validate(event: AppEvent): { valid: boolean; errors: string[] };
  sanitize(event: AppEvent): AppEvent;
}

// Export utility types
export type EventType = AppEvent["type"];
export type EventHandler<T extends AppEvent> = (event: T) => Promise<void>;
export type EventFilter<T extends AppEvent> = (event: T) => boolean;
