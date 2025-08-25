import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { withAnnotationTracking } from "@/lib/annotations/middleware";

// GET /api/admin/rbac/permissions - Get all permissions
async function getHandler(request: NextRequest) {
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
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "admin_rbac_permissions",
  description: "Get all permissions with roles and users",
  tags: ["admin", "rbac", "permissions", "list"]
});