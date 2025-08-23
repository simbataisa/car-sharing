import { prisma } from "./prisma";
import { MetricPeriod } from "@prisma/client";

export interface MetricsGeneratorConfig {
  enabled: boolean;
  generateDaily: boolean;
  generateHourly: boolean;
  retentionDays: number;
}

export class MetricsGenerator {
  private config: MetricsGeneratorConfig;

  constructor(config: Partial<MetricsGeneratorConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      generateDaily: config.generateDaily ?? true,
      generateHourly: config.generateHourly ?? false,
      retentionDays: config.retentionDays ?? 365,
    };
  }

  /**
   * Generate daily metrics for the previous day
   */
  async generateDailyMetrics(date?: Date): Promise<void> {
    if (!this.config.enabled || !this.config.generateDaily) return;

    const targetDate = date || new Date();
    targetDate.setDate(targetDate.getDate() - 1); // Previous day
    
    const periodStart = new Date(targetDate);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date(targetDate);
    periodEnd.setHours(23, 59, 59, 999);

    console.log(`Generating daily metrics for ${periodStart.toISOString().split('T')[0]}`);

    try {
      // Generate various metrics
      await Promise.all([
        this.generateLoginMetrics(periodStart, periodEnd, MetricPeriod.DAILY),
        this.generateActivityMetrics(periodStart, periodEnd, MetricPeriod.DAILY),
        this.generateBookingMetrics(periodStart, periodEnd, MetricPeriod.DAILY),
        this.generateCarViewMetrics(periodStart, periodEnd, MetricPeriod.DAILY),
        this.generateErrorMetrics(periodStart, periodEnd, MetricPeriod.DAILY),
      ]);

      console.log(`Daily metrics generated successfully for ${periodStart.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Error generating daily metrics:', error);
      throw error;
    }
  }

  /**
   * Generate login metrics
   */
  private async generateLoginMetrics(
    periodStart: Date,
    periodEnd: Date,
    period: MetricPeriod
  ): Promise<void> {
    const loginCount = await prisma.userActivity.count({
      where: {
        action: 'LOGIN',
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const uniqueUsers = await prisma.userActivity.groupBy({
      by: ['userId'],
      where: {
        action: 'LOGIN',
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
        userId: { not: null },
      },
    });

    // Total logins
    await this.createMetric({
      metricType: 'daily_logins',
      metricValue: loginCount,
      metricUnit: 'count',
      period,
      periodStart,
      periodEnd,
      metadata: JSON.stringify({ uniqueUsers: uniqueUsers.length }),
    });

    // Unique daily users
    await this.createMetric({
      metricType: 'daily_active_users',
      metricValue: uniqueUsers.length,
      metricUnit: 'count',
      period,
      periodStart,
      periodEnd,
    });
  }

  /**
   * Generate general activity metrics
   */
  private async generateActivityMetrics(
    periodStart: Date,
    periodEnd: Date,
    period: MetricPeriod
  ): Promise<void> {
    const totalActivities = await prisma.userActivity.count({
      where: {
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const activitiesByAction = await prisma.userActivity.groupBy({
      by: ['action'],
      where: {
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _count: { id: true },
    });

    // Total activities
    await this.createMetric({
      metricType: 'total_activities',
      metricValue: totalActivities,
      metricUnit: 'count',
      period,
      periodStart,
      periodEnd,
      metadata: JSON.stringify({ byAction: activitiesByAction }),
    });

    // Activities by action type
    for (const activity of activitiesByAction) {
      await this.createMetric({
        metricType: `activities_${activity.action.toLowerCase()}`,
        metricValue: activity._count.id,
        metricUnit: 'count',
        period,
        periodStart,
        periodEnd,
        dimensions: JSON.stringify({ action: activity.action }),
      });
    }
  }

  /**
   * Generate booking metrics
   */
  private async generateBookingMetrics(
    periodStart: Date,
    periodEnd: Date,
    period: MetricPeriod
  ): Promise<void> {
    const bookingActivities = await prisma.userActivity.count({
      where: {
        resource: 'booking',
        action: 'CREATE',
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const bookingViews = await prisma.userActivity.count({
      where: {
        resource: 'booking',
        action: 'READ',
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    // Booking creations
    await this.createMetric({
      metricType: 'daily_bookings',
      metricValue: bookingActivities,
      metricUnit: 'count',
      period,
      periodStart,
      periodEnd,
    });

    // Booking conversion rate (bookings / views)
    if (bookingViews > 0) {
      const conversionRate = (bookingActivities / bookingViews) * 100;
      await this.createMetric({
        metricType: 'booking_conversion_rate',
        metricValue: conversionRate,
        metricUnit: 'percentage',
        period,
        periodStart,
        periodEnd,
        metadata: JSON.stringify({ bookings: bookingActivities, views: bookingViews }),
      });
    }
  }

  /**
   * Generate car view metrics
   */
  private async generateCarViewMetrics(
    periodStart: Date,
    periodEnd: Date,
    period: MetricPeriod
  ): Promise<void> {
    const carViews = await prisma.userActivity.count({
      where: {
        resource: 'car',
        action: 'READ',
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const uniqueCarViews = await prisma.userActivity.groupBy({
      by: ['resourceId'],
      where: {
        resource: 'car',
        action: 'READ',
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
        resourceId: { not: null },
      },
    });

    // Total car views
    await this.createMetric({
      metricType: 'car_views',
      metricValue: carViews,
      metricUnit: 'count',
      period,
      periodStart,
      periodEnd,
      metadata: JSON.stringify({ uniqueCars: uniqueCarViews.length }),
    });
  }

  /**
   * Generate error metrics
   */
  private async generateErrorMetrics(
    periodStart: Date,
    periodEnd: Date,
    period: MetricPeriod
  ): Promise<void> {
    const errorCount = await prisma.userActivity.count({
      where: {
        severity: 'ERROR',
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const totalActivities = await prisma.userActivity.count({
      where: {
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    // Error count
    await this.createMetric({
      metricType: 'daily_errors',
      metricValue: errorCount,
      metricUnit: 'count',
      period,
      periodStart,
      periodEnd,
    });

    // Error rate
    if (totalActivities > 0) {
      const errorRate = (errorCount / totalActivities) * 100;
      await this.createMetric({
        metricType: 'error_rate',
        metricValue: errorRate,
        metricUnit: 'percentage',
        period,
        periodStart,
        periodEnd,
        metadata: JSON.stringify({ errors: errorCount, total: totalActivities }),
      });
    }
  }

  /**
   * Create a metric record
   */
  private async createMetric(data: {
    metricType: string;
    metricValue: number;
    metricUnit?: string;
    period: MetricPeriod;
    periodStart: Date;
    periodEnd: Date;
    dimensions?: string;
    metadata?: string;
  }): Promise<void> {
    try {
      // Check if metric already exists for this period
      const existing = await prisma.activityMetrics.findFirst({
        where: {
          metricType: data.metricType,
          period: data.period,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
        },
      });

      if (existing) {
        // Update existing metric
        await prisma.activityMetrics.update({
          where: { id: existing.id },
          data: {
            metricValue: data.metricValue,
            metricUnit: data.metricUnit,
            dimensions: data.dimensions,
            metadata: data.metadata,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new metric
        await prisma.activityMetrics.create({
          data,
        });
      }
    } catch (error) {
      console.error(`Error creating metric ${data.metricType}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old metrics
   */
  async cleanupOldMetrics(): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const result = await prisma.activityMetrics.deleteMany({
      where: {
        periodEnd: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old metrics`);
    return { deleted: result.count };
  }

  /**
   * Get metrics summary
   */
  async getMetricsSummary(): Promise<{
    totalMetrics: number;
    metricTypes: Array<{ metricType: string; count: number }>;
    latestMetrics: Date | null;
  }> {
    const [totalMetrics, metricTypes, latestMetric] = await Promise.all([
      prisma.activityMetrics.count(),
      prisma.activityMetrics.groupBy({
        by: ['metricType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.activityMetrics.findFirst({
        orderBy: { periodEnd: 'desc' },
        select: { periodEnd: true },
      }),
    ]);

    return {
      totalMetrics,
      metricTypes: metricTypes.map(m => ({
        metricType: m.metricType,
        count: m._count.id,
      })),
      latestMetrics: latestMetric?.periodEnd || null,
    };
  }
}

// Singleton instance
let metricsGeneratorInstance: MetricsGenerator | null = null;

export function getMetricsGenerator(config?: Partial<MetricsGeneratorConfig>): MetricsGenerator {
  if (!metricsGeneratorInstance) {
    metricsGeneratorInstance = new MetricsGenerator(config);
  }
  return metricsGeneratorInstance;
}

export function resetMetricsGenerator(): void {
  metricsGeneratorInstance = null;
}