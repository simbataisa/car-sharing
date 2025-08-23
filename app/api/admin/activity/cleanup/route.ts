/**
 * Activity Cleanup API Route
 * Provides data retention and cleanup operations for administrators
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserWithRoles, type UserWithRoles } from '@/lib/rbac';
import { getRetentionService } from '@/lib/data-retention';
import type { RetentionPolicy } from '@/lib/data-retention';
import { withAnnotationTracking } from '@/lib/annotations/middleware';

// GET - Get retention statistics and policies
async function getHandler(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions
    const userWithRoles = await getUserWithRoles(session.user.id);
    const hasAdminAccess = userWithRoles?.userRoles.some(ur => ur.role.name === 'ADMIN') ||
      userWithRoles?.userRoles.some(ur => ['SUPER_ADMIN', 'ADMIN'].includes(ur.role.name));

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const retentionService = getRetentionService();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get retention statistics
      const stats = await retentionService.getRetentionStats();
      return NextResponse.json({
        success: true,
        data: stats,
      });
    } else if (action === 'policies') {
      // Get retention policies
      const policies = retentionService.getPolicies();
      return NextResponse.json({
        success: true,
        data: policies,
      });
    } else {
      // Get both stats and policies
      const [stats, policies] = await Promise.all([
        retentionService.getRetentionStats(),
        retentionService.getPolicies(),
      ]);
      
      return NextResponse.json({
        success: true,
        data: {
          stats,
          policies,
        },
      });
    }

  } catch (error) {
    console.error('Error fetching retention data:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Execute cleanup or manage retention policies
async function postHandler(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions
    const userWithRoles = await getUserWithRoles(session.user.id);
    const hasAdminAccess = userWithRoles?.userRoles.some(ur => ur.role.name === 'ADMIN') ||
      userWithRoles?.userRoles.some(ur => ['SUPER_ADMIN', 'ADMIN'].includes(ur.role.name));

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, dryRun = false, policy } = body;
    const retentionService = getRetentionService();

    switch (action) {
      case 'cleanup':
        // Execute cleanup
        console.log(`Executing cleanup (dryRun: ${dryRun}) requested by ${session.user.email}`);
        
        const cleanupStats = await retentionService.executeCleanup(dryRun);
        
        // Log the cleanup action
        const { getActivityTracker } = await import('@/lib/activity-tracker');
        const { ActivityEventFactory } = await import('@/lib/events/factory');
        
        const context = ActivityEventFactory.createContext(null, {
          userId: session.user.id,
          source: 'admin',
        });
        
        await getActivityTracker().trackAdmin(
          'admin.user.updated',
          session.user.id,
          'CUSTOM',
          context,
          {
            changes: {
              action: 'data_cleanup',
              dryRun,
              stats: cleanupStats,
            },
            justification: 'Data retention cleanup',
          }
        );
        
        return NextResponse.json({
          success: true,
          message: dryRun ? 'Dry run completed' : 'Cleanup completed',
          data: cleanupStats,
        });

      case 'add_policy':
        // Add retention policy
        if (!policy) {
          return NextResponse.json(
            { error: 'Policy data required' },
            { status: 400 }
          );
        }
        
        retentionService.addPolicy(policy as RetentionPolicy);
        
        return NextResponse.json({
          success: true,
          message: `Policy '${policy.name}' added successfully`,
        });

      case 'remove_policy':
        // Remove retention policy
        const { policyName } = body;
        
        if (!policyName) {
          return NextResponse.json(
            { error: 'Policy name required' },
            { status: 400 }
          );
        }
        
        const removed = retentionService.removePolicy(policyName);
        
        if (!removed) {
          return NextResponse.json(
            { error: 'Policy not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: `Policy '${policyName}' removed successfully`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in cleanup API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Emergency cleanup (immediate deletion without archiving)
async function deleteHandler(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check super admin permissions for emergency cleanup
    const userWithRoles = await getUserWithRoles(session.user.id);
    const isSuperAdmin = userWithRoles?.userRoles.some(ur => ur.role.name === 'SUPER_ADMIN');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Super admin access required for emergency cleanup' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { olderThanDays, confirm } = body;

    if (!confirm || confirm !== 'DELETE_ALL_DATA') {
      return NextResponse.json(
        { error: 'Confirmation required: confirm must be "DELETE_ALL_DATA"' },
        { status: 400 }
      );
    }

    if (!olderThanDays || olderThanDays < 1) {
      return NextResponse.json(
        { error: 'olderThanDays must be specified and >= 1' },
        { status: 400 }
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.log(`Emergency cleanup: Deleting all activity data older than ${cutoffDate.toISOString()}`);

    // Emergency cleanup - direct database operations
    const { prisma } = await import('@/lib/prisma');
    
    const [activitiesDeleted, eventsDeleted, metricsDeleted] = await Promise.all([
      prisma.userActivity.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      }),
      prisma.activityEvent.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      }),
      prisma.activityMetrics.deleteMany({
        where: {
          periodEnd: {
            lt: cutoffDate,
          },
        },
      }),
    ]);

    const totalDeleted = activitiesDeleted.count + eventsDeleted.count + metricsDeleted.count;

    // Log the emergency cleanup
    const { getActivityTracker } = await import('@/lib/activity-tracker');
    const { ActivityEventFactory } = await import('@/lib/events/factory');
    
    const context = ActivityEventFactory.createContext(null, {
      userId: session.user.id,
      source: 'admin',
    });
    
    await getActivityTracker().trackAdmin(
      'admin.user.updated',
      session.user.id,
      'DELETE',
      context,
      {
        changes: {
          action: 'emergency_cleanup',
          olderThanDays,
          activitiesDeleted: activitiesDeleted.count,
          eventsDeleted: eventsDeleted.count,
          metricsDeleted: metricsDeleted.count,
          totalDeleted,
        },
        justification: 'Emergency data cleanup',
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Emergency cleanup completed',
      data: {
        activitiesDeleted: activitiesDeleted.count,
        eventsDeleted: eventsDeleted.count,
        metricsDeleted: metricsDeleted.count,
        totalDeleted,
        cutoffDate: cutoffDate.toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in emergency cleanup:', error);
    
    return NextResponse.json(
      { 
        error: 'Emergency cleanup failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Export tracked handlers
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "admin_activity_cleanup",
  description: "Get retention statistics and policies",
  tags: ["admin", "activity", "cleanup", "stats"]
});

export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "admin_activity_cleanup",
  description: "Execute cleanup or manage retention policies",
  tags: ["admin", "activity", "cleanup", "execute"]
});

export const DELETE = withAnnotationTracking(deleteHandler, {
  action: "DELETE",
  resource: "admin_activity_cleanup",
  description: "Emergency cleanup with immediate deletion",
  tags: ["admin", "activity", "cleanup", "emergency"]
});