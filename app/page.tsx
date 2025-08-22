import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/CarCard";
import { cars } from "@/lib/data";

export default function Home() {
  const featuredCars = cars.slice(0, 3);

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4">
        <section className="text-center my-16">
          <h1 className="text-5xl font-bold">Find Your Perfect Rental Car</h1>
          <p className="text-xl text-muted-foreground mt-4">Book your next ride from our wide selection of premium cars.</p>
          <Link href="/cars">
            <Button size="lg" className="mt-8">Browse Cars</Button>
          </Link>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-8">Featured Cars</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}