#!/usr/bin/env npx tsx

import { prisma } from './lib/prisma';
import { getActivityTracker } from './lib/activity-tracker';
import { ActivityAction } from '@prisma/client';

/**
 * Debug Activity Tracking Test
 * Tests the activity tracking system directly to identify issues
 */

async function testDirectTracking() {
  console.log('🔄 Testing direct activity tracking...');
  
  try {
    const tracker = getActivityTracker();
    
    // Check initial state
    const initialCount = await prisma.userActivity.count();
    console.log(`📊 Initial activity count: ${initialCount}`);
    
    // Test direct tracking
    console.log('\n🧪 Testing direct trackActivity call...');
    await tracker.trackActivity(
      'READ' as ActivityAction,
      'test-resource',
      {
        userId: undefined,
        sessionId: 'test-session-debug',
        ipAddress: '127.0.0.1',
        userAgent: 'Debug-Test-Client',
        source: 'api' as const,
        timestamp: new Date()
      },
      {
        description: 'Direct tracking test',
        metadata: { test: true },
        tags: ['debug', 'test'],
        severity: 'INFO'
      }
    );
    
    console.log('✅ Direct tracking call completed');
    
    // Check if activity was created
    const finalCount = await prisma.userActivity.count();
    console.log(`📊 Final activity count: ${finalCount}`);
    console.log(`📈 New activities: ${finalCount - initialCount}`);
    
    if (finalCount > initialCount) {
      console.log('\n📋 Latest activity:');
      const latestActivity = await prisma.userActivity.findFirst({
        orderBy: { timestamp: 'desc' },
        select: {
          action: true,
          resource: true,
          description: true,
          sessionId: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          tags: true,
          severity: true,
          timestamp: true,
        },
      });
      
      if (latestActivity) {
        console.log(`- Action: ${latestActivity.action}`);
        console.log(`- Resource: ${latestActivity.resource}`);
        console.log(`- Description: ${latestActivity.description}`);
        console.log(`- Session ID: ${latestActivity.sessionId}`);
        console.log(`- IP: ${latestActivity.ipAddress}`);
        console.log(`- User Agent: ${latestActivity.userAgent}`);
        console.log(`- Metadata: ${latestActivity.metadata}`);
        console.log(`- Tags: ${latestActivity.tags}`);
        console.log(`- Severity: ${latestActivity.severity}`);
        console.log(`- Timestamp: ${latestActivity.timestamp}`);
      }
    }
    
    // Test API request tracking
    console.log('\n🧪 Testing trackApiRequest...');
    const mockRequest = {
      method: 'GET',
      url: 'http://localhost:3000/api/test',
      headers: new Map([['user-agent', 'Debug-Test-Client']]),
    };
    
    await tracker.trackApiRequest(
      'GET',
      '/api/test',
      {
        userId: undefined,
        sessionId: 'test-api-session',
        ipAddress: '127.0.0.1',
        userAgent: 'Debug-Test-Client',
        source: 'api' as const,
        timestamp: new Date()
      },
      {
        metadata: { testType: 'api-request' }
      }
    );
    
    console.log('✅ API request tracking completed');
    
    // Final check
    const veryFinalCount = await prisma.userActivity.count();
    console.log(`📊 Very final activity count: ${veryFinalCount}`);
    console.log(`📈 Total new activities: ${veryFinalCount - initialCount}`);
    
    if (veryFinalCount > finalCount) {
      console.log('\n📋 Latest API tracking activity:');
      const latestApiActivity = await prisma.userActivity.findFirst({
        orderBy: { timestamp: 'desc' },
        select: {
          action: true,
          resource: true,
          description: true,
          method: true,
          endpoint: true,
          sessionId: true,
          metadata: true,
          tags: true,
          timestamp: true,
        },
      });
      
      if (latestApiActivity) {
        console.log(`- Action: ${latestApiActivity.action}`);
        console.log(`- Resource: ${latestApiActivity.resource}`);
        console.log(`- Method: ${latestApiActivity.method}`);
        console.log(`- Endpoint: ${latestApiActivity.endpoint}`);
        console.log(`- Session ID: ${latestApiActivity.sessionId}`);
        console.log(`- Metadata: ${latestApiActivity.metadata}`);
        console.log(`- Tags: ${latestApiActivity.tags}`);
        console.log(`- Timestamp: ${latestApiActivity.timestamp}`);
      }
    }
    
    console.log('\n✅ Direct tracking test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during direct tracking test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDirectTracking().catch(console.error);