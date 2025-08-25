import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function adminAuthMiddleware(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user from database to check current role and status
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        isActive: true,
        userRoles: {
          include: {
            role: true
          }
        }
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 }
      );
    }

    // Check for admin access - either legacy role or RBAC roles
    const hasAdminAccess = user.role === "ADMIN" || 
      user.userRoles.some(ur => ur.role.name === "ADMIN" || ur.role.name === "SUPER_ADMIN");

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Add user info to headers for downstream handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-admin-user-id", user.id);
    requestHeaders.set("x-admin-user-email", user.email);
    requestHeaders.set("x-admin-user-name", user.name);

    return { user, headers: requestHeaders };
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

export function withAdminAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await adminAuthMiddleware(req);

    if (authResult instanceof NextResponse) {
      return authResult; // Error response
    }

    // Update last login for admin user
    try {
      await prisma.user.update({
        where: { id: authResult.user.id },
        data: { lastLogin: new Date() },
      });
    } catch (error) {
      console.error("Failed to update last login:", error);
    }

    return handler(req, authResult.user);
  };
}

export async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true, 
        isActive: true,
        userRoles: {
          include: {
            role: true
          }
        }
      },
    });

    if (!user?.isActive) {
      return false;
    }

    // Check for admin access - either legacy role or RBAC roles
    return user.role === "ADMIN" || 
      user.userRoles.some(ur => ur.role.name === "ADMIN" || ur.role.name === "SUPER_ADMIN");
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}
