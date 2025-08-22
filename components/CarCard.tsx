
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car } from "@/lib/data";

interface CarCardProps {
  car: Car;
}

export function CarCard({ car }: CarCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="relative h-40 w-full">
          <Image src={car.imageUrl} alt={`${car.make} ${car.model}`} layout="fill" objectFit="cover" />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle>{`${car.make} ${car.model}`}</CardTitle>
        <p className="text-lg font-semibold">${car.pricePerDay}/day</p>
      </CardContent>
      <CardFooter>
        <Link href={`/cars/${car.id}`} className="w-full">
          <Button className="w-full">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
