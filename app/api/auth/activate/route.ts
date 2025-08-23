import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateActivationToken, sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

const activationSchema = z
  .object({
    token: z.string().min(1, "Activation token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// POST /api/auth/activate - Activate user account with token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = activationSchema.parse(body);

    // Validate token format
    if (!validateActivationToken(validatedData.token)) {
      return NextResponse.json(
        { error: "Invalid activation token format" },
        { status: 400 }
      );
    }

    // Find user with this activation token
    const user = await prisma.user.findFirst({
      where: {
        activationToken: validatedData.token,
        emailVerificationStatus: "PENDING_EMAIL_VERIFICATION",
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired activation token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (
      user.activationTokenExpires &&
      user.activationTokenExpires < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "Activation token has expired. Please contact support to resend.",
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Update user to activate account
    const activatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
        emailVerificationStatus: "VERIFIED",
        activationToken: null, // Clear the token
        activationTokenExpires: null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        emailVerificationStatus: true,
      },
    });

    return NextResponse.json(
      {
        message:
          "Account activated successfully! You can now login with your credentials.",
        user: activatedUser,
        redirectTo: "/login",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error activating account:", error);
    return NextResponse.json(
      { error: "Failed to activate account" },
      { status: 500 }
    );
  }
}

// GET /api/auth/activate?token=xxx - Validate activation token
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Activation token is required" },
        { status: 400 }
      );
    }

    // Validate token format
    if (!validateActivationToken(token)) {
      return NextResponse.json(
        { error: "Invalid activation token format" },
        { status: 400 }
      );
    }

    // Find user with this activation token
    const user = await prisma.user.findFirst({
      where: {
        activationToken: token,
        emailVerificationStatus: "PENDING_EMAIL_VERIFICATION",
      },
      select: {
        id: true,
        email: true,
        name: true,
        activationTokenExpires: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid activation token", valid: false },
        { status: 400 }
      );
    }

    // Check if token has expired
    const isExpired =
      user.activationTokenExpires && user.activationTokenExpires < new Date();

    if (isExpired) {
      return NextResponse.json(
        { error: "Activation token has expired", valid: false, expired: true },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        user: {
          email: user.email,
          name: user.name,
        },
        expiresAt: user.activationTokenExpires,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error validating activation token:", error);
    return NextResponse.json(
      { error: "Failed to validate token", valid: false },
      { status: 500 }
    );
  }
}
