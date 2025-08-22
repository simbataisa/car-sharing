import { Navbar } from "@/components/Navbar";
import { CarCard } from "@/components/CarCard";
import { cars } from "@/lib/data";

export default function CarsPage() {
  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-8">All Cars</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </main>
    </div>
  );
}
