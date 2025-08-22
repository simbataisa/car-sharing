import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignRoleToUser, removeRoleFromUser, authorize } from "@/lib/rbac";
import { auth } from "@/lib/auth";

// GET /api/admin/rbac/roles - Get all roles
export async function GET(request: NextRequest) {
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
export async function POST(request: NextRequest) {
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
