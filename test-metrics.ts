#!/usr/bin/env npx tsx

import { getMetricsGenerator } from './lib/metrics-generator';
import { prisma } from './lib/prisma';

async function testMetricsGeneration() {
  console.log('🔄 Testing metrics generation...');
  
  try {
    const metricsGenerator = getMetricsGenerator();
    
    // Check initial state
    console.log('\n📊 Checking initial metrics state...');
    const initialSummary = await metricsGenerator.getMetricsSummary();
    console.log('Initial metrics count:', initialSummary.totalMetrics);
    console.log('Latest metrics date:', initialSummary.latestMetrics);
    
    // Check if we have any user activities to generate metrics from
    const activityCount = await prisma.userActivity.count();
    console.log('\n📈 User activities available:', activityCount);
    
    if (activityCount === 0) {
      console.log('\n⚠️  No user activities found. Creating sample activities for testing...');
      
      // Create some sample activities for testing (using null userId to avoid foreign key constraints)
      const sampleActivities = [
        {
          userId: null,
          sessionId: 'test-session-1',
          action: 'LOGIN' as const,
          resource: 'auth',
          description: 'Anonymous user login',
          severity: 'INFO' as const,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
        {
          userId: null,
          sessionId: 'test-session-1',
          action: 'READ' as const,
          resource: 'car',
          resourceId: 'car-1',
          description: 'View car details',
          severity: 'INFO' as const,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
        {
          userId: null,
          sessionId: 'test-session-2',
          action: 'CREATE' as const,
          resource: 'booking',
          resourceId: 'booking-1',
          description: 'Create booking',
          severity: 'INFO' as const,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
        {
          userId: null,
          sessionId: 'test-session-1',
          action: 'READ' as const,
          resource: 'car',
          resourceId: 'car-2',
          description: 'View another car',
          severity: 'INFO' as const,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
      ];
      
      await prisma.userActivity.createMany({
        data: sampleActivities,
      });
      
      console.log('✅ Created sample activities for testing');
    }
    
    // Generate daily metrics for yesterday
    console.log('\n🔄 Generating daily metrics...');
    await metricsGenerator.generateDailyMetrics();
    
    // Check results
    console.log('\n📊 Checking metrics after generation...');
    const finalSummary = await metricsGenerator.getMetricsSummary();
    console.log('Final metrics count:', finalSummary.totalMetrics);
    console.log('Latest metrics date:', finalSummary.latestMetrics);
    
    // Show metric types
    console.log('\n📈 Generated metric types:');
    finalSummary.metricTypes.forEach(metric => {
      console.log(`- ${metric.metricType}: ${metric.count} records`);
    });
    
    // Show some sample metrics
    console.log('\n📋 Sample metrics:');
    const sampleMetrics = await prisma.activityMetrics.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        metricType: true,
        metricValue: true,
        metricUnit: true,
        period: true,
        periodStart: true,
        periodEnd: true,
      },
    });
    
    sampleMetrics.forEach(metric => {
      console.log(`- ${metric.metricType}: ${metric.metricValue} ${metric.metricUnit || ''} (${metric.period})`);
    });
    
    console.log('\n✅ Metrics generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during metrics generation test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMetricsGeneration().catch(console.error);