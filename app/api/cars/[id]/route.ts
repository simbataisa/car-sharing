import { NextRequest, NextResponse } from "next/server";
import { getCar } from "@/lib/data";

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

    const car = await getCar(carId);

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json(car);
  } catch (error) {
    console.error("Error fetching car:", error);
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  }
}
