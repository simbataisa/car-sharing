import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificationService } from "@/lib/verification";
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

    // Verify the activation token using unified verification service
    let verification;
    try {
      // First find the verification record to get the email
      verification = await (prisma as any).verificationToken.findFirst({
        where: {
          token: validatedData.token,
          type: "ACTIVATION_LINK",
        },
      });

      if (!verification) {
        return NextResponse.json(
          { error: "Invalid activation token" },
          { status: 400 }
        );
      }

      // Now verify it properly
      verification = await verificationService.verifyActivationLink(
        verification.identifier,
        validatedData.token
      );
    } catch (error) {
      // If verification fails, try to find by token for better error messaging
      const tokenRecord = await (prisma as any).verificationToken.findFirst({
        where: {
          token: validatedData.token,
          type: "ACTIVATION_LINK",
        },
      });

      if (!tokenRecord) {
        return NextResponse.json(
          { error: "Invalid activation token" },
          { status: 400 }
        );
      }

      if (tokenRecord.expires < new Date()) {
        return NextResponse.json(
          {
            error:
              "Activation token has expired. Please contact support to resend.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Invalid or expired activation token" },
        { status: 400 }
      );
    }

    // Find user by email from verification record
    const user = await prisma.user.findUnique({
      where: {
        email: verification.identifier,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    // Check if user is already activated
    if (user.emailVerificationStatus === "VERIFIED") {
      return NextResponse.json(
        { error: "Account is already activated" },
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

    // Find verification token record
    const verification = await (prisma as any).verificationToken.findFirst({
      where: {
        token,
        type: "ACTIVATION_LINK",
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid activation token", valid: false },
        { status: 400 }
      );
    }

    // Check if token has expired
    const isExpired = verification.expires < new Date();

    if (isExpired) {
      return NextResponse.json(
        { error: "Activation token has expired", valid: false, expired: true },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (verification.status === "VERIFIED") {
      return NextResponse.json(
        {
          error: "Activation token has already been used",
          valid: false,
          used: true,
        },
        { status: 400 }
      );
    }

    // Check if token is still pending
    if (verification.status !== "PENDING") {
      return NextResponse.json(
        { error: "Activation token is not valid", valid: false },
        { status: 400 }
      );
    }

    // Find user to get additional info
    const user = await prisma.user.findUnique({
      where: { email: verification.identifier },
      select: {
        email: true,
        name: true,
        emailVerificationStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", valid: false },
        { status: 400 }
      );
    }

    // Check if user is already verified
    if (user.emailVerificationStatus === "VERIFIED") {
      return NextResponse.json(
        {
          error: "Account is already activated",
          valid: false,
          alreadyVerified: true,
        },
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
        expiresAt: verification.expires,
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
