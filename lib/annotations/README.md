# Annotation-Based Event Tracking System

A comprehensive TypeScript decorator and middleware system for automatic activity tracking in the car-sharing application.

## Overview

The annotation system provides a declarative way to track user activities, API calls, and business operations throughout the application. It integrates seamlessly with the existing activity tracking infrastructure and provides both decorator-based and middleware-based tracking approaches.

## Features

- **TypeScript Decorators**: Method-level annotations for automatic event tracking
- **API Middleware**: Automatic tracking for Next.js API routes
- **Configurable Tracking**: Flexible configuration options for different tracking scenarios
- **Security-Aware**: Built-in field exclusion and data sanitization
- **Performance Optimized**: Conditional tracking and efficient event generation
- **Type-Safe**: Full TypeScript support with proper type definitions

## Quick Start

### 1. Basic Method Tracking

```typescript
import { Track } from './lib/annotations/decorators';

class UserService {
  @Track({
    action: 'CREATE',
    resource: 'user',
    description: 'Create new user account',
    tags: ['user-management']
  })
  async createUser(userData: CreateUserData) {
    // Your business logic here
    return await this.userRepository.create(userData);
  }
}
```

### 2. API Route Middleware

```typescript
import { withAnnotationTracking } from './lib/annotations/middleware';

export const POST = withAnnotationTracking(
  async (req: NextRequest) => {
    const body = await req.json();
    // Handle the request
    return NextResponse.json(result);
  },
  {
    action: 'CREATE',
    resource: 'booking',
    description: 'Create car booking'
  }
);
```

## Available Decorators

### @Track
General-purpose tracking decorator for any method.

```typescript
@Track({
  action: 'UPDATE',
  resource: 'booking',
  resourceIdField: 'bookingId',
  description: 'Update booking details',
  includeParams: true,
  excludeFields: ['sensitiveData'],
  tags: ['booking', 'update']
})
async updateBooking(bookingId: string, updates: BookingUpdates) {
  // Implementation
}
```

### @TrackAuth
Specialized decorator for authentication-related operations.

```typescript
@TrackAuth({
  eventType: 'login',
  emailField: 'email',
  successField: 'success',
  description: 'User login attempt'
})
async authenticateUser(email: string, password: string) {
  // Authentication logic
}
```

### @TrackResource
Optimized for resource-specific operations.

```typescript
@TrackResource({
  resource: 'car',
  operation: 'delete',
  resourceIdField: 'carId',
  description: 'Remove car from fleet'
})
async deleteCar(carId: string) {
  // Deletion logic
}
```

### Other Decorators

- `@TrackBooking`: Booking-specific operations
- `@TrackSecurity`: Security-related events
- `@TrackAdmin`: Administrative actions
- `@TrackPerformance`: Performance monitoring
- `@TrackError`: Error tracking
- `@NoTrack`: Disable tracking for specific methods

## Configuration

### Global Configuration

```typescript
import { configureGlobalAnnotations } from './lib/annotations/config';

configureGlobalAnnotations({
  enabled: true,
  async: true,
  includeStackTrace: false,
  sanitizeData: true,
  maxMetadataSize: 1024,
  rateLimiting: {
    enabled: true,
    maxEventsPerMinute: 100
  },
  filters: {
    severityLevels: ['INFO', 'WARN', 'ERROR'],
    includePatterns: ['user.*', 'booking.*'],
    excludePatterns: ['internal.*']
  }
});
```

### Middleware Configuration

```typescript
import { configureAnnotationMiddleware } from './lib/annotations/middleware';

configureAnnotationMiddleware({
  enabled: true,
  trackAllRoutes: false,
  includeRoutes: ['/api/bookings', '/api/users'],
  excludeRoutes: ['/api/health', '/api/metrics'],
  defaultAction: 'READ'
});
```

## Advanced Usage

### Conditional Tracking

```typescript
@TrackConditional({
  condition: (params) => params[0]?.isImportant === true,
  action: 'UPDATE',
  resource: 'booking',
  description: 'Important booking update'
})
async updateImportantBooking(booking: Booking) {
  // Only tracked if booking.isImportant is true
}
```

### Custom Data Transformation

```typescript
@Track({
  action: 'CREATE',
  resource: 'payment',
  transformParams: (params) => ({
    amount: params[0]?.amount,
    currency: params[0]?.currency,
    // Exclude sensitive payment details
  }),
  transformResult: (result) => ({
    paymentId: result.id,
    status: result.status
  })
})
async processPayment(paymentData: PaymentData) {
  // Payment processing logic
}
```

### Context Injection

```typescript
class BookingService {
  @InjectContext()
  @Track({ action: 'CREATE', resource: 'booking' })
  async createBooking(
    bookingData: BookingData,
    @InjectTracker() tracker?: ActivityTracker
  ) {
    // Access to tracker instance for custom tracking
    if (tracker) {
      await tracker.trackActivity('CUSTOM', 'booking', context, {
        description: 'Custom tracking event'
      });
    }
  }
}
```

## Middleware Usage

### Higher-Order Function Approach

```typescript
import { withAnnotationTracking } from './lib/annotations/middleware';

// Wrap your API handler
export const createBooking = withAnnotationTracking(
  async (req: NextRequest) => {
    const body = await req.json();
    // Your API logic
    return NextResponse.json(result);
  },
  {
    action: 'CREATE',
    resource: 'booking',
    description: 'Create new booking',
    tags: ['api', 'booking'],
    metadata: { version: '1.0' }
  }
);
```

### Class-Based API Routes

```typescript
import { TrackApiRoute } from './lib/annotations/middleware';

export class BookingAPI {
  @TrackApiRoute({
    action: 'CREATE',
    resource: 'booking',
    description: 'Create booking endpoint'
  })
  async POST(req: NextRequest) {
    // Implementation
  }

  @TrackApiRoute({
    action: 'read',
    resource: 'booking',
    description: 'Get bookings endpoint'
  })
  async GET(req: NextRequest) {
    // Implementation
  }
}
```

## Security Considerations

### Data Sanitization

The system automatically sanitizes sensitive data:

```typescript
@Track({
  action: 'CREATE',
  resource: 'user',
  excludeFields: ['password', 'ssn', 'creditCard'],
  sanitizeData: true
})
async createUser(userData: UserData) {
  // Password and other sensitive fields are automatically excluded
}
```

### Field Exclusion

```typescript
@Track({
  action: 'UPDATE',
  resource: 'payment',
  excludeFields: ['cardNumber', 'cvv', 'pin'],
  includeParams: true
})
async updatePaymentMethod(paymentData: PaymentData) {
  // Sensitive payment fields are excluded from tracking
}
```

## Performance Optimization

### Async Tracking

```typescript
// Enable async tracking for better performance
configureGlobalAnnotations({
  async: true,
  performance: {
    enableAsyncTracking: true,
    batchSize: 10,
    flushInterval: 5000
  }
});
```

### Rate Limiting

```typescript
configureGlobalAnnotations({
  rateLimiting: {
    enabled: true,
    maxEventsPerMinute: 100,
    strategy: 'sliding-window'
  }
});
```

## Error Handling

```typescript
@TrackError({
  includeStackTrace: true,
  severity: 'ERROR',
  tags: ['error', 'payment']
})
async processPayment(paymentData: PaymentData) {
  try {
    // Payment logic
  } catch (error) {
    // Error is automatically tracked with stack trace
    throw error;
  }
}
```

## Testing

```typescript
import { testAnnotationSystem } from './lib/annotations/test-example';

// Test the annotation system
async function runTests() {
  try {
    const result = await testAnnotationSystem();
    console.log('Annotation system test passed:', result);
  } catch (error) {
    console.error('Annotation system test failed:', error);
  }
}
```

## File Structure

```
lib/annotations/
├── README.md              # This documentation
├── types.ts              # Type definitions
├── config.ts             # Configuration management
├── decorators.ts         # Decorator implementations
├── interceptor.ts        # Method interception logic
├── middleware.ts         # API route middleware
├── examples.ts           # Usage examples
└── test-example.ts       # Test utilities
```

## Integration with Activity Tracker

The annotation system integrates seamlessly with the existing activity tracking infrastructure:

- Uses the same `ActivityTracker` instance
- Follows the same event schema
- Supports all existing activity types
- Maintains compatibility with existing tracking code

## Best Practices

1. **Use Specific Decorators**: Choose the most specific decorator for your use case (`@TrackAuth` for auth, `@TrackResource` for resources)
2. **Configure Globally**: Set up global configuration once in your application startup
3. **Exclude Sensitive Data**: Always exclude sensitive fields like passwords, tokens, and personal data
4. **Use Meaningful Descriptions**: Provide clear, descriptive messages for better activity logs
5. **Tag Appropriately**: Use consistent tagging for easier filtering and analysis
6. **Monitor Performance**: Enable async tracking for high-throughput operations
7. **Test Thoroughly**: Use the provided test utilities to verify tracking behavior

## Troubleshooting

### Common Issues

1. **Decorators Not Working**: Ensure TypeScript experimental decorators are enabled
2. **Missing Events**: Check global configuration and filters
3. **Performance Issues**: Enable async tracking and adjust batch settings
4. **Type Errors**: Verify all required fields are provided in decorator configurations

### Debug Mode

```typescript
configureGlobalAnnotations({
  debug: true,
  includeStackTrace: true
});
```

This will provide detailed logging for troubleshooting tracking issues.