import { PrismaClient } from '@prisma/client';
import { getActivityTracker } from './lib/activity-tracker';
import { getEventProcessor } from './lib/events/processor';
import { getEventEmitter } from './lib/events/emitter';
import { EventContext } from './lib/events/types';

async function testTracking() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing activity tracking...');
    
    // Initialize the event processor to ensure listeners are registered
    const processor = getEventProcessor();
    const emitter = getEventEmitter();
    
    console.log('Event processor initialized');
    
    // Debug: Check if listeners are registered
    console.log('Emitter listeners:', (emitter as any).listeners);
    
    // Get the activity tracker
    const tracker = getActivityTracker();
    
    // Create a test event context
    const eventContext: EventContext = {
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      source: 'api',
      timestamp: new Date()
    };
    
    console.log('About to track activity...');
    
    // Track a test activity
    await tracker.trackActivity('READ', 'test_resource', eventContext, {
      description: 'Test tracking event',
      metadata: {
        test: true,
        method: 'GET',
        pathname: '/api/test'
      },
      tags: ['test', 'api-route'],
      severity: 'INFO'
    });
    
    console.log('Test event tracked successfully!');
    
    // Check queue status immediately
    const queueStatus = emitter.getQueueStatus();
    console.log('Queue status after tracking:', queueStatus);
    
    // Check metrics immediately
    let metrics = emitter.getMetrics();
    console.log('Emitter metrics after tracking:', metrics);
    
    // Wait a bit for processing
    console.log('Waiting 2 seconds for initial processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check metrics again
    metrics = emitter.getMetrics();
    console.log('Emitter metrics after 2 seconds:', metrics);
    
    // Wait for batch processing (default batch timeout is 5 seconds)
    console.log('Waiting for batch processing...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Check UserActivity table
    const userActivityCount = await prisma.userActivity.count();
    console.log(`Total user activities after test: ${userActivityCount}`);
    
    if (userActivityCount > 0) {
      const recentActivity = await prisma.userActivity.findFirst({
        orderBy: { timestamp: 'desc' }
      });
      console.log('Most recent user activity:', recentActivity);
    }
    
    // Check ActivityEvent table
    const activityEventCount = await prisma.activityEvent.count();
    console.log(`Total activity events after test: ${activityEventCount}`);
    
    if (activityEventCount > 0) {
      const recentEvent = await prisma.activityEvent.findFirst({
        orderBy: { timestamp: 'desc' }
      });
      console.log('Most recent activity event:', recentEvent);
    }
    
    // Check event processor metrics
    const processorMetrics = processor.getMetrics();
    console.log('Event processor metrics:', processorMetrics);
    
    // Final emitter metrics
    const finalMetrics = emitter.getMetrics();
    console.log('Final emitter metrics:', finalMetrics);
    
  } catch (error) {
    console.error('Error testing tracking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTracking();