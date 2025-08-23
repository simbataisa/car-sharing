/**
 * Annotation-based Middleware for API Routes
 * Provides middleware functions to automatically apply annotation-based tracking to API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActivityTracker } from '../activity-tracker';
import { ActivityEventFactory } from '../events/factory';
import { EventContext } from '../events/types';
import { getConfigurationProvider } from './config';
import { ActivityAction } from '@prisma/client';

// Middleware configuration
export interface AnnotationMiddlewareConfig {
  enabled?: boolean;
  trackAllRoutes?: boolean;
  excludeRoutes?: string[];
  includeRoutes?: string[];
  defaultAction?: ActivityAction;
  extractUserId?: (req: NextRequest) => Promise<string | undefined>;
  extractSessionId?: (req: NextRequest) => Promise<string | undefined>;
}

const DEFAULT_CONFIG: AnnotationMiddlewareConfig = {
  enabled: true,
  trackAllRoutes: false,
  excludeRoutes: ['/api/health', '/api/metrics', '/favicon.ico'],
  defaultAction: 'READ',
  extractUserId: async () => undefined,
  extractSessionId: async () => undefined,
};

// Global middleware configuration
let middlewareConfig: AnnotationMiddlewareConfig = DEFAULT_CONFIG;

/**
 * Configure the annotation middleware
 */
export function configureAnnotationMiddleware(config: Partial<AnnotationMiddlewareConfig>) {
  middlewareConfig = { ...middlewareConfig, ...config };
}

/**
 * Get current middleware configuration
 */
export function getMiddlewareConfig(): AnnotationMiddlewareConfig {
  return middlewareConfig;
}

/**
 * Create annotation-aware middleware for API routes
 */
export function createAnnotationMiddleware(config?: Partial<AnnotationMiddlewareConfig>) {
  const finalConfig = { ...middlewareConfig, ...config };
  
  return async function annotationMiddleware(
    req: NextRequest,
    context: { params?: Record<string, string> } = {}
  ) {
    if (!finalConfig.enabled) {
      return NextResponse.next();
    }

    const pathname = req.nextUrl.pathname;
    
    // Check if route should be excluded
    if (shouldExcludeRoute(pathname, finalConfig)) {
      return NextResponse.next();
    }

    // Check if route should be included
    if (!shouldIncludeRoute(pathname, finalConfig)) {
      return NextResponse.next();
    }

    try {
      // Extract context information
      const eventContext = await createEventContext(req, finalConfig);
      
      // Get action from HTTP method
      const action = getActionFromMethod(req.method);
      
      // Track the API request
      const tracker = getActivityTracker();
      await tracker.trackApiRequest(
        req.method,
        pathname,
        eventContext,
        {
          metadata: {
            params: context.params,
            searchParams: Object.fromEntries(req.nextUrl.searchParams),
            headers: Object.fromEntries(req.headers.entries()),
          }
        }
      );
    } catch (error) {
      console.error('Error in annotation middleware:', error);
      // Don't block the request if tracking fails
    }

    return NextResponse.next();
  };
}

/**
 * Decorator for API route handlers to enable automatic tracking
 */
export function TrackApiRoute(config?: {
  action?: ActivityAction;
  resource?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (req: NextRequest, context?: any) {
      try {
        // Create event context
        const eventContext = await createEventContext(req, middlewareConfig);
        
        // Determine action and resource
        const action = config?.action || getActionFromMethod(req.method);
        const resource = config?.resource || extractResourceFromPath(req.nextUrl.pathname);
        const description = config?.description || `${req.method} ${req.nextUrl.pathname}`;
        
        // Track the API call
        const tracker = getActivityTracker();
        const startTime = Date.now();
        
        try {
          // Execute the original method
          const result = await originalMethod.call(this, req, context);
          
          // Track successful completion
          const duration = Date.now() - startTime;
          await tracker.trackActivity(action, resource, eventContext, {
            description,
            duration,
            metadata: {
              ...config?.metadata,
              method: req.method,
              pathname: req.nextUrl.pathname,
              statusCode: result?.status || 200,
            },
            tags: config?.tags || ['api-route'],
            severity: 'INFO'
          });
          
          return result;
        } catch (error) {
          // Track error
          const duration = Date.now() - startTime;
          await tracker.trackActivity(action, resource, eventContext, {
            description: `${description} (Error)`,
            duration,
            metadata: {
              ...config?.metadata,
              method: req.method,
              pathname: req.nextUrl.pathname,
              error: error instanceof Error ? error.message : 'Unknown error',
              statusCode: 500,
            },
            tags: [...(config?.tags || []), 'api-route', 'error'],
            severity: 'ERROR'
          });
          
          throw error;
        }
      } catch (trackingError) {
        console.error('Error in TrackApiRoute decorator:', trackingError);
        // Execute original method even if tracking fails
        return originalMethod.call(this, req, context);
      }
    };
    
    return descriptor;
  };
}

/**
 * Higher-order function to wrap API route handlers with tracking
 */
export function withAnnotationTracking<T extends Function>(
  handler: T,
  config?: {
    action?: ActivityAction;
    resource?: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }
): T {
  return (async function trackedHandler(req: NextRequest, context?: any) {
    try {
      // Create event context
      const eventContext = await createEventContext(req, middlewareConfig);
      
      // Determine action and resource
      const action = config?.action || getActionFromMethod(req.method);
      const resource = config?.resource || extractResourceFromPath(req.nextUrl.pathname);
      const description = config?.description || `${req.method} ${req.nextUrl.pathname}`;
      
      // Track the API call
      const tracker = getActivityTracker();
      const startTime = Date.now();
      
      try {
        // Execute the original handler
        const result = await handler(req, context);
        
        // Track successful completion
        const duration = Date.now() - startTime;
        await tracker.trackActivity(action, resource, eventContext, {
          description,
          duration,
          metadata: {
            ...config?.metadata,
            method: req.method,
            pathname: req.nextUrl.pathname,
            statusCode: result?.status || 200,
          },
          tags: config?.tags || ['api-route'],
          severity: 'INFO'
        });
        
        return result;
      } catch (error) {
        // Track error
        const duration = Date.now() - startTime;
        await tracker.trackActivity(action, resource, eventContext, {
          description: `${description} (Error)`,
          duration,
          metadata: {
            ...config?.metadata,
            method: req.method,
            pathname: req.nextUrl.pathname,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: 500,
          },
          tags: [...(config?.tags || []), 'api-route', 'error'],
          severity: 'ERROR'
        });
        
        throw error;
      }
    } catch (trackingError) {
      console.error('Error in withAnnotationTracking:', trackingError);
      // Execute original handler even if tracking fails
      return handler(req, context);
    }
  }) as unknown as T;
}

// Helper functions

function shouldExcludeRoute(pathname: string, config: AnnotationMiddlewareConfig): boolean {
  if (!config.excludeRoutes) return false;
  
  return config.excludeRoutes.some(route => {
    if (route.includes('*')) {
      const pattern = route.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(pathname);
    }
    return pathname.startsWith(route);
  });
}

function shouldIncludeRoute(pathname: string, config: AnnotationMiddlewareConfig): boolean {
  // If trackAllRoutes is true and no specific include routes, include all
  if (config.trackAllRoutes && (!config.includeRoutes || config.includeRoutes.length === 0)) {
    return true;
  }
  
  // If specific include routes are defined, check them
  if (config.includeRoutes && config.includeRoutes.length > 0) {
    return config.includeRoutes.some(route => {
      if (route.includes('*')) {
        const pattern = route.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(pathname);
      }
      return pathname.startsWith(route);
    });
  }
  
  // Default: only include if trackAllRoutes is true
  return config.trackAllRoutes || false;
}

async function createEventContext(
  req: NextRequest,
  config: AnnotationMiddlewareConfig
): Promise<EventContext> {
  const userId = config.extractUserId ? await config.extractUserId(req) : undefined;
  const sessionId = config.extractSessionId ? await config.extractSessionId(req) : undefined;
  
  return {
    userId,
    sessionId,
    ipAddress: getClientIP(req),
    userAgent: req.headers.get('user-agent') || undefined,
    referer: req.headers.get('referer') || undefined,
    source: 'api' as const,
    timestamp: new Date()
  };
}

function getClientIP(req: NextRequest): string | undefined {
  // Try various headers for client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return req.headers.get('x-real-ip') || 
         req.headers.get('x-client-ip') || 
         req.headers.get('cf-connecting-ip') || 
         undefined;
}

function getActionFromMethod(method: string): ActivityAction {
  const methodMap: Record<string, ActivityAction> = {
    GET: 'READ',
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };
  
  return methodMap[method.toUpperCase()] || 'CUSTOM';
}

function extractResourceFromPath(pathname: string): string {
  // Extract resource name from API path
  // e.g., /api/cars/123 -> cars, /api/auth/login -> auth
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length >= 2 && segments[0] === 'api') {
    return segments[1];
  }
  
  return 'api';
}

/**
 * Utility to create a tracked API route handler
 */
export function createTrackedRoute<T extends Function>(
  handler: T,
  config?: {
    action?: ActivityAction;
    resource?: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }
): T {
  return withAnnotationTracking(handler, config);
}

/**
 * Export middleware instance for use in Next.js middleware
 */
export const annotationMiddleware = createAnnotationMiddleware();