"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/CarCard";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { ErrorBoundary, ErrorMessage } from "@/components/ui/error-boundary";
import { Car } from "@/lib/data";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const [featuredCars, setFeaturedCars] = useState<Car[]>([]);
  const { isLoading, setIsLoading, error, setError } = useAppStore();

  useEffect(() => {
    const fetchFeaturedCars = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/cars");
        if (!response.ok) {
          throw new Error("Failed to fetch cars");
        }
        const cars = await response.json();
        // Get first 3 cars as featured
        setFeaturedCars(cars.slice(0, 3));
      } catch (error) {
        console.error("Error fetching cars:", error);
        setError("Failed to load featured cars");
        // Fallback to empty array
        setFeaturedCars([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedCars();
  }, []);

  const retryFetch = () => {
    const fetchFeaturedCars = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/cars");
        if (!response.ok) {
          throw new Error("Failed to fetch cars");
        }
        const cars = await response.json();
        setFeaturedCars(cars.slice(0, 3));
      } catch (error) {
        console.error("Error fetching cars:", error);
        setError("Failed to load featured cars");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeaturedCars();
  };

  return (
    <ErrorBoundary>
      <div>
        <Navbar />
        <main className="container mx-auto p-4">
          {/* Hero Section */}
          <section className="text-center my-16">
            <h1 className="text-5xl font-bold mb-4">
              Find Your Perfect Rental Car
            </h1>
            <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
              Book your next ride from our wide selection of premium cars. Fast,
              reliable, and available when you need them.
            </p>
            <div className="mt-8 space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Link href="/cars">
                <Button size="lg" className="w-full sm:w-auto">
                  Browse Cars
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Sign Up Today
                </Button>
              </Link>
            </div>
          </section>

          {/* Featured Cars Section */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">Featured Cars</h2>
                <p className="text-muted-foreground mt-2">
                  Discover our most popular vehicles
                </p>
              </div>
              <Link href="/cars">
                <Button variant="outline">View All Cars</Button>
              </Link>
            </div>

            {error ? (
              <ErrorMessage
                error={error}
                onRetry={retryFetch}
                title="Unable to load featured cars"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, index) => (
                    <LoadingCard key={index} />
                  ))
                ) : featuredCars.length > 0 ? (
                  featuredCars.map((car) => <CarCard key={car.id} car={car} />)
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      No featured cars available at the moment.
                    </p>
                    <Link href="/cars" className="mt-4 inline-block">
                      <Button>Browse All Cars</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Features Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16 border-t">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Booking</h3>
              <p className="text-muted-foreground">
                Book your car instantly with our streamlined booking process. No
                waiting, no hassle.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Cars</h3>
              <p className="text-muted-foreground">
                All our vehicles are regularly inspected and maintained for your
                safety and comfort.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Best Prices</h3>
              <p className="text-muted-foreground">
                Competitive pricing with no hidden fees. Pay only for what you
                book.
              </p>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
