export interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  location: string;
  description: string;
  imageUrl: string;
}

export const cars: Car[] = [
  {
    id: 1,
    make: "Toyota",
    model: "Camry",
    year: 2022,
    pricePerDay: 50,
    location: "San Francisco, CA",
    description: "A reliable and fuel-efficient sedan.",
    imageUrl: "/placeholder.svg",
  },
  {
    id: 2,
    make: "Honda",
    model: "CR-V",
    year: 2023,
    pricePerDay: 70,
    location: "Los Angeles, CA",
    description: "A spacious and versatile SUV.",
    imageUrl: "/placeholder.svg",
  },
  {
    id: 3,
    make: "Tesla",
    model: "Model 3",
    year: 2023,
    pricePerDay: 120,
    location: "San Francisco, CA",
    description: "A stylish and high-performance electric car.",
    imageUrl: "/placeholder.svg",
  },
  {
    id: 4,
    make: "Ford",
    model: "Mustang",
    year: 2022,
    pricePerDay: 100,
    location: "New York, NY",
    description: "An iconic American muscle car.",
    imageUrl: "/placeholder.svg",
  },
  {
    id: 5,
    make: "BMW",
    model: "X5",
    year: 2023,
    pricePerDay: 150,
    location: "Miami, FL",
    description: "A luxury SUV with impressive performance.",
    imageUrl: "/placeholder.svg",
  },
];

// Extended Car interface with features
export interface CarWithFeatures extends Car {
  features: string[];
}

// Function to get a car by ID
export async function getCar(id: number): Promise<Car | null> {
  const car = cars.find((c) => c.id === id);
  return car || null;
}

// Function to parse car features from a regular Car object
export function parseCarFeatures(car: Car): CarWithFeatures {
  // For now, we'll add some default features based on the car make/model
  // In a real app, this would parse actual features from the database
  const defaultFeatures: Record<string, string[]> = {
    Toyota: ["Fuel Efficient", "Reliable", "Safety Features"],
    Honda: ["Spacious Interior", "All-Wheel Drive", "Backup Camera"],
    Tesla: ["Electric Motor", "Autopilot", "Supercharging", "Zero Emissions"],
    Ford: ["Powerful Engine", "Sports Mode", "Premium Audio"],
    BMW: ["Luxury Interior", "Premium Sound System", "Advanced Safety"],
  };

  const features = defaultFeatures[car.make] || [
    "Comfortable Seating",
    "Air Conditioning",
  ];

  return {
    ...car,
    features,
  };
}
