import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { verifyOTPSchema } from "@/lib/validations";
import { verificationService } from "@/lib/verification";
import { withAnnotationTracking } from "@/lib/annotations/middleware";

// POST /api/admin/email/verify-otp - Verify OTP for email address
const postHandler = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const body = await req.json();
    const validatedData = verifyOTPSchema.parse(body);

    // Use unified verification service to verify OTP
    const verification = await verificationService.verifyOTP(
      validatedData.email,
      validatedData.otp
    );

    return NextResponse.json({
      message: "Email verified successfully",
      email: validatedData.email,
      verified: true,
      verificationId: verification.id,
      verifiedAt: verification.verifiedAt,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
});

// Export tracked handler
export const POST = withAnnotationTracking(postHandler, {
  action: "UPDATE",
  resource: "admin_email_otp",
  description: "Verify OTP for email address",
  tags: ["admin", "email", "otp", "verify"]
});
