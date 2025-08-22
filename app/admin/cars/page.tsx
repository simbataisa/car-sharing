"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert } from "@/components/ui/alert";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Car,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  Filter,
  RefreshCw,
} from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
  bookings?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

interface CarFormData {
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

const DEFAULT_FORM_DATA: CarFormData = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  pricePerDay: 0,
  location: "",
  description: "",
  imageUrl: "/placeholder.svg",
  available: true,
  features: [],
};

export default function CarsManagement() {
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  // Modal states
  const [showCarModal, setShowCarModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [deletingCar, setDeletingCar] = useState<Car | null>(null);
  const [formData, setFormData] = useState<CarFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  // Fetch cars data
  const fetchCars = async () => {
    try {
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

  useEffect(() => {
    fetchCars();
  }, []);

  // Filter cars based on search and filters
  useEffect(() => {
    let filtered = cars;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (car) =>
          car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
          car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          car.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter((car) =>
        car.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Availability filter
    if (availabilityFilter !== "all") {
      filtered = filtered.filter((car) =>
        availabilityFilter === "available" ? car.available : !car.available
      );
    }

    setFilteredCars(filtered);
  }, [cars, searchTerm, locationFilter, availabilityFilter]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingCar ? `/api/cars/${editingCar.id}` : "/api/cars";
      const method = editingCar ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save car");
      }

      await fetchCars();
      closeModal();
    } catch (error) {
      console.error("Error saving car:", error);
      setError(error instanceof Error ? error.message : "Failed to save car");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle car deletion
  const handleDelete = async () => {
    if (!deletingCar) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/cars/${deletingCar.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete car");
      }

      await fetchCars();
      setShowDeleteConfirm(false);
      setDeletingCar(null);
    } catch (error) {
      console.error("Error deleting car:", error);
      setError(error instanceof Error ? error.message : "Failed to delete car");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (showCarModal || showDeleteConfirm)) {
        closeModal();
      }
    };

    if (showCarModal || showDeleteConfirm) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showCarModal, showDeleteConfirm]);

  // Modal handlers
  const openCreateModal = () => {
    setEditingCar(null);
    setFormData(DEFAULT_FORM_DATA);
    setShowCarModal(true);
  };

  const openEditModal = (car: Car) => {
    setEditingCar(car);
    setFormData({
      make: car.make,
      model: car.model,
      year: car.year,
      pricePerDay: car.pricePerDay,
      location: car.location,
      description: car.description,
      imageUrl: car.imageUrl || "/placeholder.svg",
      available: car.available,
      features: car.features || [],
    });
    setShowCarModal(true);
  };

  const openDeleteModal = (car: Car) => {
    setDeletingCar(car);
    setShowDeleteConfirm(true);
  };

  const closeModal = () => {
    setShowCarModal(false);
    setShowDeleteConfirm(false);
    setEditingCar(null);
    setDeletingCar(null);
    setFormData(DEFAULT_FORM_DATA);
    setNewFeature("");
    setError(null);
  };

  // Feature management
  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (feature: string) => {
    setFormData({
      ...formData,
      features: formData.features.filter((f) => f !== feature),
    });
  };

  // Get unique locations for filter
  const uniqueLocations = Array.from(new Set(cars.map((car) => car.location)));

  if (isLoading) {
    return (
      <AdminLayout title="Car Management">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Car Management">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Car Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your vehicle inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchCars}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Car
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                ×
              </Button>
            </div>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by make, model, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="availability">Availability</Label>
                <select
                  id="availability"
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Cars</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setLocationFilter("");
                    setAvailabilityFilter("all");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Total Cars
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {cars.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                  <div className="h-3 w-3 bg-green-600 rounded-full" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Available</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {cars.filter((car) => car.available).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Locations</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {uniqueLocations.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Avg Price</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    $
                    {cars.length > 0
                      ? Math.round(
                          cars.reduce((sum, car) => sum + car.pricePerDay, 0) /
                            cars.length
                        )
                      : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cars Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cars ({filteredCars.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCars.length === 0 ? (
              <div className="text-center py-8">
                <Car className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No cars found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {cars.length === 0
                    ? "Get started by adding your first car."
                    : "Try adjusting your filters."}
                </p>
                {cars.length === 0 && (
                  <div className="mt-6">
                    <Button onClick={openCreateModal}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Car
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price/Day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCars.map((car) => (
                      <tr key={car.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={car.imageUrl}
                                alt={`${car.make} ${car.model}`}
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {car.make} {car.model}
                              </div>
                              <div className="text-sm text-gray-500">
                                {car.year}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                            {car.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${car.pricePerDay}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              car.available
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {car.available ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(car)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(car)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Car Create/Edit Modal */}
      {showCarModal && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={closeModal}
            ></div>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            {/* Modal panel */}
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Car className="w-6 h-6 text-blue-600 mr-2" />
                          <h3
                            className="text-lg leading-6 font-medium text-gray-900"
                            id="modal-title"
                          >
                            {editingCar ? "Edit Car" : "Add New Car"}
                          </h3>
                        </div>
                        <button
                          type="button"
                          className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          onClick={closeModal}
                        >
                          <span className="sr-only">Close</span>
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="make">Make</Label>
                          <Input
                            id="make"
                            type="text"
                            value={formData.make}
                            onChange={(e) =>
                              setFormData({ ...formData, make: e.target.value })
                            }
                            required
                            placeholder="Toyota, Honda, etc."
                          />
                        </div>

                        <div>
                          <Label htmlFor="model">Model</Label>
                          <Input
                            id="model"
                            type="text"
                            value={formData.model}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                model: e.target.value,
                              })
                            }
                            required
                            placeholder="Camry, Civic, etc."
                          />
                        </div>

                        <div>
                          <Label htmlFor="year">Year</Label>
                          <Input
                            id="year"
                            type="number"
                            value={formData.year}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                year:
                                  parseInt(e.target.value) ||
                                  new Date().getFullYear(),
                              })
                            }
                            required
                            min="1900"
                            max={new Date().getFullYear() + 1}
                          />
                        </div>

                        <div>
                          <Label htmlFor="pricePerDay">Price per Day ($)</Label>
                          <Input
                            id="pricePerDay"
                            type="number"
                            step="0.01"
                            value={formData.pricePerDay}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                pricePerDay: parseFloat(e.target.value) || 0,
                              })
                            }
                            required
                            min="0"
                            placeholder="50.00"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            type="text"
                            value={formData.location}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                location: e.target.value,
                              })
                            }
                            required
                            placeholder="San Francisco, CA"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="description">Description</Label>
                          <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                            required
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe the car's features and benefits..."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="imageUrl">Image URL</Label>
                          <Input
                            id="imageUrl"
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                imageUrl: e.target.value,
                              })
                            }
                            placeholder="https://example.com/car-image.jpg"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <div className="flex items-center space-x-2">
                            <input
                              id="available"
                              type="checkbox"
                              checked={formData.available}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  available: e.target.checked,
                                })
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Label htmlFor="available">
                              Available for booking
                            </Label>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <Label>Features</Label>
                          <div className="flex gap-2 mb-2">
                            <Input
                              type="text"
                              value={newFeature}
                              onChange={(e) => setNewFeature(e.target.value)}
                              placeholder="Add a feature..."
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addFeature();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={addFeature}
                              variant="outline"
                              size="sm"
                            >
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.features.map((feature, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                              >
                                {feature}
                                <button
                                  type="button"
                                  onClick={() => removeFeature(feature)}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {isSubmitting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>{editingCar ? "Update" : "Create"} Car</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingCar && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={closeModal}
            ></div>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            {/* Modal panel */}
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3
                      className="text-lg leading-6 font-medium text-gray-900"
                      id="modal-title"
                    >
                      Delete Car
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete{" "}
                        <strong>
                          {deletingCar.make} {deletingCar.model} (
                          {deletingCar.year})
                        </strong>
                        ? This action cannot be undone.
                      </p>
                      {deletingCar.bookings &&
                        deletingCar.bookings.length > 0 && (
                          <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-800">
                              <strong>Warning:</strong> This car has{" "}
                              {deletingCar.bookings.length} active booking(s).
                              Deletion may fail if there are pending or
                              confirmed bookings.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  variant="destructive"
                  className="w-full sm:w-auto sm:ml-3"
                >
                  {isSubmitting ? <LoadingSpinner size="sm" /> : "Delete Car"}
                </Button>
                <Button
                  onClick={closeModal}
                  variant="outline"
                  disabled={isSubmitting}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
