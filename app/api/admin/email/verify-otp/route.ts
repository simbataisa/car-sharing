import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { verifyOTPSchema } from "@/lib/validations";

// Helper to access emailVerification model with proper typing
const emailVerificationModel = (prisma as any).emailVerification;

// POST /api/admin/email/verify-otp - Verify OTP for email address
export const POST = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const body = await req.json();
    const validatedData = verifyOTPSchema.parse(body);

    // Find verification record
    const verification = await emailVerificationModel.findFirst({
      where: {
        email: validatedData.email,
        otp: validatedData.otp,
        verified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempts limit (max 3 attempts)
    if (verification.attempts >= 3) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    // Increment attempts
    await emailVerificationModel.update({
      where: { id: verification.id },
      data: {
        attempts: verification.attempts + 1,
      },
    });

    // Mark as verified
    await emailVerificationModel.update({
      where: { id: verification.id },
      data: {
        verified: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Email verified successfully",
      email: validatedData.email,
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
});
