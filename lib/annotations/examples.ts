/**
 * Annotation System Examples
 * Demonstrates how to use the annotation-based event tracking system
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAnnotationTracking } from './middleware';
import { ActivityAction } from '@prisma/client';

// Example 1: Basic service class (decorators would be applied in actual usage)
export class UserService {
  async createUser(userData: { email: string; name: string; password: string }) {
    // Simulate user creation logic
    console.log('Creating user:', userData.email);
    
    // In actual usage, this would be decorated with:
    // @Track({ action: 'CREATE', resource: 'user', description: 'Create new user account' })
    return {
      id: Math.random().toString(36),
      email: userData.email,
      name: userData.name,
      createdAt: new Date()
    };
  }

  async updateUser(userId: string, updates: Partial<{ name: string; email: string; password: string }>) {
    console.log('Updating user:', userId, updates);
    
    // In actual usage, this would be decorated with:
    // @Track({ action: 'UPDATE', resource: 'user', resourceIdField: 'userId' })
    return {
      id: userId,
      ...updates,
      updatedAt: new Date()
    };
  }

  async authenticateUser(email: string, password: string) {
    // Simulate authentication logic
    const success = password === 'correct-password';
    
    // In actual usage, this would be decorated with:
    // @TrackAuth({ eventType: 'login', emailField: 'email', successField: 'success' })
    return {
      email,
      success,
      userId: success ? 'user-123' : undefined,
      failureReason: success ? undefined : 'Invalid credentials'
    };
  }

  async deleteUser(userId: string) {
    console.log('Deleting user:', userId);
    
    // In actual usage, this would be decorated with:
    // @TrackResource({ resource: 'user', operation: 'delete', resourceIdField: 'userId' })
    return {
      deleted: true,
      userId,
      deletedAt: new Date()
    };
  }
}

// Example 2: API Route handlers using withAnnotationTracking HOF
export class CarBookingAPI {
  async POST(req: NextRequest) {
    const body = await req.json();
    
    // Simulate booking creation
    const booking = {
      id: Math.random().toString(36),
      carId: body.carId,
      userId: body.userId,
      startDate: body.startDate,
      endDate: body.endDate,
      totalPrice: body.totalPrice,
      status: 'confirmed',
      createdAt: new Date()
    };
    
    return NextResponse.json(booking, { status: 201 });
  }

  async GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    // Simulate fetching bookings
    const bookings = [
      {
        id: 'booking-1',
        carId: 1,
        userId,
        status: 'confirmed',
        createdAt: new Date()
      }
    ];
    
    return NextResponse.json(bookings);
  }
}

// Example 3: Using withAnnotationTracking HOF
export const createCarHandler = withAnnotationTracking(
  async (req: NextRequest) => {
    const body = await req.json();
    
    // Simulate car creation
    const car = {
      id: Math.random().toString(36),
      make: body.make,
      model: body.model,
      year: body.year,
      pricePerDay: body.pricePerDay,
      available: true,
      createdAt: new Date()
    };
    
    return NextResponse.json(car, { status: 201 });
  },
  {
    action: 'CREATE',
    resource: 'car',
    description: 'Create new car listing',
    tags: ['car-management', 'admin'],
    metadata: { source: 'admin-panel' }
  }
);

// Example 3b: Using withAnnotationTracking HOF for booking creation
export const createBookingHandler = withAnnotationTracking(
  async (req: NextRequest) => {
    const body = await req.json();
    
    // Simulate booking creation
    const booking = {
      id: Math.random().toString(36),
      carId: body.carId,
      userId: body.userId,
      startDate: body.startDate,
      endDate: body.endDate,
      totalPrice: body.totalPrice,
      status: 'confirmed',
      createdAt: new Date()
    };
    
    return NextResponse.json(booking, { status: 201 });
  },
  {
    action: 'CREATE',
    resource: 'booking',
    description: 'Create car booking via HOF',
    tags: ['booking', 'api', 'hof'],
    metadata: { source: 'web-app' }
  }
);

// Example 4: Business logic class with multiple tracking types
export class BookingService {
  // In actual usage, this would be decorated with:
  // @Track({
  //   action: 'CREATE',
  //   resource: 'booking',
  //   description: 'Process booking request',
  //   includeParams: true,
  //   includeResult: true,
  //   tags: ['booking', 'business-logic'],
  //   transformParams: (params) => ({
  //     carId: params[0]?.carId,
  //     userId: params[0]?.userId,
  //     dateRange: {
  //       start: params[0]?.startDate,
  //       end: params[0]?.endDate
  //     }
  //   }),
  //   transformResult: (result) => ({
  //     bookingId: result.id,
  //     status: result.status,
  //     totalPrice: result.totalPrice
  //   })
  // })
  async createBooking(bookingData: {
    carId: number;
    userId: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  }) {
    // Business logic for booking creation
    console.log('Processing booking:', bookingData);
    
    // Validate availability
    const isAvailable = await this.checkCarAvailability(bookingData.carId, bookingData.startDate, bookingData.endDate);
    
    if (!isAvailable) {
      throw new Error('Car not available for selected dates');
    }
    
    // Create booking
    return {
      id: `booking-${Date.now()}`,
      ...bookingData,
      status: 'confirmed',
      createdAt: new Date()
    };
  }

  // In actual usage, this would be decorated with:
  // @Track({
  //   action: 'READ',
  //   resource: 'car',
  //   resourceIdField: 'carId',
  //   description: 'Check car availability',
  //   tags: ['availability-check'],
  //   severity: 'DEBUG'
  // })
  private async checkCarAvailability(carId: number, startDate: string, endDate: string): Promise<boolean> {
    // Simulate availability check
    console.log(`Checking availability for car ${carId} from ${startDate} to ${endDate}`);
    return Math.random() > 0.2; // 80% chance of availability
  }

  // In actual usage, this would be decorated with:
  // @Track({
  //   action: 'UPDATE',
  //   resource: 'booking',
  //   resourceIdField: 'bookingId',
  //   description: 'Cancel booking',
  //   tags: ['booking-cancellation'],
  //   severity: 'WARN'
  // })
  async cancelBooking(bookingId: string, reason?: string) {
    console.log(`Cancelling booking ${bookingId}:`, reason);
    
    return {
      bookingId,
      status: 'cancelled',
      cancelledAt: new Date(),
      reason
    };
  }
}

// Example 5: Error handling with annotations
export class PaymentService {
  // In actual usage, this would be decorated with:
  // @Track({
  //   action: 'CREATE',
  //   resource: 'payment',
  //   description: 'Process payment',
  //   tags: ['payment', 'financial'],
  //   severity: 'INFO',
  //   retryAttempts: 3,
  //   timeout: 30000
  // })
  async processPayment(paymentData: {
    bookingId: string;
    amount: number;
    paymentMethod: string;
  }) {
    console.log('Processing payment:', paymentData);
    
    // Simulate payment processing that might fail
    if (Math.random() < 0.1) { // 10% chance of failure
      throw new Error('Payment processing failed');
    }
    
    return {
      id: `payment-${Date.now()}`,
      ...paymentData,
      status: 'completed',
      processedAt: new Date()
    };
  }

  // In actual usage, this would be decorated with:
  // @Track({
  //   action: 'UPDATE',
  //   resource: 'payment',
  //   resourceIdField: 'paymentId',
  //   description: 'Refund payment',
  //   tags: ['payment', 'refund'],
  //   severity: 'WARN'
  // })
  async refundPayment(paymentId: string, amount: number, reason: string) {
    console.log(`Refunding payment ${paymentId}: $${amount}`);
    
    return {
      paymentId,
      refundAmount: amount,
      reason,
      status: 'refunded',
      refundedAt: new Date()
    };
  }
}

// Example 6: Usage in Next.js API routes

// /app/api/cars/route.ts
/*
import { NextRequest } from 'next/server';
import { createCarHandler } from '@/lib/annotations/examples';

export const POST = createCarHandler;
*/

// /app/api/bookings/route.ts
/*
import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/lib/annotations/examples';

const bookingService = new BookingService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const booking = await bookingService.createBooking(body);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
*/

// Example 7: Configuration usage
/*
import { configureAnnotationMiddleware } from '@/lib/annotations/middleware';
import { setConfigurationProvider } from '@/lib/annotations/config';

// Configure middleware
configureAnnotationMiddleware({
  enabled: true,
  trackAllRoutes: true,
  excludeRoutes: ['/api/health', '/api/metrics'],
  extractUserId: async (req) => {
    // Extract user ID from JWT token or session
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    // ... decode token and return userId
    return 'user-123';
  },
  extractSessionId: async (req) => {
    // Extract session ID from cookies or headers
    return req.cookies.get('session-id')?.value;
  }
});

// Configure global annotation settings
setConfigurationProvider({
  getGlobalConfig: () => ({
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
      includePatterns: ['*'],
      excludePatterns: ['*password*', '*secret*']
    },
    performance: {
      enableMetrics: true,
      slowThreshold: 1000
    },
    security: {
      enableAuditLog: true,
      trackFailedAttempts: true
    }
  }),
  // ... other methods
});
*/