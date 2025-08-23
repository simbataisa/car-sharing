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
  Calendar,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  Plus,
  User,
  Car,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";

interface Booking {
  id: string;
  userId: string;
  carId: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  car: {
    id: number;
    make: string;
    model: string;
    year: number;
    imageUrl: string;
    pricePerDay: number;
    location: string;
  };
}

interface BookingStats {
  totalBookings: number;
  statusBreakdown: {
    PENDING: number;
    CONFIRMED: number;
    CANCELLED: number;
    COMPLETED: number;
  };
  totalRevenue: number;
}

interface BookingFormData {
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  startDate: string;
  endDate: string;
  totalPrice: number;
}

interface CreateBookingFormData {
  userId: string;
  carId: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  location: string;
  available: boolean;
  imageUrl: string;
}

interface EmailVerificationData {
  email: string;
  verified: boolean;
  step: "input" | "verify" | "create_user" | "completed";
}

const DEFAULT_FORM_DATA: BookingFormData = {
  status: "PENDING",
  startDate: "",
  endDate: "",
  totalPrice: 0,
};

const DEFAULT_CREATE_FORM_DATA: CreateBookingFormData = {
  userId: "",
  carId: 0,
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  totalPrice: 0,
  status: "PENDING",
};

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<BookingFormData>(DEFAULT_FORM_DATA);
  const [createFormData, setCreateFormData] = useState<CreateBookingFormData>(
    DEFAULT_CREATE_FORM_DATA
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data for dropdowns
  const [users, setUsers] = useState<User[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCars, setLoadingCars] = useState(false);

  // Email verification state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [emailVerification, setEmailVerification] =
    useState<EmailVerificationData>({
      email: "",
      verified: false,
      step: "input",
    });
  const [otpCode, setOtpCode] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  // Fetch bookings data
  const fetchBookings = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter) params.append("startDate", dateFilter);

      const response = await fetch(`/api/admin/bookings?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data.bookings || []);
      setFilteredBookings(data.bookings || []);
      setStats(data.statistics);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users for booking creation
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin/users?limit=100&role=USER");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch cars for booking creation
  const fetchCars = async () => {
    try {
      setLoadingCars(true);
      const response = await fetch("/api/cars?available=true");
      if (!response.ok) {
        throw new Error("Failed to fetch cars");
      }
      const data = await response.json();
      setCars(data.cars || []);
    } catch (error) {
      console.error("Error fetching cars:", error);
      setError("Failed to load cars. Please try again.");
    } finally {
      setLoadingCars(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentPage, sortBy, sortOrder]);

  useEffect(() => {
    // Client-side filtering for real-time search
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.car.model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(
        (booking) => new Date(booking.startDate) >= filterDate
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  // Handle form submission for booking updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${editingBooking.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update booking");
      }

      await fetchBookings();
      closeModal();
    } catch (error) {
      console.error("Error updating booking:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update booking"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle create booking submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form data
      if (
        !createFormData.userId ||
        !createFormData.carId ||
        !createFormData.startDate ||
        !createFormData.endDate
      ) {
        throw new Error("Please fill in all required fields");
      }

      if (
        new Date(createFormData.startDate) >= new Date(createFormData.endDate)
      ) {
        throw new Error("End date must be after start date");
      }

      // Convert dates to ISO string format
      const bookingData = {
        ...createFormData,
        startDate: new Date(createFormData.startDate).toISOString(),
        endDate: new Date(createFormData.endDate).toISOString(),
      };

      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create booking");
      }

      await fetchBookings();
      closeCreateModal();
    } catch (error) {
      console.error("Error creating booking:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create booking"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total price for create booking
  const calculateTotalPrice = () => {
    if (
      !createFormData.startDate ||
      !createFormData.endDate ||
      !createFormData.carId
    ) {
      return 0;
    }

    const selectedCar = cars.find((car) => car.id === createFormData.carId);
    if (!selectedCar) return 0;

    const startDate = new Date(createFormData.startDate);
    const endDate = new Date(createFormData.endDate);
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return days > 0 ? days * selectedCar.pricePerDay : 0;
  };

  // Update total price when dates or car changes
  useEffect(() => {
    const total = calculateTotalPrice();
    setCreateFormData((prev) => ({ ...prev, totalPrice: total }));
  }, [
    createFormData.startDate,
    createFormData.endDate,
    createFormData.carId,
    cars,
  ]);

  // Email verification functions
  const sendOTP = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/admin/email/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailVerification.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send OTP");
      }

      setEmailVerification((prev) => ({ ...prev, step: "verify" }));
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOTP = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/admin/email/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailVerification.email,
          otp: otpCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify OTP");
      }

      setEmailVerification((prev) => ({
        ...prev,
        verified: true,
        step: "create_user",
      }));
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError(error instanceof Error ? error.message : "Failed to verify OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createUserAccount = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/admin/users/create-verified", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailVerification.email,
          name: newUserName,
          sendWelcomeEmail,
          role: "USER",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user");
      }

      const data = await response.json();

      // Add the new user to the users list
      const newUser = data.user;
      setUsers((prev) => [...prev, newUser]);

      // Set the new user as selected in the booking form
      setCreateFormData((prev) => ({ ...prev, userId: newUser.id }));

      // Close modals and reset state
      closeCreateUserModal();
      setEmailVerification({ email: "", verified: false, step: "input" });
      setOtpCode("");
      setNewUserName("");
    } catch (error) {
      console.error("Error creating user:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle booking deletion
  const handleDelete = async () => {
    if (!deletingBooking) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/bookings/${deletingBooking.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete booking");
      }

      await fetchBookings();
      setShowDeleteConfirm(false);
      setDeletingBooking(null);
    } catch (error) {
      console.error("Error deleting booking:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete booking"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal management functions
  const openViewModal = (booking: Booking) => {
    setViewingBooking(booking);
    setShowBookingModal(true);
  };

  const openEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      status: booking.status,
      startDate: new Date(booking.startDate).toISOString().slice(0, 16),
      endDate: new Date(booking.endDate).toISOString().slice(0, 16),
      totalPrice: booking.totalPrice,
    });
    setShowBookingModal(true);
  };

  const openDeleteModal = (booking: Booking) => {
    setDeletingBooking(booking);
    setShowDeleteConfirm(true);
  };

  const closeModal = () => {
    setShowBookingModal(false);
    setShowDeleteConfirm(false);
    setViewingBooking(null);
    setEditingBooking(null);
    setDeletingBooking(null);
    setFormData(DEFAULT_FORM_DATA);
    setError(null);
  };

  const openCreateModal = () => {
    setCreateFormData(DEFAULT_CREATE_FORM_DATA);
    setShowCreateModal(true);
    setError(null);
    // Fetch users and cars when opening create modal
    if (users.length === 0) fetchUsers();
    if (cars.length === 0) fetchCars();
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateFormData(DEFAULT_CREATE_FORM_DATA);
    setError(null);
  };

  const openCreateUserModal = () => {
    setShowCreateUserModal(true);
    setEmailVerification({ email: "", verified: false, step: "input" });
    setOtpCode("");
    setNewUserName("");
    setError(null);
  };

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false);
    setEmailVerification({ email: "", verified: false, step: "input" });
    setOtpCode("");
    setNewUserName("");
    setError(null);
  };

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        (showBookingModal ||
          showDeleteConfirm ||
          showCreateModal ||
          showCreateUserModal)
      ) {
        if (showCreateModal) {
          closeCreateModal();
        } else if (showCreateUserModal) {
          closeCreateUserModal();
        } else {
          closeModal();
        }
      }
    };

    if (
      showBookingModal ||
      showDeleteConfirm ||
      showCreateModal ||
      showCreateUserModal
    ) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [
    showBookingModal,
    showDeleteConfirm,
    showCreateModal,
    showCreateUserModal,
  ]);

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4" />;
      case "CONFIRMED":
        return <CheckCircle className="w-4 h-4" />;
      case "CANCELLED":
        return <XCircle className="w-4 h-4" />;
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <AdminLayout title="Booking Management">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Booking Management">
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </Alert>
        )}

        {/* Header with Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Booking Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor and manage all booking reservations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={openCreateModal}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Booking
            </Button>
            <Button
              onClick={fetchBookings}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Total Bookings
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.totalBookings}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Confirmed
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.statusBreakdown.CONFIRMED}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.statusBreakdown.PENDING}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${stats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by user or car..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <Label htmlFor="dateFilter">Start Date From</Label>
                <Input
                  id="dateFilter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setDateFilter("");
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No bookings found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {bookings.length === 0
                    ? "No bookings have been made yet."
                    : "Try adjusting your filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User & Car
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded object-cover"
                                src={booking.car.imageUrl}
                                alt={`${booking.car.make} ${booking.car.model}`}
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {booking.user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.user.email}
                              </div>
                              <div className="text-xs text-gray-400">
                                {booking.car.make} {booking.car.model} (
                                {booking.car.year})
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>From: {formatDate(booking.startDate)}</div>
                            <div>To: {formatDate(booking.endDate)}</div>
                            <div className="text-xs text-gray-500">
                              {calculateDays(
                                booking.startDate,
                                booking.endDate
                              )}{" "}
                              days
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${booking.totalPrice.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${booking.car.pricePerDay}/day
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full gap-1 ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(booking.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewModal(booking)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(booking)}
                              title="Edit Booking"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(booking)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Booking"
                              disabled={
                                booking.status === "CONFIRMED" ||
                                booking.status === "COMPLETED"
                              }
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

        {/* Booking View/Edit Modal */}
        {showBookingModal && (viewingBooking || editingBooking) && (
          <div
            className="fixed inset-0 z-[60] overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={closeModal}
              ></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                &#8203;
              </span>
              <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                {editingBooking ? (
                  <form onSubmit={handleSubmit}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Edit Booking
                        </h3>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600"
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
                      <div className="space-y-4">
                        <div>
                          <Label>Status</Label>
                          <select
                            value={formData.status}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value as any,
                              })
                            }
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="datetime-local"
                            value={formData.startDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                startDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="datetime-local"
                            value={formData.endDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                endDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Total Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.totalPrice}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                totalPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
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
                          "Update Booking"
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
                ) : (
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Booking Details
                      </h3>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={closeModal}
                      >
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
                    {viewingBooking && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <strong>User:</strong> {viewingBooking.user.name}
                          </div>
                          <div>
                            <strong>Email:</strong> {viewingBooking.user.email}
                          </div>
                          <div>
                            <strong>Car:</strong> {viewingBooking.car.make}{" "}
                            {viewingBooking.car.model} (
                            {viewingBooking.car.year})
                          </div>
                          <div>
                            <strong>Status:</strong>{" "}
                            <span
                              className={`px-2 py-1 rounded text-sm ${getStatusColor(
                                viewingBooking.status
                              )}`}
                            >
                              {viewingBooking.status}
                            </span>
                          </div>
                          <div>
                            <strong>Start:</strong>{" "}
                            {formatDate(viewingBooking.startDate)}
                          </div>
                          <div>
                            <strong>End:</strong>{" "}
                            {formatDate(viewingBooking.endDate)}
                          </div>
                          <div>
                            <strong>Duration:</strong>{" "}
                            {calculateDays(
                              viewingBooking.startDate,
                              viewingBooking.endDate
                            )}{" "}
                            days
                          </div>
                          <div>
                            <strong>Total Price:</strong> $
                            {viewingBooking.totalPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && deletingBooking && (
          <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75"
                onClick={closeModal}
              ></div>
              <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center">
                    <Trash2 className="h-6 w-6 text-red-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Delete Booking
                      </h3>
                      <p className="text-sm text-gray-500 mt-2">
                        Are you sure you want to delete this booking for{" "}
                        <strong>{deletingBooking.user.name}</strong>? This
                        action cannot be undone.
                      </p>
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
                    {isSubmitting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      "Delete Booking"
                    )}
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

        {/* Create Booking Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 z-[60] overflow-y-auto"
            aria-labelledby="create-modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={closeCreateModal}
              ></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                &#8203;
              </span>
              <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                <form onSubmit={handleCreateSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Calendar className="w-6 h-6 text-blue-600 mr-2" />
                        <h3
                          className="text-lg font-medium text-gray-900"
                          id="create-modal-title"
                        >
                          Create Booking for Customer
                        </h3>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={closeCreateModal}
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
                      {/* Customer Selection */}
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="customer">Customer *</Label>
                          <Button
                            type="button"
                            onClick={openCreateUserModal}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            Create New Customer
                          </Button>
                        </div>
                        {loadingUsers ? (
                          <div className="flex items-center justify-center py-2">
                            <LoadingSpinner size="sm" />
                            <span className="ml-2 text-sm text-gray-500">
                              Loading customers...
                            </span>
                          </div>
                        ) : (
                          <select
                            id="customer"
                            value={createFormData.userId}
                            onChange={(e) =>
                              setCreateFormData({
                                ...createFormData,
                                userId: e.target.value,
                              })
                            }
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a customer...</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </option>
                            ))}
                          </select>
                        )}
                        {!createFormData.userId && (
                          <p className="text-xs text-gray-500 mt-1">
                            Select an existing customer or create a new one
                          </p>
                        )}
                      </div>

                      {/* Car Selection */}
                      <div className="md:col-span-2">
                        <Label htmlFor="car">Vehicle *</Label>
                        {loadingCars ? (
                          <div className="flex items-center justify-center py-2">
                            <LoadingSpinner size="sm" />
                            <span className="ml-2 text-sm text-gray-500">
                              Loading vehicles...
                            </span>
                          </div>
                        ) : (
                          <select
                            id="car"
                            value={createFormData.carId}
                            onChange={(e) =>
                              setCreateFormData({
                                ...createFormData,
                                carId: parseInt(e.target.value) || 0,
                              })
                            }
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a vehicle...</option>
                            {cars.map((car) => (
                              <option key={car.id} value={car.id}>
                                {car.make} {car.model} {car.year} - $
                                {car.pricePerDay}/day ({car.location})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Date Selection */}
                      <div>
                        <Label htmlFor="createStartDate">Start Date *</Label>
                        <Input
                          id="createStartDate"
                          type="date"
                          value={createFormData.startDate}
                          onChange={(e) =>
                            setCreateFormData({
                              ...createFormData,
                              startDate: e.target.value,
                            })
                          }
                          required
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>

                      <div>
                        <Label htmlFor="createEndDate">End Date *</Label>
                        <Input
                          id="createEndDate"
                          type="date"
                          value={createFormData.endDate}
                          onChange={(e) =>
                            setCreateFormData({
                              ...createFormData,
                              endDate: e.target.value,
                            })
                          }
                          required
                          min={
                            createFormData.startDate ||
                            new Date().toISOString().split("T")[0]
                          }
                        />
                      </div>

                      {/* Status Selection */}
                      <div>
                        <Label htmlFor="createStatus">Status</Label>
                        <select
                          id="createStatus"
                          value={createFormData.status}
                          onChange={(e) =>
                            setCreateFormData({
                              ...createFormData,
                              status: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                        </select>
                      </div>

                      {/* Price Display */}
                      <div>
                        <Label>Total Price</Label>
                        <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                          <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-lg font-semibold text-gray-900">
                            {createFormData.totalPrice.toLocaleString()}
                          </span>
                        </div>
                        {createFormData.carId &&
                          createFormData.startDate &&
                          createFormData.endDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.ceil(
                                (new Date(createFormData.endDate).getTime() -
                                  new Date(
                                    createFormData.startDate
                                  ).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )}{" "}
                              days × $
                              {
                                cars.find(
                                  (car) => car.id === createFormData.carId
                                )?.pricePerDay
                              }
                              /day
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !createFormData.userId ||
                        !createFormData.carId
                      }
                      className="w-full sm:w-auto sm:ml-3"
                    >
                      {isSubmitting ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        `Create Booking - $${createFormData.totalPrice.toLocaleString()}`
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeCreateModal}
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

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div
            className="fixed inset-0 z-[60] overflow-y-auto"
            aria-labelledby="create-user-modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={closeCreateUserModal}
              ></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
                &#8203;
              </span>
              <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <User className="w-6 h-6 text-blue-600 mr-2" />
                      <h3
                        className="text-lg font-medium text-gray-900"
                        id="create-user-modal-title"
                      >
                        Create New Customer
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={closeCreateUserModal}
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

                  {/* Step 1: Email Input */}
                  {emailVerification.step === "input" && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="newCustomerEmail">
                          Email Address *
                        </Label>
                        <Input
                          id="newCustomerEmail"
                          type="email"
                          placeholder="customer@example.com"
                          value={emailVerification.email}
                          onChange={(e) =>
                            setEmailVerification((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          We'll send a verification code to this email address
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: OTP Verification */}
                  {emailVerification.step === "verify" && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          Verify Email Address
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          We sent a verification code to{" "}
                          <strong>{emailVerification.email}</strong>
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="otpCode">Verification Code</Label>
                        <Input
                          id="otpCode"
                          type="text"
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={6}
                          className="text-center text-lg tracking-wider"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the 6-digit code sent to your email
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: User Details */}
                  {emailVerification.step === "create_user" && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          Email Verified Successfully
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Now let's create the customer account
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="newUserName">Customer Name *</Label>
                        <Input
                          id="newUserName"
                          type="text"
                          placeholder="John Doe"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          id="sendWelcomeEmail"
                          type="checkbox"
                          checked={sendWelcomeEmail}
                          onChange={(e) =>
                            setSendWelcomeEmail(e.target.checked)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="sendWelcomeEmail" className="text-sm">
                          Send welcome email with login credentials
                        </Label>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-xs text-blue-700">
                          <strong>Account Details:</strong>
                          <br />
                          Email: {emailVerification.email}
                          <br />A temporary password will be generated and{" "}
                          {sendWelcomeEmail
                            ? "sent via email"
                            : "displayed after creation"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  {emailVerification.step === "input" && (
                    <>
                      <Button
                        onClick={sendOTP}
                        disabled={isSubmitting || !emailVerification.email}
                        className="w-full sm:w-auto sm:ml-3"
                      >
                        {isSubmitting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          "Send Verification Code"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeCreateUserModal}
                        disabled={isSubmitting}
                        className="mt-3 w-full sm:mt-0 sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {emailVerification.step === "verify" && (
                    <>
                      <Button
                        onClick={verifyOTP}
                        disabled={
                          isSubmitting || !otpCode || otpCode.length !== 6
                        }
                        className="w-full sm:w-auto sm:ml-3"
                      >
                        {isSubmitting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          "Verify Code"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setEmailVerification((prev) => ({
                            ...prev,
                            step: "input",
                          }))
                        }
                        disabled={isSubmitting}
                        className="mt-3 w-full sm:mt-0 sm:w-auto"
                      >
                        Back
                      </Button>
                    </>
                  )}

                  {emailVerification.step === "create_user" && (
                    <>
                      <Button
                        onClick={createUserAccount}
                        disabled={isSubmitting || !newUserName.trim()}
                        className="w-full sm:w-auto sm:ml-3"
                      >
                        {isSubmitting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          "Create Customer Account"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeCreateUserModal}
                        disabled={isSubmitting}
                        className="mt-3 w-full sm:mt-0 sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
