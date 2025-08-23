const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    // Check activity_events table
    const eventCount = await prisma.activityEvent.count();
    console.log(`Total activity events: ${eventCount}`);
    
    if (eventCount > 0) {
      const recentEvents = await prisma.activityEvent.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          eventType: true,
          eventCategory: true,
          source: true,
          timestamp: true,
          payload: true
        }
      });
      
      console.log('\nRecent events:');
      recentEvents.forEach(event => {
        console.log(`- ${event.eventType} (${event.eventCategory}): ${event.source} (${event.timestamp})`);
      });
    }
    
    // Check activity_metrics table
    const metricsCount = await prisma.activityMetrics.count();
    console.log(`\nTotal activity metrics: ${metricsCount}`);
    
    if (metricsCount > 0) {
      const recentMetrics = await prisma.activityMetrics.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          metricType: true,
          metricValue: true,
          metricUnit: true,
          period: true,
          createdAt: true
        }
      });
      
      console.log('\nRecent metrics:');
      recentMetrics.forEach(metric => {
        console.log(`- ${metric.metricType}: ${metric.metricValue} ${metric.metricUnit || ''} (${metric.period}) - ${metric.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();