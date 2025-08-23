const { PrismaClient } = require('@prisma/client');
const { getActivityTracker } = require('./lib/activity-tracker');

async function testTracking() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing activity tracking...');
    
    // Get the activity tracker
    const tracker = getActivityTracker();
    
    // Create a test event context
    const eventContext = {
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      source: 'api',
      timestamp: new Date()
    };
    
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
    
    // Check if the event was created
    const eventCount = await prisma.activityEvent.count();
    console.log(`Total activity events after test: ${eventCount}`);
    
    if (eventCount > 0) {
      const recentEvent = await prisma.activityEvent.findFirst({
        orderBy: { timestamp: 'desc' }
      });
      console.log('Most recent event:', recentEvent);
    }
    
  } catch (error) {
    console.error('Error testing tracking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTracking();