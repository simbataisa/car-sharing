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
  depot?: {
    id: number;
    name: string;
    city: string;
    state: string;
    address: string;
  };
}

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [depotFilter, setDepotFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");

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
        setFilteredCars(carsData);
      } catch (error) {
        console.error("Error fetching cars:", error);
        setError("Failed to load cars. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCars();
  }, []);

  // Filter cars based on search and filter criteria
  useEffect(() => {
    let filtered = cars;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(car => 
        car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (car.depot?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
    }

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter(car => car.location === locationFilter);
    }

    // Depot filter
    if (depotFilter) {
      filtered = filtered.filter(car => car.depot?.name === depotFilter);
    }

    // Availability filter
    if (availabilityFilter) {
      const isAvailable = availabilityFilter === "available";
      filtered = filtered.filter(car => car.available === isAvailable);
    }

    setFilteredCars(filtered);
  }, [cars, searchTerm, locationFilter, depotFilter, availabilityFilter]);

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
        
        {/* Search and Filter Section */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by make, model, location, depot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {Array.from(new Set(cars.map(car => car.location))).map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            {/* Depot Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Depot
              </label>
              <select
                value={depotFilter}
                onChange={(e) => setDepotFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Depots</option>
                {Array.from(new Set(cars.filter(car => car.depot).map(car => car.depot!.name))).map(depotName => (
                  <option key={depotName} value={depotName}>{depotName}</option>
                ))}
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cars</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setLocationFilter("");
                  setDepotFilter("");
                  setAvailabilityFilter("");
                }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {filteredCars.length} of {cars.length} cars
          </div>
        </div>
        
        {filteredCars.length === 0 ? (
           <div className="flex justify-center items-center h-64">
             <div className="text-lg text-gray-600">
               {cars.length === 0 ? "No cars available at the moment." : "No cars match your current filters."}
             </div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
