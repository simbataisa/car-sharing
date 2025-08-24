"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { CarCard } from "@/components/CarCard";

interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  location: string;
  description: string;
  imageUrl: string;
  available: boolean;
  features: string[];
}

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/cars");
        
        if (!response.ok) {
          throw new Error("Failed to fetch cars");
        }
        
        const data = await response.json();
        const carsData = Array.isArray(data) ? data : data.cars || [];
        setCars(carsData);
      } catch (error) {
        console.error("Error fetching cars:", error);
        setError("Failed to load cars. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCars();
  }, []);

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <main className="container mx-auto p-4">
          <h1 className="text-4xl font-bold mb-8">All Cars</h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading cars...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <main className="container mx-auto p-4">
          <h1 className="text-4xl font-bold mb-8">All Cars</h1>
          <div className="flex flex-col justify-center items-center h-64">
            <div className="text-lg text-red-600 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-8">All Cars</h1>
        {cars.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">No cars available at the moment.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
