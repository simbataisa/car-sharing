/**
 * Annotation Decorators
 * Java-like annotation decorators for event tracking
 */

import "reflect-metadata";
import { ActivityAction, ActivitySeverity } from "@prisma/client";
import {
  TrackConfig,
  TrackAuthConfig,
  TrackResourceConfig,
  TrackBookingConfig,
  TrackSecurityConfig,
  TrackAdminConfig,
  TrackPerformanceConfig,
  TrackErrorConfig,
  ConditionalConfig,
  AnnotationMetadata,
  AnnotationRegistryEntry,
  BaseAnnotationConfig,
  MethodExecutionContext,
} from "./types";
import { getAnnotationRegistry } from "./registry";
import { getMethodInterceptor } from "./interceptor";
import { getActivityTracker } from "../activity-tracker";
import { ActivityEventFactory } from "../events/factory";
import { EventContext } from "../events/types";

/**
 * Base decorator factory for creating annotation decorators
 */
function createAnnotationDecorator<T extends BaseAnnotationConfig>(
  type: string,
  defaultConfig: Partial<T> = {}
) {
  return function (config: T): MethodDecorator {
    return function (
      target: any,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
    ) {
      const finalConfig = { ...defaultConfig, ...config };
      
      // Create annotation metadata
      const metadata: AnnotationMetadata = {
        type,
        config: finalConfig,
        target,
        propertyKey,
        descriptor,
      };

      // Register the annotation
      const registry = getAnnotationRegistry();
      const existingEntries = registry.get(target, propertyKey);
      
      if (existingEntries.length > 0) {
        // Add to existing entry
        existingEntries[0].annotations.push(metadata);
      } else {
        // Create new entry
        const entry: AnnotationRegistryEntry = {
          target,
          propertyKey,
          annotations: [metadata],
        };
        registry.register(entry);
      }

      // Apply method interceptor
      const interceptor = getMethodInterceptor();
      const newDescriptor = interceptor.intercept(
        target,
        propertyKey,
        descriptor,
        [metadata]
      );
      
      // Update descriptor properties
      Object.defineProperty(target, propertyKey, newDescriptor);
      
      return newDescriptor;
    };
  };
}

/**
 * @Track - General purpose activity tracking annotation
 * 
 * @example
 * ```typescript
 * class CarService {
 *   @Track({
 *     action: "CREATE",
 *     resource: "car",
 *     description: "Created a new car",
 *     includeParams: true,
 *     includeResult: true
 *   })
 *   async createCar(carData: CreateCarData): Promise<Car> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const Track = createAnnotationDecorator<TrackConfig>("track", {
  enabled: true,
  async: true,
  includeParams: false,
  includeResult: false,
  severity: "INFO",
});

/**
 * @TrackAuth - Authentication event tracking annotation
 * 
 * @example
 * ```typescript
 * class AuthService {
 *   @TrackAuth({
 *     eventType: "login",
 *     emailField: "email",
 *     successField: "success"
 *   })
 *   async login(email: string, password: string): Promise<LoginResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackAuth = createAnnotationDecorator<TrackAuthConfig>("track-auth", {
  enabled: true,
  async: true,
  severity: "INFO",
});

/**
 * @TrackResource - Resource operation tracking annotation
 * 
 * @example
 * ```typescript
 * class UserService {
 *   @TrackResource({
 *     resource: "user",
 *     operation: "update",
 *     resourceIdField: "userId",
 *     changesField: "changes"
 *   })
 *   async updateUser(userId: string, changes: UserUpdate): Promise<User> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackResource = createAnnotationDecorator<TrackResourceConfig>(
  "track-resource",
  {
    enabled: true,
    async: true,
    severity: "INFO",
  }
);

/**
 * @TrackBooking - Booking operation tracking annotation
 * 
 * @example
 * ```typescript
 * class BookingService {
 *   @TrackBooking({
 *     operation: "create",
 *     bookingIdField: "id",
 *     carIdField: "carId",
 *     priceField: "totalPrice"
 *   })
 *   async createBooking(bookingData: CreateBookingData): Promise<Booking> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackBooking = createAnnotationDecorator<TrackBookingConfig>(
  "track-booking",
  {
    enabled: true,
    async: true,
    severity: "INFO",
  }
);

/**
 * @TrackSecurity - Security event tracking annotation
 * 
 * @example
 * ```typescript
 * class SecurityService {
 *   @TrackSecurity({
 *     eventType: "unauthorized",
 *     severity: "WARN",
 *     includeSecurityContext: true
 *   })
 *   async checkAccess(userId: string, resource: string): Promise<boolean> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackSecurity = createAnnotationDecorator<TrackSecurityConfig>(
  "track-security",
  {
    enabled: true,
    async: true,
    severity: "WARN",
    includeSecurityContext: true,
  }
);

/**
 * @TrackAdmin - Admin action tracking annotation
 * 
 * @example
 * ```typescript
 * class AdminService {
 *   @TrackAdmin({
 *     action: "UPDATE",
 *     targetUserIdField: "userId",
 *     changesField: "changes",
 *     justificationField: "reason"
 *   })
 *   async updateUserRole(userId: string, newRole: string, reason: string): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackAdmin = createAnnotationDecorator<TrackAdminConfig>(
  "track-admin",
  {
    enabled: true,
    async: true,
    severity: "WARN",
  }
);

/**
 * @TrackPerformance - Performance tracking annotation
 * 
 * @example
 * ```typescript
 * class DataService {
 *   @TrackPerformance({
 *     threshold: 1000, // 1 second
 *     includeMemoryUsage: true,
 *     alertOnThreshold: true
 *   })
 *   async processLargeDataset(data: any[]): Promise<ProcessResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackPerformance = createAnnotationDecorator<TrackPerformanceConfig>(
  "track-performance",
  {
    enabled: true,
    async: true,
    severity: "INFO",
    threshold: 5000, // 5 seconds default
    includeMemoryUsage: false,
    includeCpuUsage: false,
    alertOnThreshold: false,
  }
);

/**
 * @TrackError - Error tracking annotation
 * 
 * @example
 * ```typescript
 * class PaymentService {
 *   @TrackError({
 *     includeStackTrace: true,
 *     notifyAdmin: true,
 *     severity: "ERROR"
 *   })
 *   async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackError = createAnnotationDecorator<TrackErrorConfig>(
  "track-error",
  {
    enabled: true,
    async: true,
    severity: "ERROR",
    includeStackTrace: true,
    notifyAdmin: false,
  }
);

/**
 * @TrackConditional - Conditional tracking annotation
 * 
 * @example
 * ```typescript
 * class UserService {
 *   @TrackConditional({
 *     condition: (params, context) => params[0].role === 'admin',
 *     onTrue: { severity: "WARN", tags: ["admin-action"] },
 *     onFalse: { severity: "INFO", tags: ["user-action"] }
 *   })
 *   async performAction(user: User, action: string): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const TrackConditional = createAnnotationDecorator<ConditionalConfig>(
  "track-conditional",
  {
    onTrue: { enabled: true, async: true, severity: "INFO" },
    onFalse: { enabled: false },
  }
);

/**
 * @NoTrack - Disable tracking for a method
 * 
 * @example
 * ```typescript
 * class UtilityService {
 *   @NoTrack()
 *   private internalHelper(): void {
 *     // This method won't be tracked
 *   }
 * }
 * ```
 */
export const NoTrack = (): MethodDecorator => {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const metadata: AnnotationMetadata = {
      type: "no-track",
      config: { enabled: false },
      target,
      propertyKey,
      descriptor,
    };

    const registry = getAnnotationRegistry();
    const entry: AnnotationRegistryEntry = {
      target,
      propertyKey,
      annotations: [metadata],
    };
    registry.register(entry);

    return descriptor;
  };
};

/**
 * @TrackClass - Class-level tracking configuration
 * 
 * @example
 * ```typescript
 * @TrackClass({
 *   enabled: true,
 *   defaultSeverity: "INFO",
 *   tags: ["service-class"]
 * })
 * class UserService {
 *   // All methods in this class will inherit the configuration
 * }
 * ```
 */
export const TrackClass = (config: BaseAnnotationConfig): ClassDecorator => {
  return function (target: any) {
    // Store class-level configuration
    Reflect.defineMetadata('track:class-config', config, target);
    
    // Apply to all methods
    const prototype = target.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype)
      .filter(name => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
        return descriptor && typeof descriptor.value === 'function' && name !== 'constructor';
      });

    methodNames.forEach(methodName => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName)!;
      const metadata: AnnotationMetadata = {
        type: "track-class",
        config,
        target: prototype,
        propertyKey: methodName,
        descriptor,
      };

      const registry = getAnnotationRegistry();
      const entry: AnnotationRegistryEntry = {
        target: prototype,
        propertyKey: methodName,
        annotations: [metadata],
      };
      registry.register(entry);
    });

    return target;
  };
};

/**
 * @InjectContext - Parameter decorator to inject event context
 * 
 * @example
 * ```typescript
 * class Service {
 *   @Track({ action: "READ", resource: "data" })
 *   async getData(@InjectContext() context: EventContext, id: string): Promise<Data> {
 *     // context parameter will be automatically injected
 *   }
 * }
 * ```
 */
export const InjectContext = (): ParameterDecorator => {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey) {
      const existingMetadata = Reflect.getMetadata('track:inject-context', target, propertyKey) || [];
      existingMetadata.push(parameterIndex);
      Reflect.defineMetadata('track:inject-context', existingMetadata, target, propertyKey);
    }
  };
};

/**
 * @InjectTracker - Parameter decorator to inject activity tracker
 * 
 * @example
 * ```typescript
 * class Service {
 *   async customTracking(@InjectTracker() tracker: ActivityTrackingService): Promise<void> {
 *     // tracker parameter will be automatically injected
 *   }
 * }
 * ```
 */
export const InjectTracker = (): ParameterDecorator => {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey) {
      const existingMetadata = Reflect.getMetadata('track:inject-tracker', target, propertyKey) || [];
      existingMetadata.push(parameterIndex);
      Reflect.defineMetadata('track:inject-tracker', existingMetadata, target, propertyKey);
    }
  };
};

// Export all decorators as default
export default {
  Track,
  TrackAuth,
  TrackResource,
  TrackBooking,
  TrackSecurity,
  TrackAdmin,
  TrackPerformance,
  TrackError,
  TrackConditional,
  NoTrack,
  TrackClass,
  InjectContext,
  InjectTracker,
};