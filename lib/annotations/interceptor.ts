/**
 * Method Interceptor
 * Handles method interception for annotation-based event tracking
 */

import { ActivityAction, ActivitySeverity } from "@prisma/client";
import {
  AnnotationMetadata,
  MethodExecutionContext,
  EventExtractionResult,
  MethodInterceptor,
} from "./types";
import { getActivityTracker } from "../activity-tracker";
import { getConfigurationProvider } from "./config";

/**
 * Default method interceptor implementation
 */
export class DefaultMethodInterceptor implements MethodInterceptor {
  /**
   * Intercept method calls and apply annotation-based tracking
   */
  intercept(
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
    annotations: AnnotationMetadata[]
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const interceptorInstance = this;

    descriptor.value = async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      const context: MethodExecutionContext = {
        target,
        method: originalMethod.name,
        propertyKey,
        args,
        startTime,
        annotations,
      };

      let result: any;
      let error: Error | undefined;

      try {
        // Execute original method
        result = await originalMethod.apply(this, args);
        context.result = result;
        context.success = true;
      } catch (err) {
        error = err as Error;
        context.error = error;
        context.success = false;
      } finally {
        context.endTime = Date.now();
        context.duration = context.endTime - context.startTime;

        // Process annotations after method execution
        await interceptorInstance.processAnnotations(context);
      }

      if (error) {
        throw error;
      }

      return result;
    };

    return descriptor;
  }

  /**
   * Process annotations and track events
   */
  private async processAnnotations(
    context: MethodExecutionContext
  ): Promise<void> {
    const tracker = getActivityTracker();
    const configProvider = getConfigurationProvider();

    for (const annotation of context.annotations) {
      try {
        // Check if annotation should be processed
        if (!configProvider.shouldProcess(annotation.type, annotation.config, context)) {
          continue;
        }

        // Extract basic tracking data
        const action = this.extractAction(annotation, context);
        const resource = this.extractResource(annotation, context);
        const description = this.extractDescription(annotation, context);
        
        // Create tracking context
        const trackingContext = {
          userId: this.extractUserId(context),
          sessionId: this.extractSessionId(context),
          ipAddress: this.extractIpAddress(context),
          userAgent: this.extractUserAgent(context),
          method: this.extractMethod(context),
          endpoint: this.extractEndpoint(context),
          statusCode: context.success ? 200 : 500,
          duration: context.duration,
          metadata: {
            annotationType: annotation.type,
            methodName: String(context.propertyKey),
            success: context.success,
            ...annotation.config.metadata,
          },
        };

        // Create proper EventContext
        const eventContext = {
          userId: trackingContext.userId,
          sessionId: trackingContext.sessionId,
          ipAddress: trackingContext.ipAddress,
          userAgent: trackingContext.userAgent,
          source: 'system' as const,
          timestamp: new Date()
        };

        // Track the activity using the existing tracker
        await tracker.trackActivity(action, resource, eventContext, {
          description,
          metadata: trackingContext.metadata,
          severity: annotation.config.severity || 'INFO',
          tags: annotation.config.tags || []
        });
      } catch (error) {
        console.error(`Error processing annotation ${annotation.type}:`, error);
      }
    }
  }

  // Helper methods for extracting data from context
  private extractUserId(context: MethodExecutionContext): string | undefined {
    // Try to extract user ID from various sources
    return context.args?.find(arg => arg?.userId)?.userId ||
           context.args?.find(arg => arg?.user?.id)?.user?.id ||
           context.result?.userId ||
           context.result?.user?.id;
  }

  private extractSessionId(context: MethodExecutionContext): string | undefined {
    return context.args?.find(arg => arg?.sessionId)?.sessionId ||
           context.result?.sessionId;
  }

  private extractIpAddress(context: MethodExecutionContext): string | undefined {
    return context.args?.find(arg => arg?.ipAddress)?.ipAddress ||
           context.args?.find(arg => arg?.req?.ip)?.req?.ip;
  }

  private extractUserAgent(context: MethodExecutionContext): string | undefined {
    return context.args?.find(arg => arg?.userAgent)?.userAgent ||
           context.args?.find(arg => arg?.req?.headers?.['user-agent'])?.req?.headers?.['user-agent'];
  }

  private extractMethod(context: MethodExecutionContext): string | undefined {
    return context.args?.find(arg => arg?.method)?.method ||
           context.args?.find(arg => arg?.req?.method)?.req?.method;
  }

  private extractEndpoint(context: MethodExecutionContext): string | undefined {
    return context.args?.find(arg => arg?.endpoint)?.endpoint ||
           context.args?.find(arg => arg?.req?.url)?.req?.url;
  }

  private extractAction(annotation: AnnotationMetadata, context: MethodExecutionContext): ActivityAction {
    // Extract action based on annotation type and config
    if (annotation.config && 'action' in annotation.config) {
      return annotation.config.action as ActivityAction;
    }
    
    // Default action based on method name patterns
    const methodName = String(context.propertyKey).toLowerCase();
    if (methodName.includes('create')) return "CREATE";
    if (methodName.includes('update')) return "UPDATE";
    if (methodName.includes('delete')) return "DELETE";
    if (methodName.includes('read') || methodName.includes('get') || methodName.includes('find')) return "READ";
    
    return "CUSTOM";
  }

  private extractResource(annotation: AnnotationMetadata, context: MethodExecutionContext): string {
    // Extract resource based on annotation config
    if (annotation.config && 'resource' in annotation.config) {
      return annotation.config.resource as string;
    }
    
    // Default resource based on class name or method name
    return context.target?.constructor?.name || "unknown";
  }

  private extractDescription(annotation: AnnotationMetadata, context: MethodExecutionContext): string {
    // Use annotation description or generate default
    if (annotation.config?.description) {
      return annotation.config.description;
    }
    
    return `${String(context.propertyKey)} executed ${context.success ? 'successfully' : 'with error'}`;
  }
}

// Singleton instance
let interceptorInstance: MethodInterceptor | null = null;

/**
 * Get the global method interceptor instance
 */
export function getMethodInterceptor(): MethodInterceptor {
  if (!interceptorInstance) {
    interceptorInstance = new DefaultMethodInterceptor();
  }
  return interceptorInstance;
}

/**
 * Set a custom method interceptor
 */
export function setMethodInterceptor(interceptor: MethodInterceptor): void {
  interceptorInstance = interceptor;
}