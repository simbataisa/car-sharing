import { NextRequest, NextResponse } from "next/server";
import { cars } from "@/lib/data";

// GET /api/cars - Get all cars
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");
    const make = searchParams.get("make");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    let filteredCars = [...cars];

    // Filter by location if provided
    if (location) {
      filteredCars = filteredCars.filter((car) =>
        car.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by make if provided
    if (make) {
      filteredCars = filteredCars.filter((car) =>
        car.make.toLowerCase().includes(make.toLowerCase())
      );
    }

    // Filter by price range if provided
    if (minPrice) {
      const min = parseInt(minPrice);
      filteredCars = filteredCars.filter((car) => car.pricePerDay >= min);
    }

    if (maxPrice) {
      const max = parseInt(maxPrice);
      filteredCars = filteredCars.filter((car) => car.pricePerDay <= max);
    }

    return NextResponse.json(filteredCars);
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
