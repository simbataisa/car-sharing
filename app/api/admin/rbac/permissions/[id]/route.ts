import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, isSuperAdmin, validatePermissionData, isSystemPermission, isPermissionInUse } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { withAnnotationTracking } from "@/lib/annotations/middleware";
import { z } from "zod";

// Validation schema for updating individual permission
const updatePermissionSchema = z.object({
  name: z.string().min(1, "Permission name is required").regex(/^[a-z_]+:[a-z_]+$/, "Permission name must follow format 'resource:action'").optional(),
  displayName: z.string().min(1, "Display name is required").optional(),
  description: z.string().optional(),
  resource: z.string().min(1, "Resource is required").optional(),
  action: z.string().min(1, "Action is required").optional(),
});

// GET /api/admin/rbac/permissions/[id] - Get single permission
async function getHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const authResult = await authorize(session.user.id, "admin", "read");
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const permission = await prisma.permission.findUnique({
      where: { id: params.id },
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

    if (!permission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    return NextResponse.json(permission);
  } catch (error) {
    console.error("Error fetching permission:", error);
    return NextResponse.json(
      { error: "Failed to fetch permission" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/rbac/permissions/[id] - Update single permission
async function putHandler(request: NextRequest, { params }: { params: { id: string } }) {
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
    const validatedData = updatePermissionSchema.parse(body);

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

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id: params.id }
    });

    if (!existingPermission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    // Prevent updating system permissions
    if (isSystemPermission(existingPermission.name)) {
      return NextResponse.json({ error: "Cannot update system permissions" }, { status: 403 });
    }

    // Check if permission is assigned to roles or users
    const inUse = await isPermissionInUse(params.id);
    if (inUse) {
      return NextResponse.json(
        { error: "Cannot update permission that is assigned to roles or users" },
        { status: 409 }
      );
    }

    const updatedPermission = await prisma.permission.update({
      where: { id: params.id },
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

// DELETE /api/admin/rbac/permissions/[id] - Delete single permission
async function deleteHandler(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id: params.id }
    });

    if (!existingPermission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    // Prevent deleting system permissions
    if (isSystemPermission(existingPermission.name)) {
      return NextResponse.json({ error: "Cannot delete system permissions" }, { status: 403 });
    }

    // Check if permission is assigned to roles or users
    const inUse = await isPermissionInUse(params.id);
    if (inUse) {
      return NextResponse.json(
        { error: "Cannot delete permission that is assigned to roles or users" },
        { status: 409 }
      );
    }

    await prisma.permission.delete({
      where: { id: params.id }
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
  description: "Get single permission with roles and users",
  tags: ["admin", "rbac", "permissions", "detail"]
});

export const PUT = withAnnotationTracking(putHandler, {
  action: "UPDATE",
  resource: "admin_rbac_permissions",
  description: "Update single permission",
  tags: ["admin", "rbac", "permissions", "update"]
});

export const DELETE = withAnnotationTracking(deleteHandler, {
  action: "DELETE",
  resource: "admin_rbac_permissions",
  description: "Delete single permission",
  tags: ["admin", "rbac", "permissions", "delete"]
});