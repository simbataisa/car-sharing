import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignRoleToUser, removeRoleFromUser, authorize } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { withAnnotationTracking } from "@/lib/annotations/middleware";

// GET /api/admin/rbac/roles - Get all roles
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

    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
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
      orderBy: { name: "asc" },
    });

    const rolesWithStats = roles.map((role) => ({
      ...role,
      permissionCount: role.rolePermissions.length,
      userCount: role.userRoles.length,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      users: role.userRoles.map((ur) => ur.user),
    }));

    return NextResponse.json({ roles: rolesWithStats });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/rbac/roles - Create new role
async function postHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const authResult = await authorize(session.user.id, "admin", "write");
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const {
      name,
      displayName,
      description,
      permissions = [],
    } = await request.json();

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Name and display name are required" },
        { status: 400 }
      );
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        displayName,
        description,
        isSystem: false,
      },
    });

    // Assign permissions
    if (permissions.length > 0) {
      const permissionRecords = await prisma.permission.findMany({
        where: { name: { in: permissions } },
      });

      await prisma.rolePermission.createMany({
        data: permissionRecords.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });
    }

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/rbac/roles - Update existing role
async function putHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const authResult = await authorize(session.user.id, "admin", "write");
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const {
      id,
      name,
      displayName,
      description,
      permissions = [],
    } = await request.json();

    if (!id || !name || !displayName) {
      return NextResponse.json(
        { error: "ID, name and display name are required" },
        { status: 400 }
      );
    }

    // Check if role exists and is not a system role
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    if (existingRole.isSystem) {
      return NextResponse.json(
        { error: "Cannot modify system roles" },
        { status: 403 }
      );
    }

    // Update role
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: name.toUpperCase(),
        displayName,
        description,
      },
    });

    // Update permissions - remove all existing and add new ones
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    if (permissions.length > 0) {
      const permissionRecords = await prisma.permission.findMany({
        where: { name: { in: permissions } },
      });

      await prisma.rolePermission.createMany({
        data: permissionRecords.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rbac/roles - Delete role
async function deleteHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const authResult = await authorize(session.user.id, "admin", "delete");
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    // Check if role exists and is not a system role
    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        userRoles: true,
      },
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    if (existingRole.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 403 }
      );
    }

    if (existingRole.userRoles.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete role that is assigned to users" },
        { status: 400 }
      );
    }

    // Delete role (cascade will handle rolePermissions)
    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export tracked handlers
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "admin_rbac_roles",
  description: "Get all roles with permissions and users",
  tags: ["admin", "rbac", "roles", "list"]
});

export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "admin_rbac_roles",
  description: "Create new role with permissions",
  tags: ["admin", "rbac", "roles", "create"]
});

export const PUT = withAnnotationTracking(putHandler, {
  action: "UPDATE",
  resource: "admin_rbac_roles",
  description: "Update existing role with permissions",
  tags: ["admin", "rbac", "roles", "update"]
});

export const DELETE = withAnnotationTracking(deleteHandler, {
  action: "DELETE",
  resource: "admin_rbac_roles",
  description: "Delete role",
  tags: ["admin", "rbac", "roles", "delete"]
});
