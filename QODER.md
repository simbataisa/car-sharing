# Car Sharing Application - Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Directory Structure](#directory-structure)
5. [Features](#features)
6. [Components Documentation](#components-documentation)
7. [Data Models](#data-models)
8. [RBAC/ABAC System](#rbacabac-system)
9. [Admin Management System](#admin-management-system)
10. [Development Setup](#development-setup)
11. [Current Limitations](#current-limitations)
12. [Future Enhancements](#future-enhancements)
13. [Code Quality & Standards](#code-quality--standards)

## Project Overview

### Background

This is a comprehensive car-sharing/rental application built with Next.js 15, featuring a complete role-based access control (RBAC) and attribute-based access control (ABAC) system. The application provides users with a robust platform for browsing, booking, and managing rental cars, while offering administrators powerful tools for user management, system oversight, and access control.

### Core Problems Solved

- **Enterprise-Grade Car Rental Platform**: Comprehensive platform with full authentication, authorization, and management capabilities
- **Advanced Access Control**: Implements both RBAC and ABAC for fine-grained permission management
- **User Authentication System**: Complete authentication flow with NextAuth v5 including login, signup, and session management
- **Admin Dashboard**: Full administrative interface with user management, role assignment, and system oversight
- **Responsive Car Browsing**: Clean, mobile-friendly interface for car discovery and selection
- **Booking Management**: Integrated booking system with comprehensive API endpoints
- **Permission Management**: Granular permission system for resources (users, cars, bookings, admin)

### Target Users

- **End Users**: Individuals looking for short-term car rentals with secure account management
- **Managers**: Fleet managers with role-based access to specific resources and users
- **Administrators**: System administrators with comprehensive access to user and system management
- **Super Administrators**: System-level administrators with full access to all features and configurations

## System Architecture

### Overall Architecture

The application follows a **client-server architecture** using Next.js App Router with server-side rendering (SSR) and client-side interactivity.

### Key Architectural Decisions

- **Next.js App Router**: Leverages the new App Router for file-based routing and improved developer experience
- **Server-Side Rendering**: Implements SSR for better SEO and initial page load performance
- **Component-Based Design**: Modular UI components for reusability and maintainability
- **TypeScript Integration**: Full TypeScript support for type safety and better developer experience

### Design Patterns

- **Component-Based Architecture**: UI is modularized into reusable components
- **File-Based Routing**: Uses Next.js App Router for automatic route generation
- **Props-Down Pattern**: Data flows down through component hierarchy via props
- **Custom Hook Pattern**: Utility functions organized in the `lib/` directory

## Technology Stack

### Frontend Framework

- **Next.js**: 15.4.6 (Latest stable version with App Router)
- **React**: 19.1.0 (Latest version with concurrent features)
- **TypeScript**: ^5 (Strong typing and enhanced developer experience)

### Authentication, Database & Access Control

- **NextAuth.js**: ^5.0.0-beta.29 (Authentication framework with v5 features)
- **Prisma**: ^6.14.0 (Database ORM with type safety and advanced querying)
- **@auth/prisma-adapter**: ^2.10.0 (Prisma adapter for NextAuth)
- **bcryptjs**: ^2.4.6 (Password hashing for secure authentication)
- **@types/bcryptjs**: ^2.4.6 (TypeScript definitions)
- **jsonwebtoken**: ^9.0.2 (JWT token handling)
- **SQLite**: Database engine for development (with Prisma)

### Validation & Forms

- **Zod**: ^3.0.0 (Schema validation)
- **React Hook Form**: ^7.62.0 (Form state management)
- **@hookform/resolvers**: ^5.2.1 (Form validation resolvers)

### Styling & UI

- **Tailwind CSS**: ^4 (Utility-first CSS framework)
- **Radix UI**: Accessible, unstyled UI primitives
  - `@radix-ui/react-label`: ^2.1.7
  - `@radix-ui/react-slot`: ^1.2.3
- **Class Variance Authority**: ^0.7.1 (Component variant management)
- **Lucide React**: ^0.539.0 (Modern icon library)

### Development Tools

- **ESLint**: ^9 (Code linting and quality)
- **PostCSS**: Tailwind CSS processing
- **tw-animate-css**: ^1.3.7 (Animation utilities)

### State Management & Utilities

- **Zustand**: ^5.0.0 (Lightweight state management)
- **date-fns**: ^4.1.0 (Date manipulation utilities)
- **clsx**: ^2.1.1 (Conditional class name utility)
- **tailwind-merge**: ^3.3.1 (Tailwind class merging)

## Directory Structure

```
car-sharing-app/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin dashboard pages
│   │   ├── login/                # Admin login page
│   │   ├── users/                # User management interface
│   │   └── page.tsx              # Admin dashboard overview
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin API endpoints
│   │   │   ├── rbac/             # RBAC management APIs
│   │   │   │   ├── roles/        # Role management endpoints
│   │   │   │   └── users/        # User role assignment APIs
│   │   │   └── users/            # User management APIs
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── [...nextauth]/    # NextAuth configuration
│   │   │   ├── register/         # User registration API
│   │   │   └── user/             # User permission APIs
│   │   ├── bookings/             # Booking management APIs
│   │   └── cars/                 # Car data APIs
│   ├── cars/                     # Car-related pages
│   │   ├── [id]/                 # Dynamic car detail pages
│   │   │   └── page.tsx          # Individual car details
│   │   └── page.tsx              # Car listing page
│   ├── dashboard/                # User dashboard
│   │   └── page.tsx              # User booking history
│   ├── login/                    # Authentication
│   │   └── page.tsx              # Login form
│   ├── signup/                   # User registration
│   │   └── page.tsx              # Signup form
│   ├── globals.css               # Global styles and Tailwind config
│   ├── layout.tsx                # Root layout with fonts
│   └── page.tsx                  # Homepage with hero and featured cars
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI primitives
│   │   ├── button.tsx            # Button component with variants
│   │   ├── card.tsx              # Card component system
│   │   ├── input.tsx             # Form input component
│   │   ├── label.tsx             # Form label component
│   │   ├── alert.tsx             # Alert component
│   │   ├── error-boundary.tsx    # Error handling components
│   │   └── loading-spinner.tsx   # Loading state components
│   ├── AdminLayout.tsx           # Admin dashboard layout
│   ├── CarCard.tsx               # Car display card
│   ├── Navbar.tsx                # Navigation header
│   └── Providers.tsx             # Context providers wrapper
├── hooks/                        # React hooks
│   └── useAuthorization.tsx     # Authorization hooks and components
├── lib/                          # Utilities and configurations
│   ├── admin-auth.ts             # Admin authentication middleware
│   ├── auth.ts                   # NextAuth configuration
│   ├── data.ts                   # Mock car data and interfaces
│   ├── prisma.ts                 # Prisma client configuration
│   ├── rbac.ts                   # RBAC/ABAC authorization utilities
│   ├── store.ts                  # Zustand state management
│   ├── utils.ts                  # Utility functions
│   └── validations.ts            # Zod validation schemas
├── middleware.ts                 # Next.js middleware for route protection
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Comprehensive Prisma database schema
│   └── seed.ts                   # Database seeding with RBAC/ABAC data
├── .env.local                    # Environment variables
├── package.json                  # Dependencies and scripts
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.mjs            # PostCSS/Tailwind configuration
└── eslint.config.mjs             # ESLint configuration
```

## Features

### Current Features

#### 1. Enterprise Authentication & Authorization System

- **User Registration**: Full signup flow with form validation and password hashing
- **User Login**: Secure authentication with NextAuth v5 and JWT tokens
- **Session Management**: Persistent user sessions with automatic token refresh
- **Hybrid Role System**: Supports both legacy role fields and modern RBAC relationships
- **Password Security**: bcrypt hashing for secure password storage
- **Admin Authentication**: Separate admin login interface with role verification

#### 2. Comprehensive RBAC/ABAC System

- **Role-Based Access Control (RBAC)**:

  - 5 predefined roles: SUPER_ADMIN, ADMIN, MANAGER, MODERATOR, USER
  - Hierarchical permission structure with role inheritance
  - Dynamic role assignment and management
  - Role-based UI component rendering

- **Attribute-Based Access Control (ABAC)**:

  - Fine-grained policy rules with conditions
  - Resource-based access control (users, cars, bookings, admin)
  - Context-aware permissions (location, department, time-based)
  - Policy evaluation engine with priority handling

- **Granular Permissions**:

  - 16 core permissions across 4 resources
  - Action-based permissions: read, write, delete, admin
  - Resource-specific access control
  - Direct user permission overrides

- **Frontend Authorization**:
  - React hooks for permission checking (`useAuthorization`)
  - Conditional component rendering (`<Authorize>`)
  - Higher-order components for page-level protection
  - Real-time permission updates

#### 3. API Integration & Backend

- **RESTful API**: Complete set of API endpoints following REST conventions
- **Car Management**: GET endpoints for car listing and individual car details
- **User Management**: Admin APIs for CRUD operations on user accounts
- **Booking System**: API endpoints for creating and managing bookings
- **Authentication APIs**: Registration, login, and session management endpoints
- **Admin APIs**: Protected endpoints for administrative functions
- **RBAC Management APIs**: Role and permission management endpoints
- **User Permission APIs**: Endpoints for fetching user permissions for frontend authorization
- **Comprehensive Seeding**: Database seeding with full RBAC/ABAC setup

#### 4. Car Browsing System

- **Homepage**: Hero section with featured cars (displays first 3 cars)
- **Car Listing**: Complete car inventory page with grid layout
- **Car Details**: Individual car pages with detailed information and booking form
- **Responsive Design**: Mobile-first approach with responsive grid layouts

#### 5. Advanced Admin Dashboard & Management

- **Admin Authentication**: Separate admin login with hybrid role verification
- **User Management Interface**: Complete CRUD operations for user accounts
- **Car Management System**: Full car inventory management with enhanced modal dialogs
  - Add new cars with comprehensive form validation
  - Edit existing cars with improved modal interface
  - Delete cars with confirmation dialogs
  - Advanced filtering and search capabilities
  - Real-time statistics and analytics
  - Responsive table design with pagination
- **Role Management**: Dynamic role assignment and permission management
- **User Analytics**: Dashboard with user statistics and recent activity
- **Pagination & Filtering**: Advanced user list with search and filtering capabilities
- **Bulk Operations**: Admin tools for managing multiple users efficiently
- **Permission Management**: Granular permission assignment and revocation
- **ABAC Policy Management**: Policy rule creation and management interface
- **Enhanced Modal System**: Improved z-index layering, accessibility, and user experience
  - Proper ARIA attributes for screen readers
  - Keyboard navigation support (Escape key to close)
  - Click-outside-to-close functionality
  - Prevention of body scroll when modals are open
  - Error display within modals for better visibility

#### 6. User Interface Components

- **Navigation**: Clean navigation bar with logo and authentication links
- **Car Cards**: Reusable car display components with images, pricing, and details
- **Forms**: Login and signup forms with proper form controls
- **Buttons**: Variant-based button system (default, outline, ghost, etc.)
- **Authorization Components**: Conditional rendering based on user permissions

#### 7. Styling System

- **Design System**: Custom Tailwind theme with light/dark mode support
- **Component Variants**: Systematic approach to component styling variations
- **Typography**: Optimized font loading with Geist font family
- **Animations**: Integrated animation utilities

### Recent Improvements

#### Car Management Modal Enhancements (Latest)

- **Fixed Modal Display Issues**: Resolved z-index layering problems that prevented proper modal interaction
- **Enhanced Accessibility**: Added comprehensive ARIA attributes and keyboard navigation support
- **Improved User Experience**:
  - Added close button (X) in modal header
  - Click-outside-to-close functionality
  - Proper error display within modals
  - Prevention of body scroll when modals are open
  - Escape key support for closing modals
- **Better Visual Design**:
  - Increased z-index to `z-[60]` for proper layering above AdminLayout
  - Improved modal centering and responsive design
  - Enhanced background overlay with proper opacity
  - Better form validation and error feedback

#### Admin Car Management System

- **Comprehensive Car Inventory**: Full CRUD operations for car management
- **Advanced Filtering**: Filter cars by location, availability, make, and search terms
- **Real-time Statistics**: Dashboard showing total cars, available cars, locations, and average pricing
- **Enhanced Table Design**: Responsive table with car images, status indicators, and quick actions
- **Form Validation**: Complete Zod schema validation for car creation and updates
- **Features Management**: Dynamic feature addition/removal system for car listings
- **Booking Integration**: Car deletion validation checks for existing bookings

### Page Functionality

#### Homepage (`/`)

- Hero section with call-to-action
- Featured cars section
- Navigation to car browsing

#### Car Listing (`/cars`)

- Grid display of all available cars
- Car cards with basic information
- Links to individual car details

#### Car Details (`/cars/[id]`)

- Full car information display
- Image gallery area
- Booking form with date selection
- Pricing information

#### Authentication Pages

- **Login** (`/login`): Email/password login form with NextAuth integration
- **Signup** (`/signup`): User registration with validation and password hashing
- **Admin Login** (`/admin/login`): Separate admin authentication interface

#### Admin Dashboard (`/admin`)

- **Dashboard Overview**: Statistics and recent user activity
- **User Management** (`/admin/users`): Complete user CRUD interface
- **Car Management** (`/admin/cars`): Comprehensive car inventory management
  - Car listing with advanced filtering (location, availability, make)
  - Add new cars with detailed form including features management
  - Edit existing cars with improved modal interface
  - Delete cars with confirmation and booking validation
  - Real-time statistics (total cars, available cars, locations, average price)
  - Responsive table design with car images and status indicators
  - Search functionality across make, model, and location
  - Bulk operations and quick actions
- **User Details**: Individual user management with booking history
- **Role Management**: Admin promotion and user status control

#### User Dashboard (`/dashboard`)

- **Booking History**: User's past and upcoming reservations
- **Profile Management**: User account settings and information
- **Active Bookings**: Current reservation status and details

### API Endpoints

#### Authentication APIs

- `GET/POST /api/auth/[...nextauth]` - NextAuth session management
- `POST /api/auth/register` - User registration endpoint

#### Car Management APIs

- `GET /api/cars` - Fetch all cars with optional filtering (location, make, price range, availability)
- `GET /api/cars/[id]` - Fetch individual car details
- `POST /api/cars` - Create new car (Admin only) with comprehensive validation
- `PUT /api/cars/[id]` - Update existing car (Admin only)
- `DELETE /api/cars/[id]` - Delete car (Admin only) with booking validation

#### Booking APIs

- `GET /api/bookings` - Fetch user's bookings (authenticated)
- `POST /api/bookings` - Create new booking (authenticated)

#### Admin APIs

- `GET /api/admin/users` - Fetch all users with filtering and pagination (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `GET /api/admin/users/[id]` - Fetch user details (admin only)
- `PUT /api/admin/users/[id]` - Update user (admin only)
- `DELETE /api/admin/users/[id]` - Soft delete user (admin only)

#### RBAC/ABAC APIs

- `GET /api/auth/user/[id]/permissions` - Fetch user permissions for frontend authorization
- `GET /api/admin/rbac/roles` - Fetch all roles with permissions (admin only)
- `POST /api/admin/rbac/roles` - Create new role (admin only)
- `PUT /api/admin/rbac/roles/[id]` - Update role and permissions (admin only)
- `DELETE /api/admin/rbac/roles/[id]` - Delete role (admin only)
- `GET /api/admin/rbac/users/[id]/roles` - Fetch user roles (admin only)
- `POST /api/admin/rbac/users/[id]/roles` - Assign role to user (admin only)
- `DELETE /api/admin/rbac/users/[id]/roles/[roleId]` - Remove role from user (admin only)

## Components Documentation

### Core Components

#### `<AdminLayout />`

Admin dashboard layout component:

- Role-based access control with hybrid authentication
- Admin navigation sidebar with responsive design
- Session verification and automatic redirects
- Proper z-index management for modal compatibility
- Header with user information and sign-out functionality
- Mobile-responsive sidebar with overlay

#### `<Providers />`

Context provider wrapper:

- NextAuth SessionProvider integration
- Global state management setup
- Application-wide context distribution

#### Authorization Components (`/hooks/useAuthorization.tsx`)

##### `useAuthorization()` Hook

Comprehensive authorization hook:

- Real-time permission checking
- Role verification functions
- Resource-based access control
- Loading states and error handling

##### `<Authorize />` Component

Conditional rendering component:

- Permission-based content display
- Role-based access control
- Fallback content support
- Multiple authorization methods (permission, role, resource+action)

##### `withAuthorization()` HOC

Higher-order component for page-level protection:

- Component-level authorization
- Custom authorization logic support
- Fallback component rendering
- Loading state management

##### Utility Hooks

- `useIsAdmin()` - Admin role checking
- `useIsSuperAdmin()` - Super admin verification
- `useCanManageUsers()` - User management permissions
- `useCanManageCars()` - Car management permissions
- `useCanManageBookings()` - Booking management permissions

#### `<Navbar />`

Navigation component with:

- Brand logo linking to homepage
- Navigation links (Cars)
- Authentication buttons (Login)
- Responsive design

#### `<CarCard car={Car} />`

Reusable car display component:

- Car image display
- Make, model, and pricing information
- Link to detailed car page
- Consistent card styling

#### UI Components (`/components/ui/`)

##### `<Button />`

Flexible button component with variants:

- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default, sm, lg, icon
- **Features**: Accessible, customizable, icon support

##### `<Card />` System

Complete card component system:

- `<Card />` - Container
- `<CardHeader />` - Header section
- `<CardContent />` - Main content area
- `<CardFooter />` - Footer/actions area
- `<CardTitle />` - Title styling
- `<CardDescription />` - Description styling

##### Form Components

- `<Input />` - Styled form inputs
- `<Label />` - Accessible form labels

## Data Models

### User Interface

```typescript
interface User {
  id: string; // Unique identifier
  email: string; // User email address
  name: string; // User display name
  role: "USER" | "ADMIN"; // User role for access control
  isActive: boolean; // Account status
  password: string; // Hashed password
  lastLogin?: Date; // Last login timestamp
  createdAt: Date; // Account creation date
  updatedAt: Date; // Last update timestamp
}
```

### Booking Interface

```typescript
interface Booking {
  id: string; // Unique identifier
  userId: string; // User who made the booking
  carId: number; // Car being booked
  startDate: string; // Booking start date
  endDate: string; // Booking end date
  totalPrice: number; // Total booking cost
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  createdAt: string; // Booking creation timestamp
}
```

### Application State Interface

```typescript
interface AppState {
  // User authentication state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Cars and booking state
  cars: Car[];
  filteredCars: Car[];
  selectedCar: Car | null;
  searchFilters: SearchFilters;

  // UI state
  isSidebarOpen: boolean;
  theme: "light" | "dark";
}
```

### Car Interface

```typescript
interface Car {
  id: number; // Unique identifier
  make: string; // Car manufacturer (e.g., "Toyota")
  model: string; // Car model (e.g., "Camry")
  year: number; // Manufacturing year
  pricePerDay: number; // Daily rental price in USD
  location: string; // Pickup location
  description: string; // Car description
  imageUrl: string; // Image URL (currently placeholder)
}
```

### Sample Data

The application includes 5 sample cars:

- Toyota Camry 2022 ($50/day) - San Francisco
- Honda CR-V 2023 ($70/day) - Los Angeles
- Tesla Model 3 2023 ($120/day) - San Francisco
- Ford Mustang 2022 ($100/day) - New York
- BMW X5 2023 ($150/day) - Miami

## RBAC/ABAC System

### Overview

The application implements a comprehensive **Role-Based Access Control (RBAC)** and **Attribute-Based Access Control (ABAC)** system for fine-grained permission management. This hybrid approach provides both hierarchical role-based permissions and dynamic attribute-based policy evaluation.

### Database Schema

#### Core RBAC Tables

**Role Table**

- Stores system roles (SUPER_ADMIN, ADMIN, MANAGER, MODERATOR, USER)
- Supports custom role creation with display names and descriptions
- System roles are protected from deletion

**Permission Table**

- Granular permissions following `resource:action` pattern
- 16 core permissions across 4 resources
- Actions: read, write, delete, admin
- Resources: users, cars, bookings, admin

**UserRole Table**

- Many-to-many relationship between users and roles
- Supports role expiration and assignment tracking
- Cascade deletion for data integrity

**RolePermission Table**

- Links roles to their permissions
- Enables dynamic permission assignment to roles

**UserPermission Table**

- Direct user permissions that override role permissions
- Supports temporary permission grants

#### ABAC Extensions

**Resource Table**

- Defines resources for attribute-based policies
- Stores resource schemas and attributes
- Extensible for new resource types

**PolicyRule Table**

- ABAC policy rules with conditions and effects
- Priority-based rule evaluation
- JSON-based condition expressions
- ALLOW/DENY policy effects

### Permission System

#### Core Permissions

**User Management**

- `users:read` - View user profiles and basic information
- `users:write` - Create and update user accounts
- `users:delete` - Deactivate or delete user accounts
- `users:admin` - Full user management including role assignment

**Car Management**

- `cars:read` - Browse and view car listings
- `cars:write` - Add and update car listings
- `cars:delete` - Remove cars from inventory
- `cars:admin` - Full car inventory management

**Booking Management**

- `bookings:read` - View booking information
- `bookings:write` - Create and modify bookings
- `bookings:delete` - Cancel or delete bookings
- `bookings:admin` - Full booking system management

**Administrative Functions**

- `admin:access` - Access administrative dashboard
- `admin:settings` - Modify system configuration
- `admin:reports` - Access system reports and analytics
- `admin:audit` - View and manage audit logs

### Role Hierarchy

#### SUPER_ADMIN

- **Description**: Full system access with all permissions
- **Permissions**: All 16 permissions across all resources
- **Use Case**: System-level administrators
- **Default User**: admin@carshare.com

#### ADMIN

- **Description**: Administrative access with user and content management
- **Permissions**: User read/write, Car admin, Booking admin, Admin access/reports
- **Use Case**: Department administrators

#### MANAGER

- **Description**: Management access with booking and car oversight
- **Permissions**: User read, Car read/write, Booking admin, Admin access/reports
- **Use Case**: Fleet managers
- **Default User**: manager@carshare.com

#### MODERATOR

- **Description**: Content moderation and basic user management
- **Permissions**: User read, Car read/write, Booking read/write
- **Use Case**: Content moderators

#### USER

- **Description**: Standard user with booking capabilities
- **Permissions**: Car read, Booking read/write
- **Use Case**: End users
- **Default User**: user@carshare.com

### ABAC Policy Rules

#### 1. Own Bookings Only

- **Condition**: `user.id == resource.userId`
- **Effect**: ALLOW
- **Description**: Users can only access their own bookings
- **Priority**: 200

#### 2. Location-Based Car Access

- **Condition**: `user.location == null OR user.location == resource.location`
- **Effect**: ALLOW
- **Description**: Users can only book cars in their location (if location is set)
- **Priority**: 150

#### 3. Department User Access

- **Condition**: `user.department == resource.department AND user.role == 'MANAGER'`
- **Effect**: ALLOW
- **Description**: Managers can only manage users in their department
- **Priority**: 180

#### 4. Business Hours Booking

- **Condition**: `user.role == 'USER' AND (hour < 9 OR hour > 17)`
- **Effect**: DENY
- **Description**: Regular users can only create bookings during business hours
- **Priority**: 300

### Authorization Library (`/lib/rbac.ts`)

#### Core Functions

**getUserWithRoles(userId: string)**

- Fetches user with all roles and permissions
- Returns comprehensive user authorization data
- Includes direct permissions and role-based permissions

**hasPermission(user: UserWithRoles, permission: string)**

- Checks if user has specific permission
- Evaluates both role-based and direct permissions
- Returns boolean result

**hasResourcePermission(user: UserWithRoles, resource: string, action: string)**

- Resource-specific permission checking
- Constructs permission name from resource and action
- Supports hierarchical permission evaluation

**authorize(user: UserWithRoles, resource: string, action: string, context?: any)**

- Comprehensive authorization with RBAC + ABAC evaluation
- Evaluates policy rules with context
- Priority-based rule processing
- Returns authorization result with reason

### Frontend Integration

#### useAuthorization Hook

```typescript
const {
  user,
  permissions,
  loading,
  hasPermission,
  hasResourcePermission,
  hasRole,
  isAdmin,
  isSuperAdmin,
} = useAuthorization();
```

#### Conditional Rendering

```typescript
<Authorize permission="admin:access">
  <AdminDashboard />
</Authorize>

<Authorize resource="cars" action="write">
  <AddCarButton />
</Authorize>

<Authorize roles={["ADMIN", "MANAGER"]}>
  <ManagementPanel />
</Authorize>
```

#### Higher-Order Component Protection

```typescript
const ProtectedAdminPage = withAuthorization(
  AdminPage,
  (auth) => auth.hasPermission("admin:access"),
  UnauthorizedPage
);
```

### Database Seeding

The seed script (`/prisma/seed.ts`) provides comprehensive setup:

- **4 Resources** with attribute schemas
- **16 Permissions** across all resources
- **5 Roles** with hierarchical permissions
- **4 ABAC Policy Rules** for fine-grained control
- **Sample Users** with different roles for testing
- **5 Sample Cars** for testing

#### Default Accounts

```bash
# Super Admin
Email: admin@carshare.com
Password: admin123
Role: SUPER_ADMIN

# Manager
Email: manager@carshare.com
Password: manager123
Role: MANAGER

# Regular User
Email: user@carshare.com
Password: user123
Role: USER
```

### Commands

```bash
# Comprehensive database seeding
npm run db:seed
npx prisma db seed

# Reset database and reseed
npm run db:reset
```

## Admin Management System

### Overview

The admin management system provides comprehensive tools for managing the car-sharing platform, including user management, car inventory management, and system oversight. The system implements role-based access control and provides intuitive interfaces for administrative tasks.

### Car Management System

#### Features

**Car Inventory Management**

- Complete CRUD operations for car listings
- Advanced filtering and search capabilities
- Real-time statistics and analytics
- Bulk operations and quick actions
- Responsive design for all screen sizes

**Enhanced Modal System**

- Fixed z-index layering issues for proper display
- Comprehensive accessibility features
- Keyboard navigation support
- Click-outside-to-close functionality
- Error handling and validation feedback

**Filtering and Search**

- Search across make, model, and location
- Filter by location (dropdown with all available locations)
- Filter by availability status (all, available, unavailable)
- Real-time filtering with immediate results

**Statistics Dashboard**

- Total cars count
- Available cars count
- Number of unique locations
- Average price per day calculation

#### Car Form Validation

```typescript
const carSchema = z.object({
  make: z.string().min(1, "Make is required").max(50),
  model: z.string().min(1, "Model is required").max(50),
  year: z
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  pricePerDay: z.number().min(0.01).max(10000),
  location: z.string().min(1, "Location is required").max(100),
  description: z.string().min(1).max(500),
  imageUrl: z.string().url("Invalid URL format"),
  available: z.boolean(),
  features: z.array(z.string()).min(1).max(10),
});
```

#### Modal Improvements

**Z-Index Management**

- Car modals use `z-[60]` to appear above AdminLayout (`z-40` sidebar, `z-10` header)
- Proper layering ensures modals are always accessible
- Consistent z-index hierarchy across the application

**Accessibility Enhancements**

- ARIA attributes: `aria-labelledby`, `role="dialog"`, `aria-modal="true"`
- Keyboard navigation support (Escape key, Tab navigation)
- Screen reader compatibility with proper semantic markup
- Focus management and restoration

**User Experience Improvements**

- Click-outside-to-close functionality
- Prevention of body scroll when modals are open
- Visual close button (X) in modal header
- Better error display within modals
- Loading states during form submission

**Technical Implementation**

```typescript
// Enhanced modal with proper z-index and accessibility
<div
  className="fixed inset-0 z-[60] overflow-y-auto"
  aria-labelledby="modal-title"
  role="dialog"
  aria-modal="true"
>
  {/* Background overlay with click-to-close */}
  <div
    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
    onClick={closeModal}
  ></div>

  {/* Modal content with proper centering */}
  <div className="relative inline-block align-bottom bg-white rounded-lg...">
    {/* Enhanced form with validation and accessibility */}
  </div>
</div>
```

### User Management System

#### Features

- Complete user CRUD operations
- Role assignment and management
- User status control (active/inactive)
- Advanced filtering and pagination
- Bulk operations for efficient management

#### Access Control Integration

- RBAC-based permission checking
- Role-specific UI components
- Dynamic menu rendering based on permissions
- Secure API endpoints with authentication middleware

### Dashboard Analytics

#### Real-time Statistics

- User count and activity metrics
- Car inventory statistics
- Booking analytics and trends
- System health indicators

#### Recent Activity

- New user registrations
- Recent bookings
- System events and audit trail
- Administrative actions log

### Security Features

#### Authentication & Authorization

- Hybrid role system (legacy + RBAC)
- Session-based authentication with NextAuth
- Protected admin routes with middleware
- Role-based access control throughout the interface

#### Data Protection

- Input validation with Zod schemas
- SQL injection prevention with Prisma ORM
- XSS protection with proper escaping
- CSRF protection with NextAuth

### API Integration

#### Admin Endpoints

- User management APIs (`/api/admin/users/*`)
- Car management APIs (`/api/cars/*`)
- Role management APIs (`/api/admin/rbac/*`)
- Statistics and analytics APIs

#### Error Handling

- Comprehensive error responses
- User-friendly error messages
- Logging and monitoring integration
- Graceful degradation for failed operations

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun package manager
- Git for version control

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd car-sharing-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize database (if using Prisma)
npx prisma generate
npx prisma db push

# Comprehensive database seeding (includes RBAC/ABAC setup)
npm run db:seed
# or
npx prisma db seed

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-jwt-secret-key
NEXTAUTH_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=file:./dev.db
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with Turbopack

# Production
npm run build        # Build for production
npm start           # Start production server

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema to database
npm run db:seed      # Comprehensive database seeding (RBAC/ABAC)
npx prisma db seed   # Standard Prisma seeding
npm run db:reset     # Reset database and reseed
npx prisma studio    # Open Prisma Studio (database GUI)

# Code Quality
npm run lint        # Run ESLint
```

### Development Server

- **Local URL**: http://localhost:3000
- **Hot Reload**: Automatic page refresh on file changes
- **Turbopack**: Enhanced development experience with faster builds

## Current Limitations

### Recent Improvements Completed

- **Car Management Modal Issues**: ✅ **RESOLVED** - Fixed z-index layering problems that prevented proper modal interaction
- **Admin Car Management**: ✅ **IMPLEMENTED** - Complete car inventory management with enhanced modals
- **Modal Accessibility**: ✅ **ENHANCED** - Added comprehensive ARIA attributes and keyboard navigation
- **Form Validation**: ✅ **IMPROVED** - Enhanced Zod schema validation with better error handling

### Database Integration

- **Enhanced Car Management**: Car data now fully integrated with database through admin interface
- **API Consistency**: All car operations go through validated API endpoints
- **Modal System Fixed**: Resolved display issues that prevented proper car editing
- **Improved Validation**: Enhanced Zod schemas for comprehensive form validation

### User Interface Improvements

- **Modal Accessibility**: Fixed z-index layering and added comprehensive accessibility features
- **Admin Car Management**: Complete car CRUD interface with advanced filtering
- **Enhanced Error Handling**: Better error display and user feedback throughout admin interface
- **Responsive Design**: Improved mobile and tablet experience for admin functions

### Technical Debt Addressed

- **Modal Display Issues**: Resolved z-index conflicts preventing modal interaction
- **Form Validation**: Enhanced validation error handling with proper Zod integration
- **Accessibility**: Added ARIA attributes and keyboard navigation support
- **Code Organization**: Improved component structure and prop handling

### Advanced Functionality

- **Payment Integration**: No payment processing system implemented
- **Real-time Features**: No real-time updates or notifications
- **Advanced Search**: Limited filtering and search capabilities for cars
- **File Upload**: No image upload functionality for cars or user profiles
- **Audit Logging**: ABAC system ready but audit trail not fully implemented

### Remaining Technical Limitations

- **SQLite Usage**: Currently using SQLite for development (production would benefit from PostgreSQL/MySQL)
- **Booking Integration**: Car availability calendar needs real-time booking integration
- **Limited Testing**: No comprehensive test suite implemented
- **Performance Optimization**: No caching strategies or performance monitoring
- **ABAC Policy Editor**: No GUI for creating/editing ABAC policies (policies are database-defined)

### Content & Media

- **Placeholder Images**: All car images use `/placeholder.svg`
- **Static Content**: No content management system
- **Limited SEO**: Basic metadata implementation

## Future Enhancements

### Priority 1: Enhanced Functionality

- [x] Add authentication system (NextAuth.js) ✅
- [x] Implement comprehensive RBAC/ABAC system ✅
- [x] Add user session management ✅
- [x] Add API routes for CRUD operations ✅
- [x] Database seeding with complete access control ✅
- [x] Car management admin interface with modal system ✅
- [x] Fix modal display issues and enhance accessibility ✅
- [ ] Implement booking data persistence with car availability
- [ ] Add real-time car availability calendar
- [ ] Add database migrations for production deployment

### Priority 2: Advanced Access Control Features

- [x] Role-based access control ✅
- [x] Attribute-based access control ✅
- [x] Frontend authorization components ✅
- [x] Admin role management interface ✅
- [ ] ABAC policy editor GUI
- [ ] Advanced permission inheritance
- [ ] Time-based access control
- [ ] Resource ownership policies

### Priority 3: Core Functionality Enhancement

- [x] Real booking system with validation ✅
- [ ] Payment processing integration (Stripe)
- [ ] Car availability calendar with real-time updates
- [ ] Advanced search and filtering with database queries
- [ ] Comprehensive user dashboard with booking history
- [ ] Email notifications for bookings and admin actions

### Priority 4: User Experience & Performance

- [ ] Comprehensive form validation and error handling
- [ ] Enhanced loading states and error boundaries
- [ ] Image upload and management system
- [ ] Improved accessibility features (ARIA labels, keyboard navigation)
- [ ] Performance optimization and caching strategies
- [ ] Progressive Web App (PWA) features

### Priority 5: Enterprise Features

- [ ] Audit logging and compliance reporting
- [ ] Multi-tenant support
- [ ] API rate limiting and security enhancements
- [ ] Advanced analytics and reporting dashboard
- [ ] Integration with external car management systems
- [ ] Mobile application development

## Code Quality & Standards

### Strengths

✅ **Modern Architecture**: Latest Next.js 15 and React 19 with App Router  
✅ **Type Safety**: Full TypeScript integration with strict typing throughout  
✅ **Enterprise Authentication**: Complete NextAuth v5 with hybrid role system  
✅ **Advanced Authorization**: Comprehensive RBAC/ABAC system with frontend integration  
✅ **API Integration**: RESTful API with proper error handling and validation  
✅ **Database Integration**: Prisma ORM with comprehensive schema and seeding  
✅ **State Management**: Zustand for global state with TypeScript integration  
✅ **Form Validation**: Zod schemas with React Hook Form integration  
✅ **Component Architecture**: Well-structured, reusable component library  
✅ **Responsive Design**: Mobile-first approach with Tailwind CSS  
✅ **Permission System**: 16 granular permissions across 4 resources  
✅ **Policy Engine**: ABAC policy rules with priority-based evaluation  
✅ **Clean Code**: Consistent naming conventions and organization  
✅ **Modern Tooling**: ESLint, PostCSS, and latest development tools  
✅ **Documentation**: Comprehensive technical documentation  
✅ **Admin Car Management**: Complete car inventory management with enhanced modals  
✅ **Modal Accessibility**: Fixed z-index issues and added comprehensive accessibility features  
✅ **Enhanced UX**: Improved error handling, keyboard navigation, and user feedback

### Areas for Improvement

🔧 **Testing Suite**: Add comprehensive unit and integration tests  
🔧 **Payment Integration**: Add Stripe or similar payment processing  
🔧 **Performance Monitoring**: Add performance tracking and optimization  
🔧 **ABAC GUI**: Create policy editor interface for non-technical users  
🔧 **Audit System**: Implement comprehensive audit logging  
🔧 **Production Database**: Migrate from SQLite to PostgreSQL/MySQL  
🔧 **Real-time Features**: Add WebSocket support for live updates  
🔧 **Advanced Search**: Implement full-text search with database queries  
🔧 **Booking Calendar**: Add real-time car availability calendar  
🔧 **Mobile App**: Develop native mobile applications

### Development Standards

- **File Naming**: PascalCase for components, camelCase for utilities
- **Import Organization**: External imports first, then internal imports with proper grouping
- **Component Structure**: TypeScript interfaces, main component, default export
- **Database Patterns**: Prisma schema with proper relationships and constraints
- **API Patterns**: RESTful endpoints with consistent error handling
- **Authorization Patterns**: Permission-based access control throughout
- **Styling**: Tailwind classes with component variants using CVA

### Security Standards

- **Authentication**: Secure password hashing with bcrypt
- **Authorization**: Granular permission system with frontend/backend validation
- **Session Management**: JWT tokens with secure configuration
- **API Security**: Protected endpoints with role verification
- **Database Security**: Prepared statements via Prisma ORM
- **Input Validation**: Zod schema validation on all inputs

---

## Getting Started

To begin development on this enterprise-ready car-sharing platform:

### Quick Start

1. **Setup**: Follow the [Development Setup](#development-setup) section
2. **Seed Database**: Run `npm run db:seed` to create the complete RBAC/ABAC system
3. **Test Admin Access**: Login with `admin@carshare.com` / `admin123`
4. **Explore Authorization**: Review the [RBAC/ABAC System](#rbacabac-system) documentation
5. **Understand Structure**: Familiarize yourself with the [Directory Structure](#directory-structure)

### Default Test Accounts

```bash
# Super Administrator
Email: admin@carshare.com
Password: admin123
Access: Full system administration

# Fleet Manager
Email: manager@carshare.com
Password: manager123
Access: Car and booking management

# Regular User
Email: user@carshare.com
Password: user123
Access: Car browsing and booking
```

### Key Features to Explore

- **Admin Dashboard**: `/admin` - Comprehensive user and system management
- **Car Management**: `/admin/cars` - Complete car inventory management with enhanced modals
- **Authorization System**: Test different user roles and permissions
- **API Endpoints**: Explore RESTful APIs with role-based access control
- **Frontend Components**: Conditional rendering based on user permissions
- **Database Schema**: Review Prisma schema with RBAC/ABAC tables
- **Modal System**: Experience improved accessibility and user interaction

### Next Steps for Extension

1. **Choose Enhancements**: Select from the [Future Enhancements](#future-enhancements) list
2. **Review Components**: Study the [Components Documentation](#components-documentation)
3. **Understand Data Models**: Review the comprehensive [Data Models](#data-models)
4. **Extend Permissions**: Add new resources and permissions to the RBAC system
5. **Create ABAC Policies**: Implement new attribute-based access rules

This application provides a production-ready foundation for an enterprise car-sharing platform with:

✅ **Complete Authentication & Authorization** - NextAuth v5 with RBAC/ABAC  
✅ **Comprehensive Admin System** - Full user and car management with enhanced modals  
✅ **Modern Architecture** - Next.js 15, React 19, TypeScript, Prisma  
✅ **Security-First Design** - Granular permissions and policy-based access  
✅ **Scalable Foundation** - Extensible role and permission system  
✅ **Developer Experience** - Full TypeScript, modern tooling, comprehensive docs  
✅ **Enhanced Accessibility** - Fixed modal issues and improved user experience  
✅ **Robust Car Management** - Complete inventory system with advanced filtering

The implemented RBAC/ABAC system with 5 roles, 16 permissions, and 4 policy rules creates a robust foundation for extensive customization and enterprise-level access control requirements. Recent improvements to the car management system provide a seamless administrative experience with proper modal functionality and enhanced accessibility features.

---

## Recent Updates (Latest)

### Car Management System Enhancements

**Modal System Fixes** (Completed)

- ✅ Resolved z-index layering issues that prevented modal interaction
- ✅ Enhanced modal accessibility with comprehensive ARIA attributes
- ✅ Added keyboard navigation support (Escape key, Tab navigation)
- ✅ Implemented click-outside-to-close functionality
- ✅ Added prevention of body scroll when modals are open
- ✅ Improved error display within modals for better user feedback

**Admin Car Management** (Completed)

- ✅ Complete car inventory CRUD operations
- ✅ Advanced filtering by location, availability, and search terms
- ✅ Real-time statistics dashboard (total cars, available cars, locations, avg price)
- ✅ Enhanced form validation with comprehensive Zod schemas
- ✅ Dynamic features management system
- ✅ Responsive table design with car images and status indicators
- ✅ Booking validation for car deletion operations

**Technical Improvements** (Completed)

- ✅ Fixed Zod validation error handling (`error.issues` instead of `error.errors`)
- ✅ Enhanced API endpoints for car management with proper error responses
- ✅ Improved component organization and TypeScript typing
- ✅ Better state management for modal and form interactions

The application now provides a fully functional admin car management interface with industry-standard accessibility and user experience features. Recent improvements to the car management system provide a seamless administrative experience with proper modal functionality and enhanced accessibility features.
