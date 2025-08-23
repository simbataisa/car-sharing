import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";
import { adminBookingUpdateSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/admin/bookings/[id] - Get specific booking
export const GET = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const url = new URL(req.url);
    const bookingId = url.pathname.split("/").pop();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
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
            description: true,
            features: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Parse car features from JSON string
    const bookingWithFeatures = {
      ...booking,
      car: {
        ...booking.car,
        features: booking.car.features ? JSON.parse(booking.car.features) : [],
      },
    };

    return NextResponse.json(bookingWithFeatures);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
});

// PUT /api/admin/bookings/[id] - Update booking
export const PUT = withAdminAuth(async (req: NextRequest, adminUser: any) => {
  try {
    const url = new URL(req.url);
    const bookingId = url.pathname.split("/").pop();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    console.log("Booking update request body:", body);
    const validatedData = adminBookingUpdateSchema.parse(body);

    // Convert datetime-local format to ISO format for database storage
    const updateData: any = { ...validatedData };
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate).toISOString();
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate).toISOString();
    }

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // If updating dates, validate them
    if (updateData.startDate && updateData.endDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.endDate);

      if (startDate >= endDate) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        );
      }

      // Check for conflicting bookings (excluding current booking)
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          id: { not: bookingId },
          carId: existingBooking.carId,
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
    }

    // Prevent certain status transitions
    if (updateData.status) {
      const currentStatus = existingBooking.status;
      const newStatus = updateData.status;

      // Business rules for status transitions
      if (currentStatus === "COMPLETED" && newStatus !== "COMPLETED") {
        return NextResponse.json(
          { error: "Cannot change status of completed booking" },
          { status: 400 }
        );
      }

      if (currentStatus === "CANCELLED" && newStatus === "CONFIRMED") {
        return NextResponse.json(
          { error: "Cannot confirm a cancelled booking" },
          { status: 400 }
        );
      }
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
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

    return NextResponse.json(updatedBooking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating booking:", error);
    return NextResponse.json(
      {
        error: "Failed to update booking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/bookings/[id] - Delete booking
export const DELETE = withAdminAuth(
  async (req: NextRequest, adminUser: any) => {
    try {
      const url = new URL(req.url);
      const bookingId = url.pathname.split("/").pop();

      if (!bookingId) {
        return NextResponse.json(
          { error: "Booking ID is required" },
          { status: 400 }
        );
      }

      // Check if booking exists
      const existingBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!existingBooking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      // Prevent deletion of confirmed or completed bookings
      if (existingBooking.status === "CONFIRMED") {
        return NextResponse.json(
          {
            error: "Cannot delete confirmed booking. Cancel the booking first.",
          },
          { status: 400 }
        );
      }

      if (existingBooking.status === "COMPLETED") {
        return NextResponse.json(
          {
            error: "Cannot delete completed booking for record keeping.",
          },
          { status: 400 }
        );
      }

      // Delete the booking
      await prisma.booking.delete({
        where: { id: bookingId },
      });

      return NextResponse.json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      return NextResponse.json(
        { error: "Failed to delete booking" },
        { status: 500 }
      );
    }
  }
);
