import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, isSuperAdmin, validatePermissionData, isSystemPermission, isPermissionInUse } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { withAnnotationTracking } from "@/lib/annotations/middleware";
import { z } from "zod";

// Validation schemas
const createPermissionSchema = z.object({
  name: z.string().min(1, "Permission name is required").regex(/^[a-z_]+:[a-z_]+$/, "Permission name must follow format 'resource:action'"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
  resource: z.string().min(1, "Resource is required"),
  action: z.string().min(1, "Action is required"),
});

const updatePermissionSchema = z.object({
  name: z.string().min(1, "Permission name is required").regex(/^[a-z_]+:[a-z_]+$/, "Permission name must follow format 'resource:action'").optional(),
  displayName: z.string().min(1, "Display name is required").optional(),
  description: z.string().optional(),
  resource: z.string().min(1, "Resource is required").optional(),
  action: z.string().min(1, "Action is required").optional(),
});

// GET /api/admin/rbac/permissions - Get all permissions
async function getHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization - use 'access' action which maps to admin:access permission
    const authResult = await authorize(session.user.id, "admin", "access");
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const permissions = await prisma.permission.findMany({
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { resource: "asc" },
        { action: "asc" },
      ],
    });

    const permissionsWithStats = permissions.map((permission) => ({
      ...permission,
      roleCount: permission.rolePermissions.length,
      userCount: permission.userPermissions.length,
      roles: permission.rolePermissions.map((rp) => rp.role),
      users: permission.userPermissions.map((up) => up.user),
    }));

    // Group permissions by resource for better organization
    const groupedPermissions = permissionsWithStats.reduce((acc, permission) => {
      const resource = permission.resource;
      if (!acc[resource]) {
        acc[resource] = [];
      }
      acc[resource].push(permission);
      return acc;
    }, {} as Record<string, typeof permissionsWithStats>);

    return NextResponse.json({ 
      permissions: permissionsWithStats,
      groupedPermissions,
      resources: Object.keys(groupedPermissions).sort()
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export tracked handlers
// POST /api/admin/rbac/permissions - Create new permission
async function postHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin privileges
    const hasAdminAccess = await isSuperAdmin(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN can create permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createPermissionSchema.parse(body);

    // Validate permission data using enhanced validation
    const validation = validatePermissionData(validatedData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { name: validatedData.name }
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: "Permission already exists" },
        { status: 409 }
      );
    }

    // Prevent creation of system permissions
    if (isSystemPermission(validatedData.name)) {
      return NextResponse.json(
        { error: "Cannot create system permissions" },
        { status: 403 }
      );
    }

    const permission = await prisma.permission.create({
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        description: validatedData.description,
        resource: validatedData.resource,
        action: validatedData.action,
      },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error("Error creating permission:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create permission" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/rbac/permissions - Update permission (bulk update)
async function putHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin privileges
    const hasAdminAccess = await isSuperAdmin(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN can update permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permissionId, ...updateData } = body;

    if (!permissionId) {
      return NextResponse.json({ error: "Permission ID is required" }, { status: 400 });
    }

    const validatedData = updatePermissionSchema.parse(updateData);

    // Validate permission data using enhanced validation if all required fields are present
    if (validatedData.name && validatedData.resource && validatedData.action) {
      const validation = validatePermissionData({
        name: validatedData.name,
        resource: validatedData.resource,
        action: validatedData.action,
        displayName: validatedData.displayName
      });
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Validation failed", details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Check if permission exists and is not a system permission
    const existingPermission = await prisma.permission.findUnique({
      where: { id: permissionId }
    });

    if (!existingPermission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    // Prevent updating system permissions
    if (isSystemPermission(existingPermission.name)) {
      return NextResponse.json({ error: "Cannot update system permissions" }, { status: 403 });
    }

    // Check if new name conflicts with existing permission
    if (validatedData.name && validatedData.name !== existingPermission.name) {
      const nameConflict = await prisma.permission.findUnique({
        where: { name: validatedData.name }
      });
      if (nameConflict) {
        return NextResponse.json({ error: "Permission name already exists" }, { status: 400 });
      }
    }

    const updatedPermission = await prisma.permission.update({
      where: { id: permissionId },
      data: validatedData,
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedPermission);
  } catch (error) {
    console.error("Error updating permission:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update permission" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rbac/permissions - Delete permission (bulk delete)
async function deleteHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin privileges
    const hasAdminAccess = await isSuperAdmin(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN can delete permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permissionId } = body;

    if (!permissionId) {
      return NextResponse.json({ error: "Permission ID is required" }, { status: 400 });
    }

    // Check if permission exists and is not a system permission
    const existingPermission = await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        rolePermissions: true,
        userPermissions: true,
      }
    });

    if (!existingPermission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    // Prevent deletion of system permissions
    if (isSystemPermission(existingPermission.name)) {
      return NextResponse.json({ error: "Cannot delete system permissions" }, { status: 403 });
    }

    // Check if permission is assigned to any roles or users
    const inUse = await isPermissionInUse(existingPermission.id);
    if (inUse) {
      return NextResponse.json(
        { error: "Cannot delete permission that is assigned to roles or users" },
        { status: 409 }
      );
    }

    await prisma.permission.delete({
      where: { id: permissionId }
    });

    return NextResponse.json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json(
      { error: "Failed to delete permission" },
      { status: 500 }
    );
  }
}

export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "admin_rbac_permissions",
  description: "Get all permissions with roles and users",
  tags: ["admin", "rbac", "permissions", "list"]
});

export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "admin_rbac_permissions",
  description: "Create new permission",
  tags: ["admin", "rbac", "permissions", "create"]
});

export const PUT = withAnnotationTracking(putHandler, {
  action: "UPDATE",
  resource: "admin_rbac_permissions",
  description: "Update existing permission",
  tags: ["admin", "rbac", "permissions", "update"]
});

export const DELETE = withAnnotationTracking(deleteHandler, {
  action: "DELETE",
  resource: "admin_rbac_permissions",
  description: "Delete permission",
  tags: ["admin", "rbac", "permissions", "delete"]
});