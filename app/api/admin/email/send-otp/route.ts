import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { emailVerificationSchema } from "@/lib/validations";
import { verificationService } from "@/lib/verification";

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

    // Use unified verification service to send OTP
    const verification = await verificationService.sendOTP(
      validatedData.email,
      "booking_customer_creation",
      adminUser.id
    );

    return NextResponse.json({
      message: "OTP sent successfully",
      email: validatedData.email,
      verificationId: verification.id,
      expiresAt: verification.expires,
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
