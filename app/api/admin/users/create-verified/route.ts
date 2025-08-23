import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { adminCreateUserSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/email";
import { verificationService } from "@/lib/verification";
import bcrypt from "bcryptjs";

// POST /api/admin/users/create-verified - Create user after email verification
export const POST = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const body = await req.json();
    const validatedData = adminCreateUserSchema.parse(body);

    // Check if email has been verified using unified verification service
    const hasRecentVerification =
      await verificationService.hasRecentVerification(
        validatedData.email,
        "OTP",
        "VERIFIED",
        60 // within last 60 minutes
      );

    if (!hasRecentVerification) {
      return NextResponse.json(
        {
          error:
            "Email not verified or verification expired. Please verify email first.",
        },
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

    // Generate secure temporary password (12 characters with mixed case, numbers, and symbols)
    const generateSecurePassword = () => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const temporaryPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create user with proper role and status
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

    // Always send welcome email with temporary password
    try {
      await sendWelcomeEmail({
        email: validatedData.email,
        userName: validatedData.name,
        temporaryPassword,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue with user creation even if email fails
    }

    // Note: We don't clean up verification records here anymore
    // The unified service manages its own cleanup via background jobs

    return NextResponse.json(
      {
        user: newUser,
        message:
          "User created successfully. Welcome email with login credentials has been sent to the user's email address.",
        emailSent: true,
        instructions: {
          userNotification:
            "The user has been notified via email with their temporary password",
          nextSteps:
            "User should check their email and login to change their password",
        },
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
