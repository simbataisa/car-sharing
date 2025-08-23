/**
 * Legacy Verification System Cleanup Script
 *
 * This script removes the legacy verification tables and user activation fields
 * after successful migration to the unified verification system.
 *
 * WARNING: This script will permanently delete data. Ensure the migration
 * was successful and you have backups before running this script.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface CleanupStats {
  emailVerificationRecords: number;
  userActivationFields: number;
  errors: string[];
}

export async function cleanupLegacyVerification(): Promise<CleanupStats> {
  console.log("🧹 Starting legacy verification system cleanup...");
  console.log(
    "⚠️  WARNING: This will permanently delete legacy verification data!"
  );

  const stats: CleanupStats = {
    emailVerificationRecords: 0,
    userActivationFields: 0,
    errors: [],
  };

  try {
    // Step 1: Backup existing data first
    console.log("\n📁 Creating backup of legacy data...");
    await createDataBackup();

    // Step 2: Clean up EmailVerification records
    console.log("\n🗑️  Removing EmailVerification records...");
    await cleanupEmailVerificationTable(stats);

    // Step 3: Remove activation fields from User table
    console.log("\n🗑️  Removing user activation fields...");
    await removeUserActivationFields(stats);

    // Step 4: Update Prisma schema (remove legacy model)
    console.log("\n📝 Updating Prisma schema...");
    await updatePrismaSchema();

    // Step 5: Print cleanup summary
    printCleanupSummary(stats);

    console.log(
      "\n✅ Legacy verification system cleanup completed successfully!"
    );
    console.log("📌 Next steps:");
    console.log("   1. Run: npx prisma db push");
    console.log("   2. Run: npx prisma generate");
    console.log(
      "   3. Test the application to ensure everything works correctly"
    );

    return stats;
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    stats.errors.push(error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createDataBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(process.cwd(), "backups");

  try {
    // Create backups directory
    const fs = require("fs");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup EmailVerification data
    const emailVerificationModel = (prisma as any).emailVerification;
    const emailVerifications = await emailVerificationModel.findMany();

    const emailBackupPath = join(
      backupDir,
      `email_verifications_backup_${timestamp}.json`
    );
    writeFileSync(emailBackupPath, JSON.stringify(emailVerifications, null, 2));
    console.log(`   ✅ EmailVerification backup: ${emailBackupPath}`);

    // Backup User activation data
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
        name: true,
        activationToken: true,
        activationTokenExpires: true,
        emailVerificationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const userBackupPath = join(
      backupDir,
      `user_activation_backup_${timestamp}.json`
    );
    writeFileSync(userBackupPath, JSON.stringify(usersWithTokens, null, 2));
    console.log(`   ✅ User activation backup: ${userBackupPath}`);
  } catch (error) {
    console.error("   ❌ Failed to create backup:", error);
    throw new Error("Backup creation failed. Aborting cleanup for safety.");
  }
}

async function cleanupEmailVerificationTable(stats: CleanupStats) {
  try {
    // Use type assertion to access the legacy table
    const emailVerificationModel = (prisma as any).emailVerification;

    // Count existing records
    const count = await emailVerificationModel.count();
    stats.emailVerificationRecords = count;

    if (count > 0) {
      console.log(`   Found ${count} EmailVerification records to delete`);

      // Delete all records
      await emailVerificationModel.deleteMany({});
      console.log(`   ✅ Deleted ${count} EmailVerification records`);
    } else {
      console.log("   ✅ No EmailVerification records found");
    }
  } catch (error) {
    const errorMessage = `Failed to cleanup EmailVerification table: ${error}`;
    console.error(`   ❌ ${errorMessage}`);
    stats.errors.push(errorMessage);
  }
}

async function removeUserActivationFields(stats: CleanupStats) {
  try {
    // Count users with activation fields
    const usersWithActivationFields = await prisma.user.count({
      where: {
        OR: [
          { activationToken: { not: null } },
          { activationTokenExpires: { not: null } },
        ],
      },
    });

    stats.userActivationFields = usersWithActivationFields;

    if (usersWithActivationFields > 0) {
      console.log(
        `   Found ${usersWithActivationFields} users with activation fields`
      );

      // Clear activation fields
      await prisma.user.updateMany({
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

      console.log(
        `   ✅ Cleared activation fields from ${usersWithActivationFields} users`
      );
    } else {
      console.log("   ✅ No users with activation fields found");
    }
  } catch (error) {
    const errorMessage = `Failed to remove user activation fields: ${error}`;
    console.error(`   ❌ ${errorMessage}`);
    stats.errors.push(errorMessage);
  }
}

async function updatePrismaSchema() {
  try {
    const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
    let schemaContent = readFileSync(schemaPath, "utf-8");

    // Remove the legacy EmailVerification model
    const emailVerificationModelRegex =
      /\/\/ Legacy table - will be removed after migration\nmodel EmailVerification \{[\s\S]*?\n\}/;

    if (emailVerificationModelRegex.test(schemaContent)) {
      schemaContent = schemaContent.replace(emailVerificationModelRegex, "");
      console.log("   ✅ Removed EmailVerification model from schema");
    } else {
      console.log("   ℹ️  EmailVerification model already removed from schema");
    }

    // Remove activation fields from User model
    schemaContent = schemaContent.replace(
      /\s+activationToken\s+String\?\s+@unique\n/,
      ""
    );
    schemaContent = schemaContent.replace(
      /\s+activationTokenExpires\s+DateTime\?\n/,
      ""
    );

    // Clean up extra whitespace
    schemaContent = schemaContent.replace(/\n\n\n+/g, "\n\n");

    // Write updated schema
    writeFileSync(schemaPath, schemaContent);
    console.log("   ✅ Updated Prisma schema");
  } catch (error) {
    const errorMessage = `Failed to update Prisma schema: ${error}`;
    console.error(`   ❌ ${errorMessage}`);
    stats.errors.push(errorMessage);
  }
}

function printCleanupSummary(stats: CleanupStats) {
  console.log("\n📊 Cleanup Summary:");
  console.log("=".repeat(50));

  console.log(
    `📧 EmailVerification Records Deleted: ${stats.emailVerificationRecords}`
  );
  console.log(
    `👤 User Activation Fields Cleared: ${stats.userActivationFields}`
  );
  console.log(`❌ Errors Encountered: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log("=".repeat(50));
}

// CLI execution support
if (require.main === module) {
  cleanupLegacyVerification()
    .then((stats) => {
      console.log("\n🎉 Cleanup completed successfully!");
      if (stats.errors.length === 0) {
        process.exit(0);
      } else {
        console.log(
          "⚠️  Cleanup completed with some errors. Please review the output above."
        );
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n💥 Cleanup failed:", error);
      process.exit(1);
    });
}

export default cleanupLegacyVerification;
