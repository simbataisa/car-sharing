
import { Navbar } from "@/components/Navbar";
import { cars } from "@/lib/data";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CarDetailPage({ params }: { params: { id: string } }) {
  const car = cars.find((c) => c.id === parseInt(params.id));

  if (!car) {
    return <div>Car not found</div>;
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
          <div>
            <div className="relative h-96 w-full">
              <Image src={car.imageUrl} alt={`${car.make} ${car.model}`} layout="fill" objectFit="cover" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold">{`${car.make} ${car.model}`}</h1>
            <p className="text-2xl font-semibold mt-2">${car.pricePerDay}/day</p>
            <p className="text-lg text-muted-foreground mt-4">{car.location}</p>
            <p className="mt-4">{car.description}</p>

            <div className="mt-8 border-t pt-8">
              <h2 className="text-2xl font-bold">Book Now</h2>
              <form className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" />
                </div>
                <Button type="submit" className="w-full">Request to Book</Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
