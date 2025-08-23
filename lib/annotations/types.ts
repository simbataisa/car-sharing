/**
 * Annotation System Types
 * Defines types and interfaces for the Java-like annotation system for event tracking
 */

import { ActivityAction, ActivitySeverity } from "@prisma/client";
import { AppEvent, EventContext } from "../events/types";

// Base annotation configuration
export interface BaseAnnotationConfig {
  enabled?: boolean;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  severity?: ActivitySeverity;
  async?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

// Track annotation configuration
export interface TrackConfig extends BaseAnnotationConfig {
  action: ActivityAction;
  resource: string;
  resourceIdField?: string; // Field name to extract resource ID from method params
  includeParams?: boolean;
  includeResult?: boolean;
  excludeFields?: string[];
  transformParams?: (params: any[]) => Record<string, any>;
  transformResult?: (result: any) => Record<string, any>;
}

// Authentication tracking configuration
export interface TrackAuthConfig extends BaseAnnotationConfig {
  eventType: "login" | "logout" | "register" | "failed";
  emailField?: string;
  successField?: string;
  failureReasonField?: string;
}

// Resource operation tracking configuration
export interface TrackResourceConfig extends BaseAnnotationConfig {
  resource: string;
  operation: "create" | "read" | "update" | "delete";
  resourceIdField?: string;
  changesField?: string;
  previousValuesField?: string;
  newValuesField?: string;
}

// Booking operation tracking configuration
export interface TrackBookingConfig extends BaseAnnotationConfig {
  operation: "create" | "update" | "cancel" | "confirm" | "complete";
  bookingIdField?: string;
  carIdField?: string;
  statusField?: string;
  priceField?: string;
  dateRangeField?: string;
}

// Security event tracking configuration
export interface TrackSecurityConfig extends BaseAnnotationConfig {
  eventType: "unauthorized" | "suspicious" | "breach" | "audit";
  riskScoreField?: string;
  attemptedActionField?: string;
  includeSecurityContext?: boolean;
}

// Admin action tracking configuration
export interface TrackAdminConfig extends BaseAnnotationConfig {
  action: ActivityAction;
  targetUserIdField?: string;
  targetResourceIdField?: string;
  changesField?: string;
  justificationField?: string;
}

// Performance tracking configuration
export interface TrackPerformanceConfig extends BaseAnnotationConfig {
  threshold?: number; // milliseconds
  includeMemoryUsage?: boolean;
  includeCpuUsage?: boolean;
  alertOnThreshold?: boolean;
}

// Error tracking configuration
export interface TrackErrorConfig extends BaseAnnotationConfig {
  includeStackTrace?: boolean;
  errorCodeField?: string;
  errorMessageField?: string;
  notifyAdmin?: boolean;
}

// Conditional tracking configuration
export interface ConditionalConfig extends BaseAnnotationConfig {
  condition: (params: any[], context: MethodExecutionContext) => boolean;
  onTrue: BaseAnnotationConfig;
  onFalse: BaseAnnotationConfig;
}

// Annotation metadata for reflection
export interface AnnotationMetadata {
  type: string;
  config: BaseAnnotationConfig;
  target: any;
  propertyKey: string | symbol;
  descriptor: PropertyDescriptor;
  parameterIndex?: number;
}

// Method execution context
export interface MethodExecutionContext {
  target: any;
  method: string;
  propertyKey: string | symbol;
  args: any[];
  startTime: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: Error;
  success?: boolean;
  annotations: AnnotationMetadata[];
}

// Annotation registry entry
export interface AnnotationRegistryEntry {
  target: any;
  propertyKey: string | symbol;
  annotations: AnnotationMetadata[];
}

// Event extraction result
export interface EventExtractionResult {
  enabled: boolean;
  event: AppEvent | null;
  context: EventContext | null;
}

// Annotation processor interface
export interface AnnotationProcessor {
  process(
    metadata: AnnotationMetadata,
    executionContext: MethodExecutionContext,
    eventContext: EventContext
  ): Promise<EventExtractionResult>;
}

// Configuration provider interface
export interface ConfigurationProvider {
  getGlobalConfig(): GlobalAnnotationConfig;
  updateGlobalConfig(config: Partial<GlobalAnnotationConfig>): void;
  getMergedConfig(
    annotationConfig: BaseAnnotationConfig,
    context?: any
  ): BaseAnnotationConfig;
  shouldProcess(
    annotationType: string,
    config: BaseAnnotationConfig,
    context?: any
  ): boolean;
}

// Annotation scanner interface
export interface AnnotationScanner {
  scan(target: any): AnnotationRegistryEntry[];
  scanMethod(target: any, propertyKey: string | symbol): AnnotationMetadata[];
  scanClass(target: any): AnnotationRegistryEntry[];
}

// Event context builder interface
export interface EventContextBuilder {
  build(
    executionContext: MethodExecutionContext,
    baseContext?: Partial<EventContext>
  ): EventContext;
}

// Annotation validator interface
export interface AnnotationValidator {
  validate(config: BaseAnnotationConfig): { valid: boolean; errors: string[] };
  validateGlobal(config: GlobalAnnotationConfig): { valid: boolean; errors: string[] };
}

// Interceptor interface
export interface MethodInterceptor {
  intercept(
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
    annotations: AnnotationMetadata[]
  ): PropertyDescriptor;
}

// Annotation registry interface
export interface AnnotationRegistry {
  register(entry: AnnotationRegistryEntry): void;
  get(target: any, propertyKey?: string | symbol): AnnotationRegistryEntry[];
  getByTarget(target: any): AnnotationRegistryEntry[];
  getByAnnotationType(type: string): AnnotationRegistryEntry[];
  clear(): void;
  size(): number;
}

// Global annotation configuration
export interface GlobalAnnotationConfig extends BaseAnnotationConfig {
  defaultSeverity: ActivitySeverity;
  async: boolean;
  includeStackTrace: boolean;
  sanitizeData: boolean;
  maxMetadataSize: number;
  rateLimiting: {
    enabled: boolean;
    maxEventsPerMinute: number;
  };
  filters: {
    excludePatterns: string[];
    includePatterns: string[];
    minSeverity: ActivitySeverity;
  };
  performance: {
    trackingThreshold: number;
    enableMemoryTracking: boolean;
    enableCpuTracking: boolean;
  };
  security: {
    sanitizeFields: string[];
    logSecurityEvents: boolean;
    alertOnSuspiciousActivity: boolean;
  };
}

// Annotation decorator factory type
export type AnnotationDecoratorFactory<T extends BaseAnnotationConfig> = (
  config: T
) => MethodDecorator;

// Annotation decorator type
export type AnnotationDecorator = MethodDecorator;

// Parameter decorator type for context injection
export type ParameterAnnotationDecorator = ParameterDecorator;

// Class decorator type for global configuration
export type ClassAnnotationDecorator = ClassDecorator;