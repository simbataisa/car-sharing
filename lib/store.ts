import { create } from "zustand";

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

interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

interface SearchFilters {
  location: string;
  startDate: string;
  endDate: string;
  minPrice: number;
  maxPrice: number;
  make: string;
}

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Cars state
  cars: Car[];
  filteredCars: Car[];
  selectedCar: Car | null;
  searchFilters: SearchFilters;

  // UI state
  isSidebarOpen: boolean;
  theme: "light" | "dark";

  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCars: (cars: Car[]) => void;
  setFilteredCars: (cars: Car[]) => void;
  setSelectedCar: (car: Car | null) => void;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  filterCars: () => void;
  resetFilters: () => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark") => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  cars: [],
  filteredCars: [],
  selectedCar: null,
  searchFilters: {
    location: "",
    startDate: "",
    endDate: "",
    minPrice: 0,
    maxPrice: 1000,
    make: "",
  },
  isSidebarOpen: false,
  theme: "light" as const,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  // User actions
  setUser: (user: User | null) => set({ user }),
  setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),

  // Cars actions
  setCars: (cars: Car[]) => {
    set({ cars });
    get().filterCars();
  },
  setFilteredCars: (filteredCars: Car[]) => set({ filteredCars }),
  setSelectedCar: (selectedCar: Car | null) => set({ selectedCar }),
  setSearchFilters: (filters: Partial<SearchFilters>) => {
    const currentFilters = get().searchFilters;
    const newFilters = { ...currentFilters, ...filters };
    set({ searchFilters: newFilters });
    get().filterCars();
  },

  // Filter logic
  filterCars: () => {
    const { cars, searchFilters } = get();
    let filtered = [...cars];

    // Filter by location
    if (searchFilters.location) {
      filtered = filtered.filter((car) =>
        car.location
          .toLowerCase()
          .includes(searchFilters.location.toLowerCase())
      );
    }

    // Filter by make
    if (searchFilters.make) {
      filtered = filtered.filter((car) =>
        car.make.toLowerCase().includes(searchFilters.make.toLowerCase())
      );
    }

    // Filter by price range
    filtered = filtered.filter(
      (car) =>
        car.pricePerDay >= searchFilters.minPrice &&
        car.pricePerDay <= searchFilters.maxPrice
    );

    // Filter by availability
    filtered = filtered.filter((car) => car.available);

    set({ filteredCars: filtered });
  },

  resetFilters: () => {
    set({
      searchFilters: initialState.searchFilters,
      filteredCars: get().cars,
    });
  },

  // UI actions
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setTheme: (theme: "light" | "dark") => set({ theme }),

  // Reset all state
  reset: () => set(initialState),
}));

// Selectors for common state combinations
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useAppStore();
  return { user, isAuthenticated, isLoading, error };
};

export const useCars = () => {
  const { cars, filteredCars, selectedCar, searchFilters } = useAppStore();
  return { cars, filteredCars, selectedCar, searchFilters };
};

export const useUI = () => {
  const { isSidebarOpen, theme } = useAppStore();
  return { isSidebarOpen, theme };
};

// Export types
export type { Car, User, SearchFilters, AppState };
