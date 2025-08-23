import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-auth";
import { verificationService } from "@/lib/verification";
import { z } from "zod";
import { withAnnotationTracking } from "@/lib/annotations/middleware";

const querySchema = z.object({
  email: z.string().email().optional(),
  type: z
    .enum([
      "OTP",
      "ACTIVATION_LINK",
      "PASSWORD_RESET",
      "EMAIL_CHANGE",
      "TWO_FACTOR",
    ])
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
  days: z.coerce.number().min(1).max(365).default(30),
});

// GET /api/admin/verifications - Get verification history and statistics
const getHandler = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      email: searchParams.get("email") || undefined,
      type: searchParams.get("type") || undefined,
      limit: searchParams.get("limit") || "10",
      days: searchParams.get("days") || "30",
    });

    const [history, stats] = await Promise.all([
      params.email
        ? verificationService.getVerificationHistory(
            params.email,
            params.type,
            params.limit
          )
        : [], // Don't fetch all history if no email specified
      verificationService.getVerificationStats(
        params.email,
        params.type,
        params.days
      ),
    ]);

    return NextResponse.json({
      history,
      stats,
      query: params,
    });
  } catch (error) {
    console.error("Error fetching verification data:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification data" },
      { status: 500 }
    );
  }
});

// Export tracked handler
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "admin_verifications",
  description: "Get verification history and statistics",
  tags: ["admin", "verifications", "history", "stats"]
});
