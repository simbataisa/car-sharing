import { NextRequest, NextResponse } from "next/server";
import { assignRoleToUser, removeRoleFromUser, authorize } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { withAnnotationTracking } from "@/lib/annotations/middleware";

// POST /api/admin/rbac/users/[id]/roles - Assign role to user
async function postHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const authResult = await authorize(session.user.id, "users", "admin");
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const userId = params.id;
    const { roleName, expiresAt } = await request.json();

    if (!roleName) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    const success = await assignRoleToUser(
      userId,
      roleName,
      session.user.id,
      expiresAt ? new Date(expiresAt) : undefined
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to assign role" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Role assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rbac/users/[id]/roles - Remove role from user
async function deleteHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const authResult = await authorize(session.user.id, "users", "admin");
    if (!authResult.allowed) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get("role");

    if (!roleName) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    const success = await removeRoleFromUser(userId, roleName);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to remove role" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Role removed successfully",
    });
  } catch (error) {
    console.error("Error removing role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export tracked handlers
export const POST = withAnnotationTracking(postHandler, {
  action: "UPDATE",
  resource: "admin_rbac_user_roles",
  description: "Assign role to user",
  tags: ["admin", "rbac", "users", "roles", "assign"]
});

export const DELETE = withAnnotationTracking(deleteHandler, {
  action: "DELETE",
  resource: "admin_rbac_user_roles",
  description: "Remove role from user",
  tags: ["admin", "rbac", "users", "roles", "remove"]
});
