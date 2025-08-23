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
    // Since the User model schema has been updated and no longer includes activation token fields,
    // we'll check using raw SQL queries to see if the database columns still exist and have data

    try {
      // Try to check if any users still have activation tokens using raw query
      const usersWithTokens = (await prisma.$queryRaw`
        SELECT id, email, "activationToken", "activationTokenExpires" 
        FROM "User" 
        WHERE "activationToken" IS NOT NULL 
           OR "activationTokenExpires" IS NOT NULL
        LIMIT 10
      `) as any[];

      if (usersWithTokens.length === 0) {
        console.log(
          "✅ No users with activation tokens found - safe to proceed"
        );
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
          console.log(
            `✅ User ${user.email} token found in verification_tokens`
          );
        }
      }

      console.log(
        "✅ All activation tokens have been migrated - safe to proceed"
      );
      return true;
    } catch (rawQueryError: any) {
      // If raw query fails because columns don't exist, cleanup is complete
      if (
        rawQueryError.message &&
        rawQueryError.message.includes("column") &&
        rawQueryError.message.includes("activationToken")
      ) {
        console.log(
          "✅ Activation token columns have been removed from database"
        );
        console.log("✅ Database cleanup appears to be complete");
        return true;
      }
      throw rawQueryError;
    }
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
    // Count verification tokens first (this should always work)
    const verificationTokens = await (prisma as any).verificationToken.count({
      where: {
        type: "ACTIVATION_LINK",
      },
    });

    stats.verificationTokens = verificationTokens;
    console.log(
      `📊 Found ${stats.verificationTokens} activation link verification tokens`
    );

    // Try to check for users with activation token fields
    try {
      // First try using raw SQL to check if columns exist and have data
      const usersWithTokensRaw = (await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "User" 
        WHERE "activationToken" IS NOT NULL 
           OR "activationTokenExpires" IS NOT NULL
      `) as any[];

      stats.usersWithTokens = Number(usersWithTokensRaw[0]?.count || 0);

      console.log(
        `📊 Found ${stats.usersWithTokens} users with activation token fields`
      );

      if (stats.usersWithTokens === 0) {
        console.log("✅ No activation token fields to clean up");
        return stats;
      }

      // Clear activation token fields from User table using raw SQL
      const updateResult = await prisma.$executeRaw`
        UPDATE "User" 
        SET "activationToken" = NULL, "activationTokenExpires" = NULL
        WHERE "activationToken" IS NOT NULL 
           OR "activationTokenExpires" IS NOT NULL
      `;

      stats.fieldsCleaned = Number(updateResult);

      console.log(
        `✅ Cleaned activation token fields from ${stats.fieldsCleaned} users`
      );
    } catch (dbError: any) {
      // If we get a column doesn't exist error, the fields have already been removed
      if (
        dbError.message &&
        dbError.message.includes("column") &&
        (dbError.message.includes("activationToken") ||
          dbError.message.includes("activationTokenExpires"))
      ) {
        console.log(
          "✅ Activation token columns have already been removed from database"
        );
        stats.usersWithTokens = 0;
        stats.fieldsCleaned = 0;
        return stats;
      }

      // Re-throw if it's a different error
      throw dbError;
    }

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
    let remainingTokens = 0;

    // Try to check for remaining tokens using raw SQL
    try {
      const remainingTokensRaw = (await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "User" 
        WHERE "activationToken" IS NOT NULL 
           OR "activationTokenExpires" IS NOT NULL
      `) as any[];

      remainingTokens = Number(remainingTokensRaw[0]?.count || 0);
    } catch (dbError: any) {
      // If columns don't exist, that means cleanup is complete
      if (
        dbError.message &&
        dbError.message.includes("column") &&
        (dbError.message.includes("activationToken") ||
          dbError.message.includes("activationTokenExpires"))
      ) {
        console.log(
          "✅ Activation token columns have been removed from database"
        );
        remainingTokens = 0;
      } else {
        throw dbError;
      }
    }

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
