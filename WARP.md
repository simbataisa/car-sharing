# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **car-sharing application** built with **Next.js 15**, **React 19**, and **TypeScript**. The app uses the modern App Router pattern and features a clean, component-based architecture with Tailwind CSS for styling and shadcn/ui for UI components.

## Tech Stack

- **Framework**: Next.js 15.4.6 with Turbopack for development
- **Runtime**: React 19.1.0 with TypeScript 5
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React

## Development Commands

### Core Development
```bash
# Start development server with Turbopack (fastest)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint the codebase
npm run lint
```

### Package Management
```bash
# Install dependencies
npm install

# Install a new dependency
npm install <package-name>

# Install a dev dependency
npm install -D <package-name>
```

## Architecture

### Directory Structure
- **`app/`**: Next.js App Router pages and layouts
  - Uses file-based routing (page.tsx files)
  - Shared `layout.tsx` with Geist fonts and global styles
  - Route-specific pages: `/`, `/cars`, `/login`, `/signup`
- **`components/`**: Reusable React components
  - `ui/`: shadcn/ui components (button, card, input, label)
  - Feature components: `CarCard`, `Navbar`
- **`lib/`**: Shared utilities and data
  - `data.ts`: Mock car data with TypeScript interfaces
  - `utils.ts`: Tailwind utility functions (cn helper)
- **`public/`**: Static assets (SVG icons)

### Key Patterns

1. **Path Aliases**: Uses `@/*` for clean imports from project root
2. **Component Structure**: Functional components with TypeScript interfaces
3. **Styling**: Tailwind classes with `cn()` utility for conditional styles
4. **Data Layer**: Static mock data in `lib/data.ts` with proper TypeScript types
5. **UI Components**: shadcn/ui components in `components/ui/` with consistent API

### Current Features
- **Homepage**: Landing page with featured cars grid
- **Car Listing**: `/cars` page showing all available cars
- **Authentication Pages**: `/login` and `/signup` forms (UI only, no backend)
- **Car Cards**: Reusable component displaying car info with pricing

## Component Development

### Adding New UI Components
```bash
# shadcn/ui components can be added via their CLI
npx shadcn@latest add <component-name>
```

### Component Conventions
- Use functional components with TypeScript interfaces for props
- Components in `components/` directory should be PascalCase
- Export components as named exports
- Use the `cn()` utility from `lib/utils.ts` for conditional styling

## Key Files to Know

- **`app/layout.tsx`**: Root layout with fonts and global styles
- **`lib/data.ts`**: Contains `Car` interface and mock car data array
- **`components/ui/`**: shadcn/ui components with consistent styling
- **`tailwind.config.js`**: Tailwind configuration (if present, check for custom theme)
- **`tsconfig.json`**: TypeScript config with path aliases

## Development Notes

### Mock Data
The app currently uses static mock data in `lib/data.ts`. Each car has:
- Basic info (make, model, year)
- Pricing (pricePerDay)
- Location and description
- Placeholder image URLs

### Routing
- Uses Next.js App Router (not Pages Router)
- File-based routing with `page.tsx` files
- No dynamic routes currently implemented (cars use static IDs)

### Styling System
- Tailwind CSS v4 with custom configuration
- Uses Geist font family (sans and mono variants)
- shadcn/ui provides consistent component styling
- `cn()` utility function for merging class names
