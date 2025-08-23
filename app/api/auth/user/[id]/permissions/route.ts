import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoles, getUserPermissions } from "@/lib/rbac";
import { withAnnotationTracking } from "@/lib/annotations/middleware";

async function getHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user with all roles and permissions
    const user = await getUserWithRoles(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 404 }
      );
    }

    // Extract all permissions
    const permissions = getUserPermissions(user);

    return NextResponse.json({
      user,
      permissions,
      roles: user.userRoles.map((ur) => ur.role.name),
      summary: {
        totalPermissions: permissions.length,
        totalRoles: user.userRoles.length,
        isAdmin: user.userRoles.some((ur) =>
          ["SUPER_ADMIN", "ADMIN"].includes(ur.role.name)
        ),
        isSuperAdmin: user.userRoles.some(
          (ur) => ur.role.name === "SUPER_ADMIN"
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export tracked handler
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "user_permissions",
  description: "Get user roles and permissions",
  tags: ["auth", "rbac", "permissions"]
});
