import { prisma } from "@/lib/prisma";

// Types for basic RBAC
export interface UserWithRoles {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  department?: string | null;
  location?: string | null;
  attributes?: string | null;
  userRoles: any[];
  userPermissions: any[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  displayName?: string;
  description?: string | null;
}

/**
 * Get user with all roles and permissions
 */
export async function getUserWithRoles(
  userId: string
): Promise<UserWithRoles | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      department: user.department || null,
      location: user.location || null,
      attributes: user.attributes || null,
      userRoles: user.userRoles,
      userPermissions: user.userPermissions,
    };
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

/**
 * Get all permissions for a user (from roles and direct permissions)
 */
export function getUserPermissions(user: UserWithRoles): Permission[] {
  const permissions = new Map<string, Permission>();

  // Add permissions from roles
  user.userRoles.forEach((userRole: any) => {
    userRole.role.rolePermissions.forEach((rolePermission: any) => {
      permissions.set(
        rolePermission.permission.name,
        rolePermission.permission
      );
    });
  });

  // Add direct user permissions
  user.userPermissions.forEach((userPermission: any) => {
    permissions.set(userPermission.permission.name, userPermission.permission);
  });

  return Array.from(permissions.values());
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(
  userId: string,
  roleName: string,
  assignedById: string,
  expiresAt?: Date
): Promise<boolean> {
  try {
    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      console.error("User not found or inactive:", userId);
      return false;
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName, isActive: true },
    });

    if (!role) {
      console.error("Role not found or inactive:", roleName);
      return false;
    }

    // Check if user already has this role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: userId,
          roleId: role.id,
        },
      },
    });

    if (existingUserRole) {
      // Update existing role assignment
      await prisma.userRole.update({
        where: { id: existingUserRole.id },
        data: {
          assignedBy: assignedById,
          expiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new role assignment
      await prisma.userRole.create({
        data: {
          userId: userId,
          roleId: role.id,
          assignedBy: assignedById,
          expiresAt: expiresAt,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error assigning role to user:", error);
    return false;
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  userId: string,
  roleName: string
): Promise<boolean> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error("User not found:", userId);
      return false;
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      console.error("Role not found:", roleName);
      return false;
    }

    // Remove the role assignment
    await prisma.userRole.deleteMany({
      where: {
        userId: userId,
        roleId: role.id,
      },
    });

    return true;
  } catch (error) {
    console.error("Error removing role from user:", error);
    return false;
  }
}

/**
 * Basic authorization check (simplified)
 */
export async function authorize(
  userId: string,
  resource: string,
  action: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const user = await getUserWithRoles(userId);
    if (!user) {
      return { allowed: false, reason: "User not found or inactive" };
    }

    // Get all user permissions
    const permissions = getUserPermissions(user);
    
    // Check for exact permission match
    const requiredPermission = `${resource}:${action}`;
    const hasPermission = permissions.some(p => p.name === requiredPermission);
    
    if (hasPermission) {
      return { allowed: true };
    }
    
    // Check for wildcard permissions
    const hasWildcardResource = permissions.some(p => p.name === `${resource}:*`);
    const hasWildcardAction = permissions.some(p => p.name === `*:${action}`);
    const hasFullWildcard = permissions.some(p => p.name === "*:*");
    
    if (hasWildcardResource || hasWildcardAction || hasFullWildcard) {
      return { allowed: true };
    }
    
    // Check for admin permissions (legacy support)
    const hasAdminPermission = permissions.some(p => p.name === "admin:*" || p.name === "admin:admin");
    if (hasAdminPermission && (resource === "admin" || action === "admin")) {
      return { allowed: true };
    }
    
    return { 
      allowed: false, 
      reason: `Missing required permission: ${requiredPermission}` 
    };
  } catch (error) {
    console.error("Authorization error:", error);
    return { allowed: false, reason: "Authorization system error" };
  }
}

/**
 * Check if user exists and is active
 */
export async function isUserActive(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });
    return user?.isActive ?? false;
  } catch (error) {
    console.error("Error checking user status:", error);
    return false;
  }
}

/**
 * Check if a permission is a system permission that should not be modified
 */
export function isSystemPermission(permissionName: string): boolean {
  const systemPermissions = [
    'admin:*',
    'admin:read',
    'admin:write',
    'admin:delete',
    'system:*',
    'rbac:*',
    'rbac:read',
    'rbac:write',
    'rbac:delete'
  ];
  return systemPermissions.includes(permissionName);
}

/**
 * Check if a permission is currently assigned to any roles or users
 */
export async function isPermissionInUse(permissionId: string): Promise<boolean> {
  try {
    const [roleCount, userCount] = await Promise.all([
      prisma.rolePermission.count({
        where: { permissionId }
      }),
      prisma.userPermission.count({
        where: { permissionId }
      })
    ]);
    return roleCount > 0 || userCount > 0;
  } catch (error) {
    console.error('Error checking permission usage:', error);
    return true; // Err on the side of caution
  }
}

/**
 * Validate permission data for creation/update
 */
export function validatePermissionData(data: {
  name: string;
  resource: string;
  action: string;
  displayName?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate name format (resource:action)
  if (!data.name.match(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_*-]+$/)) {
    errors.push('Permission name must follow format "resource:action"');
  }
  
  // Validate resource
  if (!data.resource || data.resource.length < 2) {
    errors.push('Resource must be at least 2 characters long');
  }
  
  // Validate action
  if (!data.action || data.action.length < 1) {
    errors.push('Action must be at least 1 character long');
  }
  
  // Validate name matches resource:action
  if (data.name !== `${data.resource}:${data.action}`) {
    errors.push('Permission name must match "resource:action" format');
  }
  
  // Validate displayName if provided
  if (data.displayName && data.displayName.length < 3) {
    errors.push('Display name must be at least 3 characters long');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if user has super admin privileges
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await getUserWithRoles(userId);
    if (!user) return false;
    
    // Check if user has SUPER_ADMIN role
    const hasSuperAdminRole = user.userRoles.some(
      (userRole: any) => userRole.role.name === 'SUPER_ADMIN'
    );
    
    // Check if user has admin:* permission
    const permissions = getUserPermissions(user);
    const hasAdminWildcard = permissions.some(p => p.name === 'admin:*');
    
    return hasSuperAdminRole || hasAdminWildcard;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}
