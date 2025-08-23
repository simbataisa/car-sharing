import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getActivityTracker } from "@/lib/activity-tracker";
import { ActivityEventFactory } from "@/lib/events/factory";
import { withAnnotationTracking } from '@/lib/annotations/middleware';

// Validation schema for car creation/update
const carSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  pricePerDay: z.number().positive("Price must be positive"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .default("/placeholder.svg"),
  available: z.boolean().optional().default(true),
  features: z.array(z.string()).optional().default([]),
});

// GET /api/cars - Get all cars
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");
    const make = searchParams.get("make");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const available = searchParams.get("available");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Build where clause for filtering
    const where: any = {};

    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    if (make) {
      where.make = {
        contains: make,
        mode: "insensitive",
      };
    }

    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
    }

    if (available !== null) {
      where.available = available === "true";
    }

    // Get total count for pagination
    const totalCount = await prisma.car.count({ where });

    // Build query options
    const queryOptions: any = {
      where,
      orderBy: { createdAt: "desc" },
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
    }

    if (offset) {
      queryOptions.skip = parseInt(offset);
    }

    const cars = await prisma.car.findMany(queryOptions);

    // Parse features from JSON string
    const carsWithFeatures = cars.map((car) => ({
      ...car,
      features: car.features ? JSON.parse(car.features) : [],
    }));

    return NextResponse.json({
      cars: carsWithFeatures,
      pagination: {
        totalCount,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}

// POST /api/cars - Create new car (Admin only)
async function postHandler(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for cars:write permission or legacy admin role
    const hasPermission =
      user.role === "ADMIN" ||
      user.userRoles.some((ur) =>
        ur.role.rolePermissions.some(
          (rp) =>
            rp.permission.name === "cars:write" ||
            rp.permission.name === "cars:admin"
        )
      );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = carSchema.parse(body);

    const car = await prisma.car.create({
      data: {
        ...validatedData,
        features: JSON.stringify(validatedData.features || []),
      },
    });

    // Track car creation activity
    const context = ActivityEventFactory.createContext(req, {
      userId: session.user.id,
      source: "api",
    });

    await getActivityTracker().trackActivity("CREATE", "car", context, {
      resourceId: car.id.toString(),
      description: `Created new car: ${car.make} ${car.model} (${car.year})`,
      metadata: {
        carMake: car.make,
        carModel: car.model,
        carYear: car.year,
        location: car.location,
        pricePerDay: car.pricePerDay,
        features: validatedData.features || [],
      },
      severity: "INFO",
      tags: ["car-management", "admin-action"],
    });

    return NextResponse.json(
      {
        ...car,
        features: validatedData.features || [],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating car:", error);
    return NextResponse.json(
      { error: "Failed to create car" },
      { status: 500 }
    );
  }
}

// Export tracked handlers
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "cars",
  description: "Get all cars with filtering",
  tags: ["cars", "search", "filter"]
});

export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "cars",
  description: "Create new car (Admin only)",
  tags: ["cars", "create", "admin"]
});
