import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getActivityTracker } from "@/lib/activity-tracker";
import { ActivityEventFactory } from "@/lib/events/factory";

// Validation schema for car update
const carUpdateSchema = z.object({
  make: z.string().min(1, "Make is required").optional(),
  model: z.string().min(1, "Model is required").optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  pricePerDay: z.number().positive("Price must be positive").optional(),
  location: z.string().min(1, "Location is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  available: z.boolean().optional(),
  features: z.array(z.string()).optional(),
});

// Helper function to check admin permissions
async function checkAdminPermissions(session: any) {
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
    return { hasPermission: false, user: null };
  }

  // Check for cars permissions or legacy admin role
  const hasPermission =
    user.role === "ADMIN" ||
    user.userRoles.some((ur) =>
      ur.role.rolePermissions.some(
        (rp) =>
          rp.permission.name === "cars:write" ||
          rp.permission.name === "cars:admin" ||
          rp.permission.name === "cars:delete"
      )
    );

  return { hasPermission, user };
}

// GET /api/cars/[id] - Get single car
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const carId = parseInt(id);

    if (isNaN(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: {
        bookings: {
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Parse features from JSON string
    const carWithFeatures = {
      ...car,
      features: car.features ? JSON.parse(car.features) : [],
    };

    return NextResponse.json(carWithFeatures);
  } catch (error) {
    console.error("Error fetching car:", error);
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  }
}

// PUT /api/cars/[id] - Update car (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { hasPermission } = await checkAdminPermissions(session);

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const carId = parseInt(id);

    if (isNaN(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    // Check if car exists
    const existingCar = await prisma.car.findUnique({
      where: { id: carId },
    });

    if (!existingCar) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = carUpdateSchema.parse(body);

    // Prepare update data
    const updateData: any = { ...validatedData };
    if (validatedData.features) {
      updateData.features = JSON.stringify(validatedData.features);
    }

    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: updateData,
    });

    // Track car update activity
    const context = ActivityEventFactory.createContext(req, {
      userId: session.user.id,
      source: "api",
    });

    await getActivityTracker().trackActivity("UPDATE", "car", context, {
      resourceId: carId.toString(),
      description: `Updated car: ${updatedCar.make} ${updatedCar.model} (${updatedCar.year})`,
      metadata: {
        carId: carId,
        carMake: updatedCar.make,
        carModel: updatedCar.model,
        carYear: updatedCar.year,
        updatedFields: Object.keys(validatedData),
        previousData: {
          make: existingCar.make,
          model: existingCar.model,
          year: existingCar.year,
          location: existingCar.location,
          pricePerDay: existingCar.pricePerDay,
          available: existingCar.available,
        },
        newData: updateData,
      },
      severity: "INFO",
      tags: ["car-management", "admin-action"],
    });

    // Return car with parsed features
    const carWithFeatures = {
      ...updatedCar,
      features: updatedCar.features ? JSON.parse(updatedCar.features) : [],
    };

    return NextResponse.json(carWithFeatures);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating car:", error);
    return NextResponse.json(
      { error: "Failed to update car" },
      { status: 500 }
    );
  }
}

// DELETE /api/cars/[id] - Delete car (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { hasPermission } = await checkAdminPermissions(session);

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const carId = parseInt(id);

    if (isNaN(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    // Check if car exists
    const existingCar = await prisma.car.findUnique({
      where: { id: carId },
      include: {
        bookings: {
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        },
      },
    });

    if (!existingCar) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Check if car has active bookings
    if (existingCar.bookings.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete car with active bookings",
          details:
            "Please cancel or complete all bookings before deleting this car",
        },
        { status: 409 }
      );
    }

    await prisma.car.delete({
      where: { id: carId },
    });

    // Track car deletion activity
    const context = ActivityEventFactory.createContext(req, {
      userId: session.user.id,
      source: "api",
    });

    await getActivityTracker().trackActivity("DELETE", "car", context, {
      resourceId: carId.toString(),
      description: `Deleted car: ${existingCar.make} ${existingCar.model} (${existingCar.year})`,
      metadata: {
        carId: carId,
        carMake: existingCar.make,
        carModel: existingCar.model,
        carYear: existingCar.year,
        location: existingCar.location,
        pricePerDay: existingCar.pricePerDay,
        deletedAt: new Date().toISOString(),
      },
      severity: "WARN",
      tags: ["car-management", "admin-action", "deletion"],
    });

    return NextResponse.json(
      { message: "Car deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting car:", error);
    return NextResponse.json(
      { error: "Failed to delete car" },
      { status: 500 }
    );
  }
}
