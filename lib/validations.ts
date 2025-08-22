import { z } from "zod";

// User Authentication Schemas
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be less than 100 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Booking Schemas
export const bookingSchema = z
  .object({
    carId: z.number().min(1, "Car selection is required"),
    startDate: z
      .string()
      .min(1, "Start date is required")
      .refine((date) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      }, "Start date cannot be in the past"),
    endDate: z.string().min(1, "End date is required"),
    totalPrice: z.number().min(0, "Invalid total price"),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate > startDate;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

// Search and Filter Schemas
export const searchSchema = z
  .object({
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    minPrice: z.number().min(0, "Minimum price cannot be negative").optional(),
    maxPrice: z.number().min(0, "Maximum price cannot be negative").optional(),
    make: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.maxPrice >= data.minPrice;
      }
      return true;
    },
    {
      message: "Maximum price must be greater than or equal to minimum price",
      path: ["maxPrice"],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        return endDate > startDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

// Car Management Schemas (for admin)
export const carSchema = z.object({
  make: z
    .string()
    .min(1, "Make is required")
    .max(50, "Make must be less than 50 characters"),
  model: z
    .string()
    .min(1, "Model is required")
    .max(50, "Model must be less than 50 characters"),
  year: z
    .number()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  pricePerDay: z
    .number()
    .min(0.01, "Price per day must be greater than 0")
    .max(10000, "Price per day cannot exceed $10,000"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(100, "Location must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  imageUrl: z
    .string()
    .min(1, "Image URL is required")
    .url("Invalid URL format"),
  available: z.boolean(),
  features: z
    .array(z.string())
    .min(1, "At least one feature is required")
    .max(10, "Maximum 10 features allowed"),
});

// User Management Schemas (for admin)
export const userUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters")
    .optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

// Contact/Support Schemas
export const contactSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(100, "Subject must be less than 100 characters"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(1000, "Message must be less than 1000 characters"),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type SearchFormData = z.infer<typeof searchSchema>;
export type CarFormData = z.infer<typeof carSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;

// Utility validation functions
export const validateEmail = (email: string): boolean => {
  const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
};

export const validatePassword = (password: string): boolean => {
  const passwordSchema = z.string().min(6);
  return passwordSchema.safeParse(password).success;
};

export const validateDateRange = (
  startDate: string,
  endDate: string
): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end > start;
};

export const validatePriceRange = (
  minPrice: number,
  maxPrice: number
): boolean => {
  return maxPrice >= minPrice && minPrice >= 0;
};
