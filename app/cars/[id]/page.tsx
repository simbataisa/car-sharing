"use client";

import { Metadata } from "next";
import { getCar } from "@/lib/data";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, differenceInDays } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Star, Clock, Shield, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bookingSchema, type BookingFormData } from "@/lib/validations";
import { parseCarFeatures, type Car, type CarWithFeatures } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { announceToScreenReader } from "@/lib/accessibility";

interface PageProps {
  params: { id: string };
}

// Note: Metadata generation is removed since this is now a client component
// For SEO, consider splitting this into separate server and client components

export default function CarDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { setIsLoading, setError, isLoading } = useAppStore();
  const [car, setCar] = useState<CarWithFeatures | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      carId: parseInt(params.id),
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const calculateTotal = () => {
    if (!car || !startDate || !endDate) return 0;
    const days = differenceInDays(new Date(endDate), new Date(startDate));
    return days > 0 ? days * car.pricePerDay : 0;
  };

  useEffect(() => {
    const fetchCar = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/cars/${params.id}`);
        if (!response.ok) {
          throw new Error("Car not found");
        }
        const carData: Car = await response.json();
        setCar(parseCarFeatures(carData));
        announceToScreenReader(
          `Car details loaded for ${carData.make} ${carData.model}`
        );
      } catch (error) {
        setError("Failed to load car details");
        announceToScreenReader("Failed to load car details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCar();
  }, [params.id]);

  const onSubmit = async (data: BookingFormData) => {
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      setIsLoading(true);
      setBookingError(null);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setBookingError(result.error || "Booking failed");
        announceToScreenReader(
          `Booking failed: ${result.error || "Unknown error"}`
        );
        return;
      }

      setBookingSuccess(true);
      announceToScreenReader("Booking successful! Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      setBookingError("An error occurred while booking");
      announceToScreenReader("An error occurred while booking");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <main className="container mx-auto p-4">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!car) {
    return (
      <div>
        <Navbar />
        <main className="container mx-auto p-4">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-600 mb-4">
              Car Not Found
            </h1>
            <Link href="/cars">
              <Button>Browse Other Cars</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div>
        <Navbar />
        <main className="container mx-auto p-4">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Booking Successful!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your booking request has been submitted. Redirecting to
              dashboard...
            </p>
            <Button asChild>
              <Link href="/dashboard">View My Bookings</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          {/* Car Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Car Image */}
            <div className="relative h-80 w-full rounded-lg overflow-hidden">
              <Image
                src={car.imageUrl}
                alt={`${car.make} ${car.model}`}
                fill
                className="object-cover"
              />
            </div>

            {/* Car Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold">
                  {car.make} {car.model} {car.year}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {car.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    4.8 (24 reviews)
                  </div>
                </div>
              </div>

              <p className="text-lg text-muted-foreground">{car.description}</p>

              {/* Features */}
              {car.features && car.features.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {car.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Shield className="w-4 h-4 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Book This Car</span>
                  <span className="text-2xl font-bold text-primary">
                    ${car.pricePerDay}/day
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {bookingError && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      {bookingError}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="startDate">Pickup Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register("startDate")}
                      className={errors.startDate ? "border-red-500" : ""}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.startDate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="endDate">Return Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...register("endDate")}
                      className={errors.endDate ? "border-red-500" : ""}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.endDate.message}
                      </p>
                    )}
                  </div>

                  {/* Booking Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Price per day:</span>
                      <span>${car.pricePerDay}</span>
                    </div>
                    {startDate && endDate && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Days:</span>
                          <span>
                            {Math.max(
                              0,
                              differenceInDays(
                                new Date(endDate),
                                new Date(startDate)
                              )
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total:</span>
                          <span>${calculateTotal()}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {session ? (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || calculateTotal() <= 0}
                    >
                      {isLoading
                        ? "Processing..."
                        : `Book Now - $${calculateTotal()}`}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button asChild className="w-full">
                        <Link href="/login">Login to Book</Link>
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/signup" className="underline">
                          Sign up
                        </Link>
                      </p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
