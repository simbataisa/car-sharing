import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { withAnnotationTracking } from '@/lib/annotations/middleware';

const createBookingSchema = z.object({
  carId: z.number().positive("Car ID must be a positive number"),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date",
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date",
  }),
});

// GET /api/bookings - Get user's bookings
async function getHandler(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: session.user.id },
      include: {
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            imageUrl: true,
            pricePerDay: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create new booking
async function postHandler(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = createBookingSchema.parse(body);

    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    // Validate dates
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: "Start date cannot be in the past" },
        { status: 400 }
      );
    }

    // Check if car exists (in real app, this would check database)
    // For now, we'll assume the car exists since we're using mock data

    // Calculate total price (days * price per day)
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // For now, we'll use a mock price calculation
    // In a real app, you'd fetch the car price from the database
    const pricePerDay = 50; // Mock price
    const totalPrice = days * pricePerDay;

    // Create booking (this would go to database in real app)
    const booking = {
      id: Date.now().toString(), // Mock ID
      userId: session.user.id,
      carId: validatedData.carId,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      totalPrice,
      status: "PENDING" as const,
      createdAt: new Date().toISOString(),
    };

    // In a real app, you would save to database here
    // await prisma.booking.create({ data: booking });

    return NextResponse.json(booking, { status: 201 });
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
}

// Export tracked handlers
export const GET = withAnnotationTracking(getHandler, {
  action: "READ",
  resource: "bookings",
  description: "Get user's bookings",
  tags: ["bookings", "user", "list"]
});

export const POST = withAnnotationTracking(postHandler, {
  action: "CREATE",
  resource: "bookings",
  description: "Create new booking",
  tags: ["bookings", "create", "reservation"]
});
