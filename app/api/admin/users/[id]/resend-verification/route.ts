import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { verificationService } from "@/lib/verification";

// POST /api/admin/users/[id]/resend-verification - Resend activation email for user
export const POST = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const url = new URL(req.url);
    const userId = url.pathname.split("/").slice(-2, -1)[0]; // Get user ID from URL

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerificationStatus: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has PENDING_EMAIL_VERIFICATION status
    if (user.emailVerificationStatus !== "PENDING_EMAIL_VERIFICATION") {
      return NextResponse.json(
        {
          error:
            "User email verification is not pending. Current status: " +
            user.emailVerificationStatus,
        },
        { status: 400 }
      );
    }

    // Send new activation link using unified verification service
    try {
      const verification = await verificationService.sendActivationLink(
        user.email,
        user.name,
        "admin_user_creation",
        adminUser.id
      );

      return NextResponse.json(
        {
          message: "Verification email has been resent successfully",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          verification: {
            id: verification.id,
            expiresAt: verification.expires,
          },
          instructions: {
            userNotification:
              "A new activation link has been sent to the user's email",
            nextSteps:
              "User must click the activation link within 24 hours to complete account setup",
            activationExpires: "24 hours",
          },
        },
        { status: 200 }
      );
    } catch (emailError) {
      console.error("Failed to send activation email:", emailError);
      return NextResponse.json(
        {
          error: "Failed to send verification email. Please try again later.",
          details:
            emailError instanceof Error
              ? emailError.message
              : "Unknown email error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error resending verification email:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
});
