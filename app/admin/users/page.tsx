"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  emailVerified: boolean;
  emailVerificationStatus:
    | "VERIFIED"
    | "PENDING_EMAIL_VERIFICATION"
    | "VERIFICATION_FAILED";
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    bookings: number;
  };
}

interface UserFormData {
  email: string;
  name: string;
  password: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
}

interface CreateUserData {
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

interface EmailVerificationData {
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  step: "email" | "otp" | "complete";
  otp: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-clear alerts after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    name: "",
    password: "",
    role: "USER",
    isActive: true,
  });

  // Create user state
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: "",
    name: "",
    role: "USER",
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Email verification state
  const [emailVerificationData, setEmailVerificationData] =
    useState<EmailVerificationData>({
      email: "",
      name: "",
      role: "USER",
      step: "email",
      otp: "",
    });
  const [isOTPLoading, setIsOTPLoading] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Resend verification state
  const [isResendingVerification, setIsResendingVerification] = useState<
    string | null
  >(null); // Track which user ID is being processed

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { isActive: statusFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(data.error || "Failed to fetch users");
      }
    } catch (error) {
      setError("An error occurred while fetching users");
    } finally {
      setIsLoading(false);
    }
  };

  // Create user with OTP verification (final step)
  const handleCreateUser = async () => {
    if (emailVerificationData.step !== "complete") {
      setError("Please complete email verification first");
      return;
    }

    setIsCreatingUser(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users/create-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailVerificationData.email,
          name: emailVerificationData.name,
          role: emailVerificationData.role,
          sendWelcomeEmail: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(
          "User created successfully! Welcome email has been sent to the user's email address."
        );
        setShowCreateModal(false);
        resetEmailVerificationForm();
        fetchUsers();
      } else {
        setError(data.error || "Failed to create user");
      }
    } catch (error) {
      setError("An error occurred while creating user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const updateData: Partial<UserFormData> = { ...formData };
      if (!updateData.password) {
        const { password, ...dataWithoutPassword } = updateData;
        const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataWithoutPassword),
        });
        const data = await response.json();
        if (response.ok) {
          setSuccess("User updated successfully");
          setShowEditModal(false);
          resetForm();
          fetchUsers();
        } else {
          setError(data.error || "Failed to update user");
        }
      } else {
        const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        const data = await response.json();
        if (response.ok) {
          setSuccess("User updated successfully");
          setShowEditModal(false);
          resetForm();
          fetchUsers();
        } else {
          setError(data.error || "Failed to update user");
        }
      }
    } catch (error) {
      setError("An error occurred while updating user");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("User deactivated successfully");
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        setError(data.error || "Failed to delete user");
      }
    } catch (error) {
      setError("An error occurred while deleting user");
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "USER",
      isActive: true,
    });
    setSelectedUser(null);
  };

  const resetCreateUserForm = () => {
    setCreateUserData({
      email: "",
      name: "",
      role: "USER",
    });
  };

  const resetEmailVerificationForm = () => {
    setEmailVerificationData({
      email: "",
      name: "",
      role: "USER",
      step: "email",
      otp: "",
    });
  };

  // Email verification functions
  const handleSendOTP = async () => {
    if (!emailVerificationData.email || !emailVerificationData.name) {
      setError("Email and name are required");
      return;
    }

    setIsOTPLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailVerificationData.email,
          name: emailVerificationData.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailVerificationData({ ...emailVerificationData, step: "otp" });
        setSuccess("OTP sent successfully to the email address");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (error) {
      setError("An error occurred while sending OTP");
    } finally {
      setIsOTPLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!emailVerificationData.otp || emailVerificationData.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsVerifyingOTP(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailVerificationData.email,
          otp: emailVerificationData.otp,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailVerificationData({
          ...emailVerificationData,
          step: "complete",
        });
        setSuccess("Email verified successfully");
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (error) {
      setError("An error occurred while verifying OTP");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleResendVerification = async (user: User) => {
    if (user.emailVerificationStatus !== "PENDING_EMAIL_VERIFICATION") {
      setError("User email verification is not pending");
      return;
    }

    setIsResendingVerification(user.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/users/${user.id}/resend-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Verification email has been resent to ${user.email}`);
      } else {
        setError(data.error || "Failed to resend verification email");
      }
    } catch (error) {
      setError("An error occurred while resending verification email");
    } finally {
      setIsResendingVerification(null);
    }
  };

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("");
                    setStatusFilter("");
                    setCurrentPage(1);
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.isActive ? (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              user.emailVerificationStatus === "VERIFIED"
                                ? "bg-green-100 text-green-800"
                                : user.emailVerificationStatus ===
                                  "PENDING_EMAIL_VERIFICATION"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.emailVerificationStatus === "VERIFIED" && (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </>
                            )}
                            {user.emailVerificationStatus ===
                              "PENDING_EMAIL_VERIFICATION" && (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </>
                            )}
                            {user.emailVerificationStatus ===
                              "VERIFICATION_FAILED" && (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user._count.bookings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user.emailVerificationStatus ===
                              "PENDING_EMAIL_VERIFICATION" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendVerification(user)}
                                disabled={isResendingVerification === user.id}
                                className="text-blue-600 hover:text-blue-700"
                                title="Resend verification email"
                              >
                                {isResendingVerification === user.id ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                                ) : (
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 8l7.89 7.89a1 1 0 001.415 0L21 7M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteModal(user)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="rounded-r-none"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="rounded-l-none"
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Modal - OTP Verification Workflow */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New User
              </h3>

              {/* Progress indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span
                    className={
                      emailVerificationData.step === "email"
                        ? "text-blue-600 font-medium"
                        : ""
                    }
                  >
                    1. Email Details
                  </span>
                  <span
                    className={
                      emailVerificationData.step === "otp"
                        ? "text-blue-600 font-medium"
                        : ""
                    }
                  >
                    2. Verify OTP
                  </span>
                  <span
                    className={
                      emailVerificationData.step === "complete"
                        ? "text-blue-600 font-medium"
                        : ""
                    }
                  >
                    3. Create User
                  </span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width:
                        emailVerificationData.step === "email"
                          ? "33%"
                          : emailVerificationData.step === "otp"
                          ? "66%"
                          : "100%",
                    }}
                  />
                </div>
              </div>

              {/* Step 1: Email Input */}
              {emailVerificationData.step === "email" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="verify-email">Email Address</Label>
                    <Input
                      id="verify-email"
                      type="email"
                      value={emailVerificationData.email}
                      onChange={(e) =>
                        setEmailVerificationData({
                          ...emailVerificationData,
                          email: e.target.value,
                        })
                      }
                      placeholder="Enter user's email address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="verify-name">Full Name</Label>
                    <Input
                      id="verify-name"
                      value={emailVerificationData.name}
                      onChange={(e) =>
                        setEmailVerificationData({
                          ...emailVerificationData,
                          name: e.target.value,
                        })
                      }
                      placeholder="Enter user's full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="verify-role">Role</Label>
                    <select
                      id="verify-role"
                      value={emailVerificationData.role}
                      onChange={(e) =>
                        setEmailVerificationData({
                          ...emailVerificationData,
                          role: e.target.value as "USER" | "ADMIN",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-blue-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          We'll send a verification code to this email address
                          to confirm the user creation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {emailVerificationData.step === "otp" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      We've sent a verification code to{" "}
                      <strong>{emailVerificationData.email}</strong>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="otp-input">Verification Code</Label>
                    <Input
                      id="otp-input"
                      type="text"
                      maxLength={6}
                      value={emailVerificationData.otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ""); // Only digits
                        setEmailVerificationData({
                          ...emailVerificationData,
                          otp: value,
                        });
                      }}
                      placeholder="Enter 6-digit code"
                      className="text-center text-lg tracking-widest"
                      required
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          The verification code expires in 10 minutes. Check
                          your email and enter the 6-digit code.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Completion */}
              {emailVerificationData.step === "complete" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Email Verified!
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Ready to create user account for{" "}
                      <strong>{emailVerificationData.email}</strong>
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-green-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">
                          Click "Create User" to complete the account creation.
                          A welcome email with login credentials will be sent.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                {emailVerificationData.step === "email" && (
                  <>
                    <Button
                      onClick={handleSendOTP}
                      className="flex-1"
                      disabled={
                        isOTPLoading ||
                        !emailVerificationData.email ||
                        !emailVerificationData.name
                      }
                    >
                      {isOTPLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending Code...
                        </>
                      ) : (
                        "Send Verification Code"
                      )}
                    </Button>
                  </>
                )}

                {emailVerificationData.step === "otp" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setEmailVerificationData({
                          ...emailVerificationData,
                          step: "email",
                        })
                      }
                      className="flex-1"
                      disabled={isVerifyingOTP}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifyOTP}
                      className="flex-1"
                      disabled={
                        isVerifyingOTP || emailVerificationData.otp.length !== 6
                      }
                    >
                      {isVerifyingOTP ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Verifying...
                        </>
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                  </>
                )}

                {emailVerificationData.step === "complete" && (
                  <>
                    <Button
                      onClick={handleCreateUser}
                      className="flex-1"
                      disabled={isCreatingUser}
                    >
                      {isCreatingUser ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Creating User...
                        </>
                      ) : (
                        "Create User"
                      )}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetEmailVerificationForm();
                  }}
                  className="flex-1"
                  disabled={isOTPLoading || isVerifyingOTP || isCreatingUser}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit User
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter user name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-password">
                    Password (leave blank to keep current)
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <select
                    id="edit-role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "USER" | "ADMIN",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-active">Active</Label>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button onClick={handleUpdateUser} className="flex-1">
                  Update User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Deactivate User
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to deactivate{" "}
                <strong>{selectedUser.name}</strong>? This will prevent them
                from logging in, but their data will be preserved.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  className="flex-1"
                >
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1"
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
