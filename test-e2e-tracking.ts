#!/usr/bin/env npx tsx

import { prisma } from './lib/prisma';

/**
 * End-to-End Activity Tracking Test
 * Tests various API endpoints to ensure tracking decorators work correctly
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
}

class E2ETrackingTester {
  private results: TestResult[] = [];
  private initialActivityCount = 0;
  private initialEventCount = 0;

  async initialize() {
    console.log('🔄 Initializing E2E tracking tests...');
    
    // Record initial counts
    this.initialActivityCount = await prisma.userActivity.count();
    this.initialEventCount = await prisma.activityEvent.count();
    
    console.log(`📊 Initial state:`);
    console.log(`- User activities: ${this.initialActivityCount}`);
    console.log(`- Activity events: ${this.initialEventCount}`);
  }

  async testEndpoint(endpoint: string, method: string = 'GET', body?: any, headers?: Record<string, string>) {
    console.log(`\n🧪 Testing ${method} ${endpoint}`);
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'E2E-Test-Client',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const result: TestResult = {
        endpoint,
        method,
        status: response.status,
        success: response.status < 400,
      };

      if (!result.success) {
        const errorText = await response.text();
        result.error = errorText.substring(0, 200);
      }

      this.results.push(result);
      console.log(`   Status: ${response.status} ${result.success ? '✅' : '❌'}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      return result;
    } catch (error) {
      const result: TestResult = {
        endpoint,
        method,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      
      this.results.push(result);
      console.log(`   Error: ${result.error} ❌`);
      return result;
    }
  }

  async runTests() {
    console.log('\n🚀 Running E2E tracking tests...');

    // Test public endpoints (should work without auth)
    await this.testEndpoint('/api/cars');
    await this.testEndpoint('/api/auth/session');
    
    // Test activity endpoints
    await this.testEndpoint('/api/activity/live');
    
    // Test admin endpoints (will likely return 401/403 but should still track)
    await this.testEndpoint('/api/admin/users');
    await this.testEndpoint('/api/admin/bookings');
    
    // Test with POST requests
    await this.testEndpoint('/api/auth/register', 'POST', {
      email: 'test@example.com',
      name: 'Test User',
      password: 'testpassword123'
    });
    
    // Test booking endpoint
    await this.testEndpoint('/api/bookings', 'POST', {
      carId: 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    
    // Wait a moment for async processing
    console.log('\n⏳ Waiting for async activity processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async verifyTracking() {
    console.log('\n🔍 Verifying activity tracking...');
    
    const finalActivityCount = await prisma.userActivity.count();
    const finalEventCount = await prisma.activityEvent.count();
    
    const newActivities = finalActivityCount - this.initialActivityCount;
    const newEvents = finalEventCount - this.initialEventCount;
    
    console.log(`📊 Final state:`);
    console.log(`- User activities: ${finalActivityCount} (+${newActivities})`);
    console.log(`- Activity events: ${finalEventCount} (+${newEvents})`);
    
    // Get recent activities
    if (newActivities > 0) {
      console.log('\n📋 Recent activities:');
      const recentActivities = await prisma.userActivity.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        select: {
          action: true,
          resource: true,
          method: true,
          endpoint: true,
          statusCode: true,
          timestamp: true,
        },
      });
      
      recentActivities.forEach(activity => {
        console.log(`- ${activity.action} ${activity.resource} (${activity.method} ${activity.endpoint}) - Status: ${activity.statusCode}`);
      });
    }
    
    // Get recent events
    if (newEvents > 0) {
      console.log('\n📋 Recent events:');
      const recentEvents = await prisma.activityEvent.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        select: {
          eventType: true,
          eventCategory: true,
          status: true,
          timestamp: true,
        },
      });
      
      recentEvents.forEach(event => {
        console.log(`- ${event.eventType} (${event.eventCategory}) - Status: ${event.status}`);
      });
    }
    
    return { newActivities, newEvents };
  }

  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    console.log(`Total tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed tests:');
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`- ${result.method} ${result.endpoint} (${result.status}): ${result.error}`);
        });
    }
    
    console.log('\n✅ Successful tests:');
    this.results
      .filter(r => r.success)
      .forEach(result => {
        console.log(`- ${result.method} ${result.endpoint} (${result.status})`);
      });
  }
}

async function runE2ETrackingTests() {
  const tester = new E2ETrackingTester();
  
  try {
    await tester.initialize();
    await tester.runTests();
    const { newActivities, newEvents } = await tester.verifyTracking();
    tester.generateReport();
    
    console.log('\n🎯 Tracking Verification:');
    console.log('=' .repeat(50));
    
    if (newActivities > 0) {
      console.log(`✅ Activity tracking is working! Generated ${newActivities} new activities.`);
    } else {
      console.log(`⚠️  No new activities were tracked. This might indicate an issue with activity tracking.`);
    }
    
    if (newEvents > 0) {
      console.log(`✅ Event tracking is working! Generated ${newEvents} new events.`);
    } else {
      console.log(`ℹ️  No new events were generated (this is normal if event processing is disabled).`);
    }
    
    console.log('\n🏁 E2E tracking tests completed!');
    
  } catch (error) {
    console.error('❌ Error during E2E tracking tests:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runE2ETrackingTests().catch(console.error);