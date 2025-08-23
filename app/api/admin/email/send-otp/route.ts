import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { emailVerificationSchema } from "@/lib/validations";
import { sendOTPEmail, generateOTP } from "@/lib/email";

// Helper to access emailVerification model with proper typing
const emailVerificationModel = (prisma as any).emailVerification;

// POST /api/admin/email/send-otp - Send OTP to email address
export const POST = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const body = await req.json();
    const validatedData = emailVerificationSchema.parse(body);

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

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing verification records for this email
    await emailVerificationModel.deleteMany({
      where: { email: validatedData.email },
    });

    // Create new verification record
    await emailVerificationModel.create({
      data: {
        email: validatedData.email,
        otp,
        expiresAt,
      },
    });

    // Send OTP email
    await sendOTPEmail({
      email: validatedData.email,
      otp,
    });

    return NextResponse.json({
      message: "OTP sent successfully",
      email: validatedData.email,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Failed to send")) {
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    console.error("Error sending OTP:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
});
