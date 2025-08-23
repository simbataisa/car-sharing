import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

interface MigrationStats {
  totalUsers: number;
  usersWithActivationTokens: number;
  tokensTransferred: number;
  errors: number;
  skipped: number;
}

/**
 * Migration script to transfer activation tokens from User table to VerificationToken table
 * This script is part of the unified verification system implementation
 */
async function migrateActivationTokens(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithActivationTokens: 0,
    tokensTransferred: 0,
    errors: 0,
    skipped: 0,
  };

  console.log("🚀 Starting activation token migration...");
  console.log("📊 Analyzing current data...");

  try {
    // Get all users with activation tokens
    const usersWithTokens = await prisma.user.findMany({
      where: {
        OR: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
      select: {
        id: true,
        email: true,
        activationToken: true,
        activationTokenExpires: true,
        emailVerificationStatus: true,
        createdAt: true,
      },
    });

    const allUsers = await prisma.user.count();
    stats.totalUsers = allUsers;
    stats.usersWithActivationTokens = usersWithTokens.length;

    console.log(`📈 Found ${stats.totalUsers} total users`);
    console.log(
      `🔑 Found ${stats.usersWithActivationTokens} users with activation tokens`
    );

    if (stats.usersWithActivationTokens === 0) {
      console.log("✅ No activation tokens to migrate");
      return stats;
    }

    // Process each user with activation tokens
    for (const user of usersWithTokens) {
      try {
        console.log(`🔄 Processing user: ${user.email}`);

        // Skip if user doesn't have a valid activation token
        if (!user.activationToken || !user.activationTokenExpires) {
          console.log(`⏭️  Skipping ${user.email}: incomplete token data`);
          stats.skipped++;
          continue;
        }

        // Check if verification token already exists for this user
        const existingToken = await (prisma as any).verificationToken.findFirst(
          {
            where: {
              identifier: user.email,
              type: "ACTIVATION_LINK",
              token: user.activationToken,
            },
          }
        );

        if (existingToken) {
          console.log(
            `⏭️  Skipping ${user.email}: token already exists in verification_tokens`
          );
          stats.skipped++;
          continue;
        }

        // Determine status based on user's current state and token expiry
        let tokenStatus = "PENDING";
        let verifiedAt = null;

        if (user.emailVerificationStatus === "VERIFIED") {
          tokenStatus = "VERIFIED";
          verifiedAt = new Date();
        } else if (user.activationTokenExpires < new Date()) {
          tokenStatus = "EXPIRED";
        }

        // Create the verification token record
        await (prisma as any).verificationToken.create({
          data: {
            id: randomUUID(),
            identifier: user.email,
            token: user.activationToken,
            type: "ACTIVATION_LINK",
            purpose: "admin_user_creation",
            expires: user.activationTokenExpires,
            attempts: 0,
            maxAttempts: 1, // Activation links typically allow only one use
            status: tokenStatus,
            verifiedAt: verifiedAt,
            createdBy: null, // Unknown admin for legacy data
            ipAddress: null,
            userAgent: null,
            metadata: JSON.stringify({
              migratedFrom: "user_table",
              originalUserId: user.id,
              migrationDate: new Date().toISOString(),
            }),
            createdAt: user.createdAt, // Preserve original creation date
            updatedAt: new Date(),
          },
        });

        console.log(`✅ Successfully migrated token for ${user.email}`);
        stats.tokensTransferred++;
      } catch (error) {
        console.error(`❌ Error migrating token for ${user.email}:`, error);
        stats.errors++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`Total users: ${stats.totalUsers}`);
    console.log(
      `Users with activation tokens: ${stats.usersWithActivationTokens}`
    );
    console.log(`Tokens transferred: ${stats.tokensTransferred}`);
    console.log(`Tokens skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);

    if (stats.errors > 0) {
      console.log(
        "\n⚠️  Migration completed with errors. Please review the failed records."
      );
    } else {
      console.log("\n🎉 Migration completed successfully!");
    }

    return stats;
  } catch (error) {
    console.error("💥 Migration failed:", error);
    throw error;
  }
}

/**
 * Verification function to ensure data integrity after migration
 */
async function verifyMigration(): Promise<boolean> {
  console.log("\n🔍 Verifying migration integrity...");

  try {
    // Count users with activation tokens
    const usersWithTokens = await prisma.user.count({
      where: {
        OR: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
    });

    // Count activation link verification tokens
    const verificationTokens = await (prisma as any).verificationToken.count({
      where: {
        type: "ACTIVATION_LINK",
      },
    });

    console.log(`Users with activation tokens: ${usersWithTokens}`);
    console.log(`Activation link verification tokens: ${verificationTokens}`);

    // Check for any inconsistencies
    const usersWithCompleteTokens = await prisma.user.count({
      where: {
        AND: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
    });

    console.log(
      `Users with complete activation token data: ${usersWithCompleteTokens}`
    );

    if (usersWithCompleteTokens > 0) {
      console.log(
        "⚠️  Warning: Some users still have activation tokens that may need migration"
      );
      return false;
    }

    console.log("✅ Migration verification passed!");
    return true;
  } catch (error) {
    console.error("❌ Verification failed:", error);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log("🎯 Activation Token Migration Tool");
    console.log("==================================");

    // Run the migration
    const stats = await migrateActivationTokens();

    // Verify the migration
    const verified = await verifyMigration();

    if (verified && stats.errors === 0) {
      console.log("\n🎉 Migration completed successfully!");
      console.log("💡 Next steps:");
      console.log(
        "   1. Update your code to use the unified verification service"
      );
      console.log("   2. Test the activation link workflow");
      console.log(
        "   3. Run the schema migration to remove activation token fields from User table"
      );
      console.log("   4. Run: npm run activation-tokens:cleanup");
    } else {
      console.log(
        "\n⚠️  Migration completed with issues. Please review before proceeding."
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the migration if this script is run directly
if (require.main === module) {
  main();
}

export { migrateActivationTokens, verifyMigration };
