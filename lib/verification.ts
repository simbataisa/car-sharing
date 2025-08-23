import { prisma } from "./prisma";
import {
  sendOTPEmail,
  sendActivationEmail,
  generateOTP,
  generateActivationToken,
} from "./email";

// Use string literals for type safety until Prisma client is fully updated
type VerificationType =
  | "OTP"
  | "ACTIVATION_LINK"
  | "PASSWORD_RESET"
  | "EMAIL_CHANGE"
  | "TWO_FACTOR";
type TokenStatus = "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED" | "REVOKED";

export interface CreateVerificationParams {
  email: string;
  type: VerificationType;
  purpose?: string;
  expiresIn?: number; // minutes
  maxAttempts?: number;
  createdBy?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerifyTokenParams {
  email: string;
  token: string;
  type: VerificationType;
  ipAddress?: string;
  userAgent?: string;
}

export class UnifiedVerificationService {
  /**
   * Create a new verification token
   */
  async createVerification(params: CreateVerificationParams) {
    const {
      email,
      type,
      purpose,
      expiresIn = type === "OTP" ? 10 : 1440, // 10 minutes for OTP, 24 hours for others
      maxAttempts = 3,
      createdBy,
      metadata,
      ipAddress,
      userAgent,
    } = params;

    // Revoke any existing pending tokens of the same type for this email
    await this.revokeExistingTokens(email, type);

    // Generate appropriate token based on type
    let token: string;
    switch (type) {
      case "OTP":
        token = generateOTP();
        break;
      case "ACTIVATION_LINK":
      case "PASSWORD_RESET":
      case "EMAIL_CHANGE":
        token = generateActivationToken();
        break;
      default:
        token = generateActivationToken();
    }

    const expires = new Date(Date.now() + expiresIn * 60 * 1000);

    // Create verification record using type assertion for now
    const verification = await (prisma as any).verificationToken.create({
      data: {
        identifier: email,
        token,
        type,
        purpose,
        expires,
        maxAttempts,
        createdBy,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Send appropriate email based on type
    await this.sendVerificationEmail(email, token, type, metadata);

    return verification;
  }

  /**
   * Verify a token
   */
  async verifyToken(params: VerifyTokenParams) {
    const { email, token, type, ipAddress, userAgent } = params;

    // Find the verification record
    const verification = await (prisma as any).verificationToken.findFirst({
      where: {
        identifier: email,
        token,
        type,
        status: "PENDING",
      },
    });

    if (!verification) {
      await this.logVerificationAttempt(
        email,
        token,
        type,
        "INVALID_TOKEN",
        ipAddress,
        userAgent
      );
      throw new Error("Invalid or expired token");
    }

    // Check if token has expired
    if (verification.expires < new Date()) {
      await (prisma as any).verificationToken.update({
        where: { id: verification.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Token has expired");
    }

    // Check attempts limit
    if (verification.attempts >= verification.maxAttempts) {
      await (prisma as any).verificationToken.update({
        where: { id: verification.id },
        data: { status: "FAILED" },
      });
      throw new Error("Too many verification attempts");
    }

    // Increment attempts
    await (prisma as any).verificationToken.update({
      where: { id: verification.id },
      data: {
        attempts: verification.attempts + 1,
      },
    });

    // Mark as verified
    const verifiedToken = await (prisma as any).verificationToken.update({
      where: { id: verification.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });

    return verifiedToken;
  }

  /**
   * Send OTP verification email
   */
  async sendOTP(
    email: string,
    purpose: string = "customer_creation",
    createdBy?: string
  ) {
    return this.createVerification({
      email,
      type: "OTP",
      purpose,
      expiresIn: 10, // 10 minutes
      maxAttempts: 3,
      createdBy,
    });
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, otp: string) {
    return this.verifyToken({
      email,
      token: otp,
      type: "OTP",
    });
  }

  /**
   * Send activation link
   */
  async sendActivationLink(
    email: string,
    userName: string,
    purpose: string = "admin_user_creation",
    createdBy?: string
  ) {
    return this.createVerification({
      email,
      type: "ACTIVATION_LINK",
      purpose,
      expiresIn: 1440, // 24 hours
      maxAttempts: 1, // Only one attempt for activation links
      createdBy,
      metadata: { userName },
    });
  }

  /**
   * Verify activation link
   */
  async verifyActivationLink(email: string, token: string) {
    return this.verifyToken({
      email,
      token,
      type: "ACTIVATION_LINK",
    });
  }

  /**
   * Get verification history for an email
   */
  async getVerificationHistory(
    email: string,
    type?: VerificationType,
    limit: number = 10
  ) {
    const where: any = { identifier: email };
    if (type) {
      where.type = type;
    }

    return (prisma as any).verificationToken.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        token: true,
        type: true,
        purpose: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        expires: true,
        verifiedAt: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(
    email?: string,
    type?: VerificationType,
    days: number = 30
  ) {
    const where: any = {
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    };

    if (email) where.identifier = email;
    if (type) where.type = type;

    const [total, verified, expired, failed] = await Promise.all([
      (prisma as any).verificationToken.count({ where }),
      (prisma as any).verificationToken.count({
        where: { ...where, status: "VERIFIED" },
      }),
      (prisma as any).verificationToken.count({
        where: { ...where, status: "EXPIRED" },
      }),
      (prisma as any).verificationToken.count({
        where: { ...where, status: "FAILED" },
      }),
    ]);

    return {
      total,
      verified,
      expired,
      failed,
      pending: total - verified - expired - failed,
      successRate: total > 0 ? (verified / total) * 100 : 0,
    };
  }

  /**
   * Check if email has recent verification
   */
  async hasRecentVerification(
    email: string,
    type: VerificationType,
    status: TokenStatus = "VERIFIED",
    minutesAgo: number = 60
  ) {
    const verification = await (prisma as any).verificationToken.findFirst({
      where: {
        identifier: email,
        type,
        status,
        verifiedAt: {
          gte: new Date(Date.now() - minutesAgo * 60 * 1000),
        },
      },
    });

    return !!verification;
  }

  /**
   * Revoke all pending tokens of a specific type for an email
   */
  private async revokeExistingTokens(email: string, type: VerificationType) {
    await (prisma as any).verificationToken.updateMany({
      where: {
        identifier: email,
        type,
        status: "PENDING",
      },
      data: {
        status: "REVOKED",
      },
    });
  }

  /**
   * Send verification email based on type
   */
  private async sendVerificationEmail(
    email: string,
    token: string,
    type: VerificationType,
    metadata?: Record<string, any>
  ) {
    switch (type) {
      case "OTP":
        await sendOTPEmail({ email, otp: token });
        break;
      case "ACTIVATION_LINK":
        const userName = metadata?.userName || "User";
        await sendActivationEmail({
          email,
          userName,
          activationToken: token,
        });
        break;
      case "PASSWORD_RESET":
        // TODO: Implement password reset email
        break;
      case "EMAIL_CHANGE":
        // TODO: Implement email change verification
        break;
      default:
        throw new Error(`Unsupported verification type: ${type}`);
    }
  }

  /**
   * Log verification attempt for audit purposes
   */
  private async logVerificationAttempt(
    email: string,
    token: string,
    type: VerificationType,
    result: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    console.log(`Verification attempt: ${email}, ${type}, ${result}`, {
      email,
      token: token.substring(0, 4) + "***", // Log only first 4 chars for security
      type,
      result,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement proper audit logging to database if needed
  }

  /**
   * Clean up expired tokens (should be run as a cron job)
   */
  async cleanupExpiredTokens() {
    const result = await (prisma as any).verificationToken.updateMany({
      where: {
        expires: { lt: new Date() },
        status: "PENDING",
      },
      data: {
        status: "EXPIRED",
      },
    });

    console.log(`Cleaned up ${result.count} expired tokens`);
    return result.count;
  }
}

// Export singleton instance
export const verificationService = new UnifiedVerificationService();
