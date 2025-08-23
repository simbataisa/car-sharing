import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getActivityTracker } from "@/lib/activity-tracker";
import { ActivityEventFactory } from "@/lib/events/factory";

const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/users/[id] - Get single user
export const GET = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const url = new URL(req.url);
    const userId = url.pathname.split("/").pop();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
          },
        },
        bookings: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            totalPrice: true,
            status: true,
            car: {
              select: {
                make: true,
                model: true,
                year: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5, // Show last 5 bookings
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
});

// PUT /api/admin/users/[id] - Update user
export const PUT = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const url = new URL(req.url);
    const userId = url.pathname.split("/").pop();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deactivating themselves
    if (userId === adminUser.id) {
      const body = await req.json();
      if (body.isActive === false) {
        return NextResponse.json(
          { error: "You cannot deactivate your own account" },
          { status: 400 }
        );
      }
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if email is being changed and if it already exists
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.isActive !== undefined)
      updateData.isActive = validatedData.isActive;

    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    // Update user
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Track user update activity
      const context = ActivityEventFactory.createContext(req, {
        userId: adminUser.id,
        source: "api",
      });

      // Determine if this is a status change (activation/deactivation)
      const isStatusChange = validatedData.hasOwnProperty('isActive') && 
        existingUser.isActive !== validatedData.isActive;
      
      const action = isStatusChange 
        ? (validatedData.isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE")
        : "UPDATE";

      await getActivityTracker().trackActivity(action, "user", context, {
        resourceId: userId,
        description: isStatusChange 
          ? `${validatedData.isActive ? 'Activated' : 'Deactivated'} user: ${updatedUser.name} (${updatedUser.email})`
          : `Updated user: ${updatedUser.name} (${updatedUser.email})`,
        metadata: {
          userId: userId,
          userName: updatedUser.name,
          userEmail: updatedUser.email,
          updatedFields: Object.keys(validatedData),
          previousData: {
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role,
            isActive: existingUser.isActive,
          },
          newData: {
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
          },
          isStatusChange,
        },
        severity: isStatusChange ? "WARN" : "INFO",
        tags: isStatusChange 
          ? ["user-management", "admin-action", "status-change", validatedData.isActive ? "activation" : "deactivation"]
          : ["user-management", "admin-action"],
      });

      return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/users/[id] - Delete user
export const DELETE = withAdminAuth(
  async (req: NextRequest, adminUser: any) => {
    try {
      const url = new URL(req.url);
      const userId = url.pathname.split("/").pop();

      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }

      // Prevent admin from deleting themselves
      if (userId === adminUser.id) {
        return NextResponse.json(
          { error: "You cannot delete your own account" },
          { status: 400 }
        );
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      });

      if (!existingUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if user has active bookings
      const activeBookings = await prisma.booking.count({
        where: {
          userId: userId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      });

      if (activeBookings > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot delete user with active bookings. Please cancel or complete all bookings first.",
          },
          { status: 400 }
        );
      }

      // Soft delete by deactivating instead of hard delete to preserve data integrity
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${existingUser.email}`, // Prevent email conflicts
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      });

      // Track user deletion activity
      const context = ActivityEventFactory.createContext(req, {
        userId: adminUser.id,
        source: "api",
      });

      await getActivityTracker().trackActivity("DELETE", "user", context, {
        resourceId: userId,
        description: `Deleted user: ${existingUser.name} (${existingUser.email})`,
        metadata: {
          userId: userId,
          userName: existingUser.name,
          userEmail: existingUser.email,
          userRole: existingUser.role,
          hadActiveBookings: activeBookings > 0,
          totalBookings: existingUser._count.bookings,
          deletedAt: new Date().toISOString(),
          softDelete: true,
        },
        severity: "WARN",
        tags: ["user-management", "admin-action", "deletion", "soft-delete"],
      });

      return NextResponse.json({
        message: "User deactivated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }
  }
);
