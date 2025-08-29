import { PrismaClient, PolicyEffect } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Sample car data
const sampleCars = [
  {
    make: "Toyota",
    model: "Camry",
    year: 2022,
    pricePerDay: 50,
    location: "San Francisco",
    description:
      "Reliable and fuel-efficient sedan perfect for city driving and long trips.",
    imageUrl: "/placeholder.svg",
    features: JSON.stringify([
      "Air Conditioning",
      "Bluetooth",
      "Backup Camera",
      "Cruise Control",
    ]),
  },
  {
    make: "Honda",
    model: "CR-V",
    year: 2023,
    pricePerDay: 70,
    location: "Los Angeles",
    description:
      "Spacious SUV with excellent safety ratings and all-wheel drive capability.",
    imageUrl: "/placeholder.svg",
    features: JSON.stringify([
      "AWD",
      "Apple CarPlay",
      "Lane Assist",
      "Heated Seats",
    ]),
  },
  {
    make: "Tesla",
    model: "Model 3",
    year: 2023,
    pricePerDay: 120,
    location: "San Francisco",
    description:
      "Electric vehicle with autopilot features and supercharger network access.",
    imageUrl: "/placeholder.svg",
    features: JSON.stringify([
      "Electric",
      "Autopilot",
      "Premium Audio",
      "Supercharger Access",
    ]),
  },
  {
    make: "Ford",
    model: "Mustang",
    year: 2022,
    pricePerDay: 100,
    location: "New York",
    description:
      "Classic American muscle car with modern performance and style.",
    imageUrl: "/placeholder.svg",
    features: JSON.stringify([
      "V8 Engine",
      "Sport Mode",
      "Premium Sound",
      "Performance Tires",
    ]),
  },
  {
    make: "BMW",
    model: "X5",
    year: 2023,
    pricePerDay: 150,
    location: "Miami",
    description: "Luxury SUV with premium amenities and powerful performance.",
    imageUrl: "/placeholder.svg",
    features: JSON.stringify([
      "Luxury Interior",
      "Navigation",
      "Panoramic Roof",
      "All-Wheel Drive",
    ]),
  },
];

// RBAC/ABAC Resources
const resources = [
  {
    name: "users",
    displayName: "Users",
    description: "User management and profiles",
    attributes: JSON.stringify({
      fields: ["id", "email", "name", "isActive", "department", "location"],
      sensitiveFields: ["password", "email"],
    }),
  },
  {
    name: "cars",
    displayName: "Cars",
    description: "Vehicle inventory and management",
    attributes: JSON.stringify({
      fields: ["id", "make", "model", "year", "location", "available"],
      categories: ["economy", "luxury", "electric", "suv"],
    }),
  },
  {
    name: "bookings",
    displayName: "Bookings",
    description: "Rental bookings and reservations",
    attributes: JSON.stringify({
      fields: ["id", "userId", "carId", "status", "totalPrice"],
      statuses: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
    }),
  },
  {
    name: "admin",
    displayName: "Administration",
    description: "Administrative functions and system settings",
    attributes: JSON.stringify({
      functions: [
        "user_management",
        "system_settings",
        "reports",
        "audit_logs",
      ],
    }),
  },
  {
    name: "depots",
    displayName: "Depots",
    description: "Depot management and car distribution centers",
    attributes: JSON.stringify({
      fields: ["id", "name", "address", "city", "state", "zipCode", "managerId", "isActive"],
      features: ["car_storage", "maintenance", "transfers", "operating_hours"],
    }),
  },
];

// Permissions
const permissions = [
  // User permissions
  {
    name: "users:read",
    displayName: "View Users",
    description: "View user profiles and basic information",
    resource: "users",
    action: "read",
  },
  {
    name: "users:write",
    displayName: "Manage Users",
    description: "Create and update user accounts",
    resource: "users",
    action: "write",
  },
  {
    name: "users:delete",
    displayName: "Delete Users",
    description: "Deactivate or delete user accounts",
    resource: "users",
    action: "delete",
  },
  {
    name: "users:admin",
    displayName: "User Administration",
    description: "Full user management including role assignment",
    resource: "users",
    action: "admin",
  },

  // Car permissions
  {
    name: "cars:read",
    displayName: "View Cars",
    description: "Browse and view car listings",
    resource: "cars",
    action: "read",
  },
  {
    name: "cars:write",
    displayName: "Manage Cars",
    description: "Add and update car listings",
    resource: "cars",
    action: "write",
  },
  {
    name: "cars:delete",
    displayName: "Remove Cars",
    description: "Remove cars from inventory",
    resource: "cars",
    action: "delete",
  },
  {
    name: "cars:admin",
    displayName: "Car Administration",
    description: "Full car inventory management",
    resource: "cars",
    action: "admin",
  },

  // Booking permissions
  {
    name: "bookings:read",
    displayName: "View Bookings",
    description: "View booking information",
    resource: "bookings",
    action: "read",
  },
  {
    name: "bookings:write",
    displayName: "Manage Bookings",
    description: "Create and modify bookings",
    resource: "bookings",
    action: "write",
  },
  {
    name: "bookings:delete",
    displayName: "Cancel Bookings",
    description: "Cancel or delete bookings",
    resource: "bookings",
    action: "delete",
  },
  {
    name: "bookings:admin",
    displayName: "Booking Administration",
    description: "Full booking system management",
    resource: "bookings",
    action: "admin",
  },

  // Admin permissions
  {
    name: "admin:access",
    displayName: "Admin Access",
    description: "Access administrative dashboard",
    resource: "admin",
    action: "read",
  },
  {
    name: "admin:settings",
    displayName: "System Settings",
    description: "Modify system configuration",
    resource: "admin",
    action: "write",
  },
  {
    name: "admin:reports",
    displayName: "View Reports",
    description: "Access system reports and analytics",
    resource: "admin",
    action: "read",
  },
  {
    name: "admin:audit",
    displayName: "Audit Logs",
    description: "View and manage audit logs",
    resource: "admin",
    action: "admin",
  },

  // Depot permissions
  {
    name: "depots:read",
    displayName: "View Depots",
    description: "View depot information and listings",
    resource: "depots",
    action: "read",
  },
  {
    name: "depots:write",
    displayName: "Manage Depots",
    description: "Create and update depot information",
    resource: "depots",
    action: "write",
  },
  {
    name: "depots:delete",
    displayName: "Delete Depots",
    description: "Remove depots from the system",
    resource: "depots",
    action: "delete",
  },
  {
    name: "depots:admin",
    displayName: "Depot Administration",
    description: "Full depot management including transfers and assignments",
    resource: "depots",
    action: "admin",
  },
];

// Roles
const roles = [
  {
    name: "SUPER_ADMIN",
    displayName: "Super Administrator",
    description: "Full system access with all permissions",
    isSystem: true,
    permissions: [
      "users:admin",
      "cars:admin",
      "bookings:admin",
      "depots:admin",
      "admin:access",
      "admin:settings",
      "admin:reports",
      "admin:audit",
    ],
  },
  {
    name: "ADMIN",
    displayName: "Administrator",
    description: "Administrative access with user and content management",
    isSystem: true,
    permissions: [
      "users:read",
      "users:write",
      "cars:admin",
      "bookings:admin",
      "depots:admin",
      "admin:access",
      "admin:reports",
    ],
  },
  {
    name: "MANAGER",
    displayName: "Manager",
    description: "Management access with booking and car oversight",
    isSystem: false,
    permissions: [
      "users:read",
      "cars:read",
      "cars:write",
      "bookings:admin",
      "depots:read",
      "depots:write",
      "admin:access",
      "admin:reports",
    ],
  },
  {
    name: "MODERATOR",
    displayName: "Moderator",
    description: "Content moderation and basic user management",
    isSystem: false,
    permissions: [
      "users:read",
      "cars:read",
      "cars:write",
      "bookings:read",
      "bookings:write",
      "depots:read",
    ],
  },
  {
    name: "USER",
    displayName: "Regular User",
    description: "Standard user with booking capabilities",
    isSystem: false,
    permissions: ["cars:read", "bookings:read", "bookings:write"],
  },
];

// ABAC Policy Rules
const policyRules = [
  {
    name: "own_bookings_only",
    description: "Users can only access their own bookings",
    effect: PolicyEffect.ALLOW,
    conditions: JSON.stringify({
      resource: "bookings",
      condition: "user.id == resource.userId",
      actions: ["read", "write"],
    }),
    priority: 200,
  },
  {
    name: "location_based_car_access",
    description:
      "Users can only book cars in their location (if location is set)",
    effect: PolicyEffect.ALLOW,
    conditions: JSON.stringify({
      resource: "cars",
      condition: "user.location == null OR user.location == resource.location",
      actions: ["read"],
    }),
    priority: 150,
  },
  {
    name: "department_user_access",
    description: "Managers can only manage users in their department",
    effect: PolicyEffect.ALLOW,
    conditions: JSON.stringify({
      resource: "users",
      condition:
        "user.department == resource.department AND user.role == 'MANAGER'",
      actions: ["read", "write"],
    }),
    priority: 180,
  },
  {
    name: "business_hours_booking",
    description: "Regular users can only create bookings during business hours",
    effect: PolicyEffect.DENY,
    conditions: JSON.stringify({
      resource: "bookings",
      condition: "user.role == 'USER' AND (hour < 9 OR hour > 17)",
      actions: ["write"],
    }),
    priority: 300,
  },
];

async function seedResources() {
  console.log("📋 Seeding resources...");

  for (const resource of resources) {
    await prisma.resource.upsert({
      where: { name: resource.name },
      update: resource,
      create: resource,
    });
  }

  console.log(`✅ Seeded ${resources.length} resources`);
}

async function seedPermissions() {
  console.log("🔐 Seeding permissions...");

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission,
    });
  }

  console.log(`✅ Seeded ${permissions.length} permissions`);
}

async function seedRoles() {
  console.log("💼 Seeding roles...");

  for (const roleData of roles) {
    const { permissions: rolePermissions, ...role } = roleData;

    // Create or update role
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });

    // Clear existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: createdRole.id },
    });

    // Assign permissions to role
    for (const permissionName of rolePermissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (permission) {
        await prisma.rolePermission.create({
          data: {
            roleId: createdRole.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  console.log(`✅ Seeded ${roles.length} roles with permissions`);
}

async function seedPolicyRules() {
  console.log("📝 Seeding ABAC policy rules...");

  for (const rule of policyRules) {
    await prisma.policyRule.upsert({
      where: { name: rule.name },
      update: rule,
      create: rule,
    });
  }

  console.log(`✅ Seeded ${policyRules.length} policy rules`);
}

async function createAdminUser() {
  console.log("🚀 Creating admin user...");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      userRoles: {
        some: {
          role: {
            name: "SUPER_ADMIN",
          },
        },
      },
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (existingAdmin) {
    console.log("✅ Super admin user already exists:", existingAdmin.email);

    // Check if the legacy role field is set correctly
    if (existingAdmin.role !== "ADMIN") {
      console.log("🔧 Updating legacy role field for existing admin...");
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: "ADMIN" },
      });
      console.log("✅ Legacy role field updated successfully!");
    }

    return existingAdmin;
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
      role: "ADMIN", // Set legacy role field for backward compatibility
      isActive: true,
      emailVerified: true, // Admin users are pre-verified
      emailVerificationStatus: "VERIFIED",
      department: "IT",
      location: "San Francisco",
      attributes: JSON.stringify({
        clearanceLevel: "high",
        canAccessAllDepartments: true,
        canWorkOutsideBusinessHours: true,
      }),
    },
  });

  // Assign SUPER_ADMIN role
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });

  if (superAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
        assignedBy: "SYSTEM",
      },
    });
  }

  console.log("✅ Super admin user created successfully!");
  console.log(`📧 Email: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log(`👤 Name: ${adminName}`);
  console.log(`🆔 ID: ${adminUser.id}`);
  console.log(`💼 Role: SUPER_ADMIN`);
  console.log("");
  console.log(
    "⚠️  IMPORTANT: Please change the default password after first login!"
  );

  return adminUser;
}

async function createSampleUsers() {
  console.log("👥 Creating sample users...");

  const sampleUsers = [
    {
      email: "manager@carshare.com",
      name: "Fleet Manager",
      password: "manager123",
      department: "Operations",
      location: "San Francisco",
      roleName: "MANAGER",
    },
    {
      email: "user@carshare.com",
      name: "John Customer",
      password: "user123",
      department: "Customer",
      location: "San Francisco",
      roleName: "USER",
    },
  ];

  for (const userData of sampleUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.roleName === "MANAGER" ? "USER" : "USER", // Set legacy role (only USER or ADMIN available)
          isActive: true,
          department: userData.department,
          location: userData.location,
          attributes: JSON.stringify({
            customerType:
              userData.roleName === "USER" ? "individual" : "business",
          }),
        },
      });

      // Assign role
      const role = await prisma.role.findUnique({
        where: { name: userData.roleName },
      });

      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            assignedBy: "SYSTEM",
          },
        });
      }

      console.log(`   ✅ Created ${userData.roleName}: ${userData.email}`);
    } else {
      console.log(`   ℹ️ User already exists: ${userData.email}`);
    }
  }
}

async function seedCars() {
  console.log("🚗 Seeding car data...");

  // Check if cars already exist
  const existingCars = await prisma.car.findMany();

  if (existingCars.length > 0) {
    console.log(`✅ Cars already exist: ${existingCars.length} cars found`);
    return existingCars;
  }

  // Create sample cars
  const cars = await Promise.all(
    sampleCars.map((car) => prisma.car.create({ data: car }))
  );

  console.log(`✅ Successfully seeded ${cars.length} cars`);
  cars.forEach((car, index) => {
    console.log(
      `   ${index + 1}. ${car.make} ${car.model} (${car.year}) - $${
        car.pricePerDay
      }/day`
    );
  });

  return cars;
}

async function seedDepots() {
  console.log("🏢 Seeding depots...");

  const sampleDepots = [
    {
      name: "Downtown San Francisco Depot",
      address: "123 Market Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      phone: "+1 (415) 555-0101",
      email: "sf-downtown@carshare.com",
      capacity: 50,
      isActive: true,
      operatingHours: JSON.stringify({
        monday: { open: "06:00", close: "22:00" },
        tuesday: { open: "06:00", close: "22:00" },
        wednesday: { open: "06:00", close: "22:00" },
        thursday: { open: "06:00", close: "22:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "07:00", close: "23:00" },
        sunday: { open: "07:00", close: "21:00" }
      }),
    },
    {
      name: "Los Angeles Central Hub",
      address: "456 Wilshire Boulevard",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90010",
      phone: "+1 (213) 555-0202",
      email: "la-central@carshare.com",
      capacity: 75,
      isActive: true,
      operatingHours: JSON.stringify({
        monday: { open: "05:30", close: "22:30" },
        tuesday: { open: "05:30", close: "22:30" },
        wednesday: { open: "05:30", close: "22:30" },
        thursday: { open: "05:30", close: "22:30" },
        friday: { open: "05:30", close: "23:30" },
        saturday: { open: "06:30", close: "23:30" },
        sunday: { open: "06:30", close: "22:00" }
      }),
    },
    {
      name: "New York Manhattan Depot",
      address: "789 Broadway",
      city: "New York",
      state: "NY",
      zipCode: "10003",
      phone: "+1 (212) 555-0303",
      email: "ny-manhattan@carshare.com",
      capacity: 60,
      isActive: true,
      operatingHours: JSON.stringify({
        monday: { open: "06:00", close: "22:00" },
        tuesday: { open: "06:00", close: "22:00" },
        wednesday: { open: "06:00", close: "22:00" },
        thursday: { open: "06:00", close: "22:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "07:00", close: "23:00" },
        sunday: { open: "08:00", close: "21:00" }
      }),
    },
    {
      name: "Miami Beach Depot",
      address: "321 Ocean Drive",
      city: "Miami Beach",
      state: "FL",
      zipCode: "33139",
      phone: "+1 (305) 555-0404",
      email: "miami-beach@carshare.com",
      capacity: 40,
      isActive: true,
      operatingHours: JSON.stringify({
        monday: { open: "07:00", close: "21:00" },
        tuesday: { open: "07:00", close: "21:00" },
        wednesday: { open: "07:00", close: "21:00" },
        thursday: { open: "07:00", close: "21:00" },
        friday: { open: "07:00", close: "22:00" },
        saturday: { open: "08:00", close: "22:00" },
        sunday: { open: "08:00", close: "20:00" }
      }),
    },
    {
      name: "Seattle Tech District Depot",
      address: "654 Pine Street",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      phone: "+1 (206) 555-0505",
      email: "seattle-tech@carshare.com",
      capacity: 45,
      isActive: true,
      operatingHours: JSON.stringify({
        monday: { open: "06:00", close: "22:00" },
        tuesday: { open: "06:00", close: "22:00" },
        wednesday: { open: "06:00", close: "22:00" },
        thursday: { open: "06:00", close: "22:00" },
        friday: { open: "06:00", close: "22:00" },
        saturday: { open: "07:00", close: "21:00" },
        sunday: { open: "08:00", close: "20:00" }
      }),
    },
    {
      name: "Austin Downtown Depot",
      address: "987 Congress Avenue",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      phone: "+1 (512) 555-0606",
      email: "austin-downtown@carshare.com",
      capacity: 35,
      isActive: true,
      operatingHours: JSON.stringify({
        monday: { open: "06:30", close: "21:30" },
        tuesday: { open: "06:30", close: "21:30" },
        wednesday: { open: "06:30", close: "21:30" },
        thursday: { open: "06:30", close: "21:30" },
        friday: { open: "06:30", close: "22:30" },
        saturday: { open: "07:30", close: "22:30" },
        sunday: { open: "08:00", close: "21:00" }
      }),
    },
  ];

  for (const depotData of sampleDepots) {
    await prisma.depot.upsert({
      where: { name: depotData.name },
      update: {},
      create: depotData,
    });
  }

  const depotCount = await prisma.depot.count();
  console.log(`   ✅ Created/updated ${depotCount} depots`);
}

async function main() {
  try {
    console.log("🌱 Starting comprehensive database seed...");
    console.log("");

    // Seed RBAC/ABAC system
    await seedResources();
    console.log("");

    await seedPermissions();
    console.log("");

    await seedRoles();
    console.log("");

    await seedPolicyRules();
    console.log("");

    // Seed users with roles
    await createAdminUser();
    console.log("");

    await createSampleUsers();
    console.log("");

    // Seed cars
    await seedCars();
    console.log("");

    // Seed depots
    await seedDepots();
    console.log("");

    console.log("🎉 Database seeding completed successfully!");
    console.log("🔗 Admin login URL: http://localhost:3000/admin/login");
    console.log("🔗 Cars page URL: http://localhost:3000/cars");
    console.log("");
    console.log("📋 RBAC/ABAC System Summary:");
    console.log("   • 5 Resources (users, cars, bookings, admin, depots)");
    console.log(
      "   • 20 Permissions (read/write/delete/admin for each resource)"
    );
    console.log("   • 5 Roles (SUPER_ADMIN, ADMIN, MANAGER, MODERATOR, USER)");
    console.log("   • 4 ABAC Policy Rules for fine-grained access control");
    console.log("   • Sample users with different roles for testing");
    console.log("   • Sample depots across major cities");
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
main()
  .then(() => {
    console.log("✨ Seed script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seed script failed:", error);
    process.exit(1);
  });
