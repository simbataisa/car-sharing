
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car } from "@/lib/data";
import { MapPin, DollarSign } from "lucide-react";

interface CarCardProps {
  car: Car;
}

export function CarCard({ car }: CarCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
      <CardHeader className="p-0">
        <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
          <Image 
            src={car.imageUrl} 
            alt={`${car.make} ${car.model} ${car.year} available for rent`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
          {car.make} {car.model} {car.year}
        </CardTitle>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2" aria-label="Location">
            <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{car.location}</span>
          </div>
          
          <div className="flex items-center gap-2" aria-label="Price per day">
            <DollarSign className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold text-lg text-foreground">
              ${car.pricePerDay}
              <span className="text-sm font-normal text-muted-foreground">/day</span>
            </span>
          </div>
        </div>
        
        {car.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {car.description}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Link href={`/cars/${car.id}`} className="w-full" tabIndex={-1}>
          <Button 
            className="w-full"
            aria-label={`View details for ${car.make} ${car.model} ${car.year}`}
          >
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
