import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  generateActivationToken,
  generateActivationTokenExpiry,
  sendActivationEmail,
} from "@/lib/email";

// Validation schema for user creation/update
const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

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

// GET /api/admin/users - Get all users with pagination and filtering
export const GET = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const isActive = searchParams.get("isActive");

    const offset = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== null && isActive !== "") {
      where.isActive = isActive === "true";
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          emailVerificationStatus: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
});

// POST /api/admin/users - Create new user with activation link
export const POST = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Generate activation token
    const activationToken = generateActivationToken();
    const activationTokenExpires = generateActivationTokenExpiry();

    // Create user with PENDING_EMAIL_VERIFICATION status
    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: null, // No password until activation
        role: validatedData.role,
        isActive: false, // User is inactive until email verification
        emailVerified: false,
        emailVerificationStatus: "PENDING_EMAIL_VERIFICATION",
        activationToken,
        activationTokenExpires,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        emailVerificationStatus: true,
        createdAt: true,
      },
    });

    // Send activation email
    try {
      await sendActivationEmail({
        email: validatedData.email,
        userName: validatedData.name,
        activationToken,
      });
    } catch (emailError) {
      console.error("Failed to send activation email:", emailError);
      // Don't fail user creation if email fails, but log it
    }

    return NextResponse.json(
      {
        user: newUser,
        message:
          "User created successfully. Activation email has been sent to the user's email address.",
        activationRequired: true,
        instructions: {
          userNotification:
            "The user has been sent an activation link via email",
          nextSteps:
            "User must click the activation link within 24 hours to complete account setup",
          activationExpires: "24 hours",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
});
