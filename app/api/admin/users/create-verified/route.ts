import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { adminCreateUserSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

// Helper to access emailVerification model with proper typing
const emailVerificationModel = (prisma as any).emailVerification;

// POST /api/admin/users/create-verified - Create user after email verification
export const POST = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const body = await req.json();
    const validatedData = adminCreateUserSchema.parse(body);

    // Check if email has been verified
    const verification = await emailVerificationModel.findFirst({
      where: {
        email: validatedData.email,
        verified: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Email not verified. Please verify email first." },
        { status: 400 }
      );
    }

    // Check if verification is still valid (within 1 hour of verification)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (verification.updatedAt < oneHourAgo) {
      return NextResponse.json(
        { error: "Email verification expired. Please verify email again." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Generate temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Send welcome email if requested
    if (validatedData.sendWelcomeEmail) {
      try {
        await sendWelcomeEmail({
          email: validatedData.email,
          userName: validatedData.name,
          temporaryPassword,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the user creation if email fails
      }
    }

    // Clean up verification record
    await emailVerificationModel.deleteMany({
      where: { email: validatedData.email },
    });

    return NextResponse.json(
      {
        user: newUser,
        temporaryPassword: validatedData.sendWelcomeEmail
          ? undefined
          : temporaryPassword,
        message: validatedData.sendWelcomeEmail
          ? "User created successfully. Welcome email sent."
          : "User created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
});
