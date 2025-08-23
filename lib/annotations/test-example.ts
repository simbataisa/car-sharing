/**
 * Test Example for Annotation System
 * Demonstrates the working middleware functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAnnotationTracking, configureAnnotationMiddleware } from './middleware';

// Configure the annotation middleware
configureAnnotationMiddleware({
  enabled: true,
  trackAllRoutes: false,
  includeRoutes: ['/api/bookings', '/api/users'],
  excludeRoutes: ['/api/health', '/api/metrics'],
  defaultAction: 'CREATE'
});

// Example API handler using withAnnotationTracking
export const createBookingHandler = withAnnotationTracking(
  async (req: NextRequest) => {
    const body = await req.json();
    
    // Simulate booking creation
    const booking = {
      id: Math.random().toString(36).substr(2, 9),
      carId: body.carId,
      userId: body.userId,
      startDate: body.startDate,
      endDate: body.endDate,
      totalPrice: body.totalPrice,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    
    return NextResponse.json(booking, { status: 201 });
  },
  {
    action: 'CREATE',
    resource: 'booking',
    description: 'Create new car booking',
    tags: ['booking', 'api'],
    metadata: { 
      source: 'web-app',
      version: '1.0.0'
    }
  }
);

// Example API handler for getting bookings
export const getBookingsHandler = withAnnotationTracking(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    // Simulate fetching bookings
    const bookings = [
      {
        id: 'booking-1',
        carId: 1,
        userId,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'booking-2',
        carId: 2,
        userId,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    ];
    
    return NextResponse.json(bookings);
  },
  {
    action: 'READ',
    resource: 'booking',
    description: 'Get user bookings',
    tags: ['booking', 'api', 'read']
  }
);

// Example usage in an actual API route file:
// export { createBookingHandler as POST, getBookingsHandler as GET };

// Test function to demonstrate the system
export async function testAnnotationSystem() {
  console.log('Testing annotation system...');
  
  // Create a mock request
  const mockRequest = new NextRequest('http://localhost:3000/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test/1.0'
    },
    body: JSON.stringify({
      carId: 1,
      userId: 'user-123',
      startDate: '2024-01-15',
      endDate: '2024-01-17',
      totalPrice: 150.00
    })
  });
  
  try {
    // Test the wrapped handler
    const response = await createBookingHandler(mockRequest);
    const result = await response.json();
    
    console.log('Test successful:', result);
    return result;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}