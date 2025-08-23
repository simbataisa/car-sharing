import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { z } from "zod";

// Validation schema for booking update
const updateBookingSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  totalPrice: z.number().positive().optional(),
});

// GET /api/admin/bookings - Get all bookings with pagination and filtering
export const GET = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const offset = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};

    // Search filter (user name, email, or car make/model)
    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          car: {
            OR: [
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Date range filter
    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.startDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.startDate = {
        lte: new Date(endDate),
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.booking.count({ where });

    // Build order by clause
    let orderBy: any = {};
    if (sortBy === "user") {
      orderBy = { user: { name: sortOrder } };
    } else if (sortBy === "car") {
      orderBy = { car: { make: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Fetch bookings with relationships
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            imageUrl: true,
            pricePerDay: true,
            location: true,
          },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    // Calculate statistics
    const stats = await prisma.booking.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    const totalRevenue = await prisma.booking.aggregate({
      where: {
        status: {
          in: ["CONFIRMED", "COMPLETED"],
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const statusStats = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };

    stats.forEach((stat) => {
      statusStats[stat.status as keyof typeof statusStats] = stat._count.status;
    });

    return NextResponse.json({
      bookings,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      statistics: {
        totalBookings: totalCount,
        statusBreakdown: statusStats,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
});

// POST /api/admin/bookings - Create new booking (for admin use)
export const POST = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const body = await req.json();

    // For admin booking creation, we need additional fields
    const createBookingSchema = z.object({
      userId: z.string().cuid("Invalid user ID"),
      carId: z.number().positive("Invalid car ID"),
      startDate: z.string().datetime("Invalid start date"),
      endDate: z.string().datetime("Invalid end date"),
      totalPrice: z.number().positive("Total price must be positive"),
      status: z
        .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"])
        .default("PENDING"),
    });

    const validatedData = createBookingSchema.parse(body);

    // Validate dates
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if car exists and is available
    const car = await prisma.car.findUnique({
      where: { id: validatedData.carId },
    });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    if (!car.available) {
      return NextResponse.json(
        { error: "Car is not available" },
        { status: 400 }
      );
    }

    // Check for conflicting bookings
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        carId: validatedData.carId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gt: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lt: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      return NextResponse.json(
        { error: "Car is already booked for the selected dates" },
        { status: 409 }
      );
    }

    // Create the booking
    const newBooking = await prisma.booking.create({
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            imageUrl: true,
            pricePerDay: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json(newBooking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
});
