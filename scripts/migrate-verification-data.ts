/**
 * Data Migration Script: Legacy Verification Data to Unified System
 *
 * This script migrates existing verification data from:
 * 1. EmailVerification table (OTP records)
 * 2. User table activation tokens (activation link records)
 *
 * To the new unified VerificationToken table
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MigrationStats {
  emailVerifications: {
    total: number;
    migrated: number;
    errors: number;
  };
  userActivationTokens: {
    total: number;
    migrated: number;
    errors: number;
  };
}

export async function migrateVerificationData(): Promise<MigrationStats> {
  console.log("🚀 Starting verification data migration...");

  const stats: MigrationStats = {
    emailVerifications: { total: 0, migrated: 0, errors: 0 },
    userActivationTokens: { total: 0, migrated: 0, errors: 0 },
  };

  try {
    // Step 1: Migrate EmailVerification records (OTP workflow)
    console.log("\n📧 Migrating EmailVerification records...");
    await migrateEmailVerifications(stats);

    // Step 2: Migrate User activation tokens (activation link workflow)
    console.log("\n🔗 Migrating User activation tokens...");
    await migrateUserActivationTokens(stats);

    // Step 3: Print migration summary
    printMigrationSummary(stats);

    console.log("\n✅ Verification data migration completed successfully!");
    return stats;
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateEmailVerifications(stats: MigrationStats) {
  // Use type assertion to access the legacy table
  const emailVerificationModel = (prisma as any).emailVerification;

  try {
    const emailVerifications = await emailVerificationModel.findMany({
      orderBy: { createdAt: "asc" },
    });

    stats.emailVerifications.total = emailVerifications.length;
    console.log(
      `   Found ${emailVerifications.length} EmailVerification records`
    );

    for (const verification of emailVerifications) {
      try {
        // Check if already migrated
        const existing = await prisma.verificationToken.findFirst({
          where: {
            identifier: verification.email,
            token: verification.otp,
            type: "OTP",
          },
        });

        if (existing) {
          console.log(
            `   ⏭️  Skipping already migrated OTP for ${verification.email}`
          );
          continue;
        }

        // Determine status based on verification state
        let status: "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED" = "PENDING";
        let verifiedAt: Date | null = null;

        if (verification.verified) {
          status = "VERIFIED";
          verifiedAt = verification.updatedAt;
        } else if (verification.expiresAt < new Date()) {
          status = "EXPIRED";
        } else if (verification.attempts >= 3) {
          status = "FAILED";
        }

        await prisma.verificationToken.create({
          data: {
            identifier: verification.email,
            token: verification.otp,
            type: "OTP",
            purpose: "booking_customer_creation",
            expires: verification.expiresAt,
            attempts: verification.attempts,
            maxAttempts: 3,
            status,
            verifiedAt,
            createdAt: verification.createdAt,
            updatedAt: verification.updatedAt,
            metadata: JSON.stringify({
              migratedFrom: "EmailVerification",
              originalId: verification.id,
            }),
          },
        });

        stats.emailVerifications.migrated++;
        console.log(
          `   ✅ Migrated OTP verification for ${verification.email} (${status})`
        );
      } catch (error) {
        stats.emailVerifications.errors++;
        console.error(
          `   ❌ Error migrating OTP for ${verification.email}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("   ❌ Error fetching EmailVerification records:", error);
    throw error;
  }
}

async function migrateUserActivationTokens(stats: MigrationStats) {
  try {
    const usersWithTokens = await prisma.user.findMany({
      where: {
        activationToken: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        activationToken: true,
        activationTokenExpires: true,
        emailVerificationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    stats.userActivationTokens.total = usersWithTokens.length;
    console.log(
      `   Found ${usersWithTokens.length} users with activation tokens`
    );

    for (const user of usersWithTokens) {
      try {
        // Check if already migrated
        const existing = await prisma.verificationToken.findFirst({
          where: {
            identifier: user.email,
            token: user.activationToken!,
            type: "ACTIVATION_LINK",
          },
        });

        if (existing) {
          console.log(
            `   ⏭️  Skipping already migrated activation token for ${user.email}`
          );
          continue;
        }

        // Determine status based on user email verification status
        let status: "PENDING" | "VERIFIED" | "EXPIRED" = "PENDING";
        let verifiedAt: Date | null = null;

        if (user.emailVerificationStatus === "VERIFIED") {
          status = "VERIFIED";
          verifiedAt = user.updatedAt;
        } else if (
          user.activationTokenExpires &&
          user.activationTokenExpires < new Date()
        ) {
          status = "EXPIRED";
        }

        await prisma.verificationToken.create({
          data: {
            identifier: user.email,
            token: user.activationToken!,
            type: "ACTIVATION_LINK",
            purpose: "admin_user_creation",
            expires: user.activationTokenExpires!,
            attempts: 0,
            maxAttempts: 1,
            status,
            verifiedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            metadata: JSON.stringify({
              migratedFrom: "User",
              originalUserId: user.id,
              userName: user.name,
            }),
          },
        });

        stats.userActivationTokens.migrated++;
        console.log(
          `   ✅ Migrated activation token for ${user.email} (${status})`
        );
      } catch (error) {
        stats.userActivationTokens.errors++;
        console.error(
          `   ❌ Error migrating activation token for ${user.email}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("   ❌ Error fetching User activation tokens:", error);
    throw error;
  }
}

function printMigrationSummary(stats: MigrationStats) {
  console.log("\n📊 Migration Summary:");
  console.log("=".repeat(50));

  console.log("\n📧 EmailVerification Records:");
  console.log(`   Total: ${stats.emailVerifications.total}`);
  console.log(`   Migrated: ${stats.emailVerifications.migrated}`);
  console.log(`   Errors: ${stats.emailVerifications.errors}`);

  console.log("\n🔗 User Activation Tokens:");
  console.log(`   Total: ${stats.userActivationTokens.total}`);
  console.log(`   Migrated: ${stats.userActivationTokens.migrated}`);
  console.log(`   Errors: ${stats.userActivationTokens.errors}`);

  const totalRecords =
    stats.emailVerifications.total + stats.userActivationTokens.total;
  const totalMigrated =
    stats.emailVerifications.migrated + stats.userActivationTokens.migrated;
  const totalErrors =
    stats.emailVerifications.errors + stats.userActivationTokens.errors;

  console.log("\n🎯 Overall Summary:");
  console.log(`   Total Records: ${totalRecords}`);
  console.log(`   Successfully Migrated: ${totalMigrated}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(
    `   Success Rate: ${
      totalRecords > 0 ? ((totalMigrated / totalRecords) * 100).toFixed(1) : 0
    }%`
  );
  console.log("=".repeat(50));
}

// CLI execution support
if (require.main === module) {
  migrateVerificationData()
    .then((stats) => {
      console.log("\n🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration failed:", error);
      process.exit(1);
    });
}

export default migrateVerificationData;
