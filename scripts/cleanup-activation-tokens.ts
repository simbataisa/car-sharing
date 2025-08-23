import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cleanup script to remove activation token fields from User table
 * This should only be run after successful migration to verification_tokens table
 */

interface CleanupStats {
  usersWithTokens: number;
  verificationTokens: number;
  fieldsCleaned: number;
  errors: number;
}

/**
 * Verify that migration is complete before cleanup
 */
async function verifyMigrationComplete(): Promise<boolean> {
  console.log("🔍 Verifying migration completeness...");

  try {
    // Check if all activation tokens have been migrated
    const usersWithTokens = await prisma.user.findMany({
      where: {
        AND: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
      select: {
        id: true,
        email: true,
        activationToken: true,
        activationTokenExpires: true,
      },
    });

    if (usersWithTokens.length === 0) {
      console.log("✅ No users with activation tokens found - safe to proceed");
      return true;
    }

    console.log(
      `⚠️  Found ${usersWithTokens.length} users with activation tokens:`
    );
    for (const user of usersWithTokens) {
      // Check if this token exists in verification_tokens
      const verificationToken = await (
        prisma as any
      ).verificationToken.findFirst({
        where: {
          identifier: user.email,
          token: user.activationToken,
          type: "ACTIVATION_LINK",
        },
      });

      if (!verificationToken) {
        console.log(`❌ User ${user.email} has unmigrated activation token`);
        return false;
      } else {
        console.log(`✅ User ${user.email} token found in verification_tokens`);
      }
    }

    console.log(
      "✅ All activation tokens have been migrated - safe to proceed"
    );
    return true;
  } catch (error) {
    console.error("❌ Migration verification failed:", error);
    return false;
  }
}

/**
 * Clean up activation token fields from User records
 */
async function cleanupActivationTokenFields(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    usersWithTokens: 0,
    verificationTokens: 0,
    fieldsCleaned: 0,
    errors: 0,
  };

  console.log("🧹 Starting activation token field cleanup...");

  try {
    // Count users with activation token fields
    const usersWithTokens = await prisma.user.count({
      where: {
        OR: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
    });

    stats.usersWithTokens = usersWithTokens;

    // Count verification tokens
    const verificationTokens = await (prisma as any).verificationToken.count({
      where: {
        type: "ACTIVATION_LINK",
      },
    });

    stats.verificationTokens = verificationTokens;

    console.log(
      `📊 Found ${stats.usersWithTokens} users with activation token fields`
    );
    console.log(
      `📊 Found ${stats.verificationTokens} activation link verification tokens`
    );

    if (stats.usersWithTokens === 0) {
      console.log("✅ No activation token fields to clean up");
      return stats;
    }

    // Clear activation token fields from User table
    const updateResult = await prisma.user.updateMany({
      where: {
        OR: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
      data: {
        activationToken: null,
        activationTokenExpires: null,
      },
    });

    stats.fieldsCleaned = updateResult.count;

    console.log(
      `✅ Cleaned activation token fields from ${stats.fieldsCleaned} users`
    );

    return stats;
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    stats.errors++;
    throw error;
  }
}

/**
 * Final verification after cleanup
 */
async function verifyCleanup(): Promise<boolean> {
  console.log("\n🔍 Verifying cleanup completion...");

  try {
    const remainingTokens = await prisma.user.count({
      where: {
        OR: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
    });

    if (remainingTokens > 0) {
      console.log(
        `❌ ${remainingTokens} users still have activation token fields`
      );
      return false;
    }

    const verificationTokens = await (prisma as any).verificationToken.count({
      where: {
        type: "ACTIVATION_LINK",
      },
    });

    console.log(`✅ Cleanup verified: 0 users with activation token fields`);
    console.log(
      `✅ Verification tokens preserved: ${verificationTokens} activation link tokens`
    );

    return true;
  } catch (error) {
    console.error("❌ Cleanup verification failed:", error);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log("🧹 Activation Token Cleanup Tool");
    console.log("=================================");

    // Verify migration is complete
    const migrationComplete = await verifyMigrationComplete();
    if (!migrationComplete) {
      console.log("❌ Migration not complete. Please run migration first:");
      console.log("   npm run activation-tokens:migrate");
      process.exit(1);
    }

    // Run the cleanup
    const stats = await cleanupActivationTokenFields();

    // Verify the cleanup
    const verified = await verifyCleanup();

    console.log("\n📊 Cleanup Summary:");
    console.log(
      `Users with activation token fields (before): ${stats.usersWithTokens}`
    );
    console.log(`Verification tokens preserved: ${stats.verificationTokens}`);
    console.log(`Fields cleaned: ${stats.fieldsCleaned}`);
    console.log(`Errors: ${stats.errors}`);

    if (verified && stats.errors === 0) {
      console.log("\n🎉 Cleanup completed successfully!");
      console.log("💡 Next steps:");
      console.log(
        "   1. Update your Prisma schema to remove activationToken and activationTokenExpires fields"
      );
      console.log("   2. Run: npx prisma db push");
      console.log("   3. Regenerate Prisma client: npx prisma generate");
      console.log(
        "   4. Update your code to use the unified verification service exclusively"
      );
    } else {
      console.log(
        "\n⚠️  Cleanup completed with issues. Please review before proceeding."
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the cleanup if this script is run directly
if (require.main === module) {
  main();
}

export { cleanupActivationTokenFields, verifyCleanup };
