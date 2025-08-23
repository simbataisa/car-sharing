/**
 * Data Retention and Cleanup Service
 * Manages activity log lifecycle and data retention policies
 */

import { PrismaClient, EventStatus } from '@prisma/client';
import { prisma } from './prisma';

export interface RetentionPolicy {
  name: string;
  description: string;
  retentionDays: number;
  conditions?: {
    severity?: string[];
    actions?: string[];
    resources?: string[];
    excludeUsers?: string[];
  };
  archiveBeforeDelete?: boolean;
  archiveLocation?: string;
}

export interface CleanupStats {
  totalRecordsProcessed: number;
  recordsDeleted: number;
  recordsArchived: number;
  spaceSavedMB: number;
  executionTimeMs: number;
  errors: string[];
}

export class DataRetentionService {
  private policies: RetentionPolicy[] = [];
  
  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    this.policies = [
      {
        name: 'debug_logs_cleanup',
        description: 'Remove debug-level logs after 7 days',
        retentionDays: 7,
        conditions: {
          severity: ['DEBUG'],
        },
      },
      {
        name: 'info_logs_cleanup',
        description: 'Remove info-level logs after 30 days',
        retentionDays: 30,
        conditions: {
          severity: ['INFO'],
        },
      },
      {
        name: 'warn_logs_retention',
        description: 'Remove warning logs after 90 days',
        retentionDays: 90,
        conditions: {
          severity: ['WARN'],
        },
      },
      {
        name: 'error_logs_retention',
        description: 'Archive error logs after 180 days, delete after 365 days',
        retentionDays: 365,
        conditions: {
          severity: ['ERROR', 'CRITICAL'],
        },
        archiveBeforeDelete: true,
      },
      {
        name: 'security_events_retention',
        description: 'Keep security events for 1 year',
        retentionDays: 365,
        conditions: {
          actions: ['LOGIN', 'LOGOUT', 'ADMIN_LOGIN', 'USER_PROMOTE', 'USER_DEMOTE'],
        },
      },
      {
        name: 'business_events_retention',
        description: 'Keep business events for 2 years',
        retentionDays: 730,
        conditions: {
          actions: ['BOOK', 'CANCEL_BOOKING', 'CONFIRM_BOOKING', 'COMPLETE_BOOKING'],
        },
      },
      {
        name: 'general_cleanup',
        description: 'Default cleanup for all other records after 90 days',
        retentionDays: 90,
      },
    ];
  }

  /**
   * Add a custom retention policy
   */
  addPolicy(policy: RetentionPolicy): void {
    // Validate policy
    if (!policy.name || !policy.retentionDays || policy.retentionDays < 1) {
      throw new Error('Invalid retention policy: name and retentionDays are required');
    }

    // Check for duplicate policy names
    if (this.policies.find(p => p.name === policy.name)) {
      throw new Error(`Policy with name '${policy.name}' already exists`);
    }

    this.policies.push(policy);
  }

  /**
   * Remove a retention policy
   */
  removePolicy(policyName: string): boolean {
    const index = this.policies.findIndex(p => p.name === policyName);
    if (index !== -1) {
      this.policies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all retention policies
   */
  getPolicies(): RetentionPolicy[] {
    return [...this.policies];
  }

  /**
   * Execute cleanup based on retention policies
   */
  async executeCleanup(dryRun: boolean = false): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      totalRecordsProcessed: 0,
      recordsDeleted: 0,
      recordsArchived: 0,
      spaceSavedMB: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      // Sort policies by priority (most specific first)
      const sortedPolicies = this.policies.sort((a, b) => {
        // Policies with conditions are more specific
        const aSpecificity = this.getPolicySpecificity(a);
        const bSpecificity = this.getPolicySpecificity(b);
        return bSpecificity - aSpecificity;
      });

      // Execute each policy
      for (const policy of sortedPolicies) {
        try {
          const policyStats = await this.executePolicyCleanup(policy, dryRun);
          stats.totalRecordsProcessed += policyStats.totalRecordsProcessed;
          stats.recordsDeleted += policyStats.recordsDeleted;
          stats.recordsArchived += policyStats.recordsArchived;
          stats.spaceSavedMB += policyStats.spaceSavedMB;
        } catch (error) {
          const errorMessage = `Policy '${policy.name}' failed: ${error instanceof Error ? error.message : String(error)}`;
          stats.errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      // Clean up orphaned activity events
      await this.cleanupOrphanedEvents(dryRun, stats);

      // Update activity metrics cleanup
      await this.cleanupOldMetrics(dryRun, stats);

    } catch (error) {
      stats.errors.push(`General cleanup error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      stats.executionTimeMs = Date.now() - startTime;
    }

    return stats;
  }

  /**
   * Execute cleanup for a specific policy
   */
  private async executePolicyCleanup(policy: RetentionPolicy, dryRun: boolean): Promise<CleanupStats> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const stats: CleanupStats = {
      totalRecordsProcessed: 0,
      recordsDeleted: 0,
      recordsArchived: 0,
      spaceSavedMB: 0,
      executionTimeMs: 0,
      errors: [],
    };

    // Build where clause based on policy conditions
    const whereClause = this.buildWhereClause(policy, cutoffDate);

    // Count records to be processed
    const recordCount = await prisma.userActivity.count({ where: whereClause });
    stats.totalRecordsProcessed = recordCount;

    if (recordCount === 0) {
      return stats;
    }

    console.log(`Policy '${policy.name}': Processing ${recordCount} records older than ${cutoffDate.toISOString()}`);

    if (dryRun) {
      console.log(`[DRY RUN] Would process ${recordCount} records for policy '${policy.name}'`);
      return stats;
    }

    // Archive records if required
    if (policy.archiveBeforeDelete) {
      const archiveStats = await this.archiveRecords(whereClause, policy);
      stats.recordsArchived = archiveStats.recordsArchived;
      stats.spaceSavedMB += archiveStats.spaceSavedMB;
    }

    // Delete records
    const deleteResult = await prisma.userActivity.deleteMany({
      where: whereClause,
    });

    stats.recordsDeleted = deleteResult.count;
    stats.spaceSavedMB += this.estimateSpaceSaved(deleteResult.count);

    console.log(`Policy '${policy.name}': Deleted ${deleteResult.count} records`);

    return stats;
  }

  /**
   * Build where clause for policy conditions
   */
  private buildWhereClause(policy: RetentionPolicy, cutoffDate: Date): any {
    const where: any = {
      timestamp: {
        lt: cutoffDate,
      },
    };

    if (policy.conditions) {
      if (policy.conditions.severity?.length) {
        where.severity = { in: policy.conditions.severity };
      }
      
      if (policy.conditions.actions?.length) {
        where.action = { in: policy.conditions.actions };
      }
      
      if (policy.conditions.resources?.length) {
        where.resource = { in: policy.conditions.resources };
      }
      
      if (policy.conditions.excludeUsers?.length) {
        where.userId = { notIn: policy.conditions.excludeUsers };
      }
    }

    return where;
  }

  /**
   * Archive records before deletion
   */
  private async archiveRecords(whereClause: any, policy: RetentionPolicy): Promise<{ recordsArchived: number; spaceSavedMB: number }> {
    // Fetch records to archive
    const records = await prisma.userActivity.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (records.length === 0) {
      return { recordsArchived: 0, spaceSavedMB: 0 };
    }

    // Create archive data
    const archiveData = {
      policy: policy.name,
      archivedAt: new Date().toISOString(),
      recordCount: records.length,
      records: records.map(record => ({
        ...record,
        requestData: record.requestData ? JSON.parse(record.requestData) : null,
        responseData: record.responseData ? JSON.parse(record.responseData) : null,
        metadata: record.metadata ? JSON.parse(record.metadata) : null,
        tags: record.tags ? record.tags.split(',') : [],
      })),
    };

    // Save to archive (could be file system, S3, etc.)
    const archiveLocation = policy.archiveLocation || `./archives/activity_${policy.name}_${Date.now()}.json`;
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure archive directory exists
      const archiveDir = path.dirname(archiveLocation);
      await fs.mkdir(archiveDir, { recursive: true });
      
      // Write archive file
      await fs.writeFile(archiveLocation, JSON.stringify(archiveData, null, 2));
      
      console.log(`Archived ${records.length} records to ${archiveLocation}`);
      
      return {
        recordsArchived: records.length,
        spaceSavedMB: this.estimateSpaceSaved(records.length),
      };
    } catch (error) {
      console.error(`Failed to archive records for policy '${policy.name}':`, error);
      throw error;
    }
  }

  /**
   * Clean up orphaned activity events
   */
  private async cleanupOrphanedEvents(dryRun: boolean, stats: CleanupStats): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 1); // Clean up events older than 1 day

    const whereClause = {
      OR: [
        {
          status: EventStatus.COMPLETED,
          processedAt: {
            lt: cutoffDate,
          },
        },
        {
          status: EventStatus.FAILED,
          updatedAt: {
            lt: cutoffDate,
          },
        },
        {
          status: EventStatus.DISCARDED,
          updatedAt: {
            lt: cutoffDate,
          },
        },
      ],
    };

    const eventCount = await prisma.activityEvent.count({ where: whereClause });
    stats.totalRecordsProcessed += eventCount;

    if (eventCount > 0) {
      console.log(`Cleaning up ${eventCount} orphaned activity events`);
      
      if (!dryRun) {
        const deleteResult = await prisma.activityEvent.deleteMany({ where: whereClause });
        stats.recordsDeleted += deleteResult.count;
        console.log(`Deleted ${deleteResult.count} orphaned activity events`);
      }
    }
  }

  /**
   * Clean up old metrics
   */
  private async cleanupOldMetrics(dryRun: boolean, stats: CleanupStats): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365); // Keep metrics for 1 year

    const whereClause = {
      periodEnd: {
        lt: cutoffDate,
      },
    };

    const metricCount = await prisma.activityMetrics.count({ where: whereClause });
    stats.totalRecordsProcessed += metricCount;

    if (metricCount > 0) {
      console.log(`Cleaning up ${metricCount} old activity metrics`);
      
      if (!dryRun) {
        const deleteResult = await prisma.activityMetrics.deleteMany({ where: whereClause });
        stats.recordsDeleted += deleteResult.count;
        console.log(`Deleted ${deleteResult.count} old activity metrics`);
      }
    }
  }

  /**
   * Get policy specificity score (higher = more specific)
   */
  private getPolicySpecificity(policy: RetentionPolicy): number {
    let score = 0;
    
    if (policy.conditions) {
      if (policy.conditions.severity?.length) score += 10;
      if (policy.conditions.actions?.length) score += 10;
      if (policy.conditions.resources?.length) score += 10;
      if (policy.conditions.excludeUsers?.length) score += 5;
    }
    
    return score;
  }

  /**
   * Estimate space saved in MB
   */
  private estimateSpaceSaved(recordCount: number): number {
    // Rough estimate: ~2KB per activity record on average
    return (recordCount * 2048) / (1024 * 1024);
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<{
    totalRecords: number;
    recordsByAge: Array<{ ageRange: string; count: number }>;
    recordsBySeverity: Array<{ severity: string; count: number }>;
    recordsByAction: Array<{ action: string; count: number }>;
    estimatedSizeMB: number;
  }> {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const [totalRecords, recordsByAge, recordsBySeverity, recordsByAction] = await Promise.all([
      // Total records
      prisma.userActivity.count(),
      
      // Records by age
      Promise.all([
        prisma.userActivity.count({
          where: {
            timestamp: {
              gte: new Date(now.getTime() - oneDay),
            },
          },
        }),
        prisma.userActivity.count({
          where: {
            timestamp: {
              gte: new Date(now.getTime() - 7 * oneDay),
              lt: new Date(now.getTime() - oneDay),
            },
          },
        }),
        prisma.userActivity.count({
          where: {
            timestamp: {
              gte: new Date(now.getTime() - 30 * oneDay),
              lt: new Date(now.getTime() - 7 * oneDay),
            },
          },
        }),
        prisma.userActivity.count({
          where: {
            timestamp: {
              gte: new Date(now.getTime() - 90 * oneDay),
              lt: new Date(now.getTime() - 30 * oneDay),
            },
          },
        }),
        prisma.userActivity.count({
          where: {
            timestamp: {
              lt: new Date(now.getTime() - 90 * oneDay),
            },
          },
        }),
      ]),
      
      // Records by severity
      prisma.userActivity.groupBy({
        by: ['severity'],
        _count: { id: true },
      }),
      
      // Records by action
      prisma.userActivity.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const [last24h, last7d, last30d, last90d, older] = recordsByAge;

    return {
      totalRecords,
      recordsByAge: [
        { ageRange: 'Last 24 hours', count: last24h },
        { ageRange: 'Last 7 days', count: last7d },
        { ageRange: 'Last 30 days', count: last30d },
        { ageRange: 'Last 90 days', count: last90d },
        { ageRange: 'Older than 90 days', count: older },
      ],
      recordsBySeverity: recordsBySeverity.map(item => ({
        severity: item.severity,
        count: item._count.id,
      })),
      recordsByAction: recordsByAction.map(item => ({
        action: item.action,
        count: item._count.id,
      })),
      estimatedSizeMB: this.estimateSpaceSaved(totalRecords),
    };
  }

  /**
   * Schedule automatic cleanup
   */
  startScheduledCleanup(intervalHours: number = 24): NodeJS.Timeout {
    console.log(`Starting scheduled cleanup every ${intervalHours} hours`);
    
    return setInterval(async () => {
      try {
        console.log('Running scheduled activity cleanup...');
        const stats = await this.executeCleanup(false);
        console.log('Scheduled cleanup completed:', stats);
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}

// Singleton instance
let retentionServiceInstance: DataRetentionService | null = null;

export function getRetentionService(): DataRetentionService {
  if (!retentionServiceInstance) {
    retentionServiceInstance = new DataRetentionService();
  }
  return retentionServiceInstance;
}

export default DataRetentionService;