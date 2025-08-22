import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log("🚀 Creating admin user...");

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.log("✅ Admin user already exists:", existingAdmin.email);
      return;
    }

    // Admin user details
    const adminEmail = "admin@carshare.com";
    const adminPassword = "admin123";
    const adminName = "System Administrator";

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    });

    console.log("✅ Admin user created successfully!");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Name: ${adminName}`);
    console.log(`🆔 ID: ${adminUser.id}`);
    console.log("");
    console.log(
      "⚠️  IMPORTANT: Please change the default password after first login!"
    );
    console.log("🔗 Admin login URL: http://localhost:3001/admin/login");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
createAdminUser()
  .then(() => {
    console.log("🎉 Admin seeder completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Admin seeder failed:", error);
    process.exit(1);
  });
