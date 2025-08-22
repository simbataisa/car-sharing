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
