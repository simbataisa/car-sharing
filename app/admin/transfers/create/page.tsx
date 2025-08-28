'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Save, Car, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  depot: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
}

interface Depot {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  capacity: number;
  _count: {
    cars: number;
  };
  availableSpace: number;
}

interface FormData {
  carId: string;
  toDepotId: string;
  scheduledDate: string;
  notes: string;
}

export default function CreateTransferPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [loadingDepots, setLoadingDepots] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [formData, setFormData] = useState<FormData>({
    carId: '',
    toDepotId: '',
    scheduledDate: '',
    notes: '',
  });

  // Fetch available cars
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const response = await fetch('/api/admin/cars?available=true&limit=100');
        if (response.ok) {
          const data = await response.json();
          setCars(data.cars || []);
        }
      } catch (err) {
        console.error('Failed to fetch cars:', err);
      } finally {
        setLoadingCars(false);
      }
    };

    fetchCars();
  }, []);

  // Fetch available depots
  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const response = await fetch('/api/admin/depots?limit=100');
        if (response.ok) {
          const data = await response.json();
          setDepots(data.depots || []);
        }
      } catch (err) {
        console.error('Failed to fetch depots:', err);
      } finally {
        setLoadingDepots(false);
      }
    };

    fetchDepots();
  }, []);

  // Update selected car when carId changes
  useEffect(() => {
    if (formData.carId) {
      const car = cars.find(c => c.id === formData.carId);
      setSelectedCar(car || null);
    } else {
      setSelectedCar(null);
    }
  }, [formData.carId, cars]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create transfer');
      }

      const transfer = await response.json();
      router.push(`/admin/transfers/${transfer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get available depots (exclude the car's current depot)
  const availableDepots = selectedCar
    ? depots.filter(depot => depot.id !== selectedCar.depot.id && depot.availableSpace > 0)
    : depots.filter(depot => depot.availableSpace > 0);

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/transfers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transfers
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Car Transfer</h1>
          <p className="text-gray-600 mt-2">Move a car from one depot to another</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>
            Select a car and destination depot to create a new transfer request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Car Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Car Selection</h3>
              
              <div>
                <Label htmlFor="carId">Select Car *</Label>
                {loadingCars ? (
                  <div className="flex items-center gap-2 p-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-600">Loading cars...</span>
                  </div>
                ) : (
                  <select
                    id="carId"
                    name="carId"
                    value={formData.carId}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a car to transfer</option>
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.year} {car.make} {car.model} - Currently at {car.depot.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Current Location Display */}
              {selectedCar && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Selected Car</h4>
                  </div>
                  <p className="text-blue-800">
                    {selectedCar.year} {selectedCar.make} {selectedCar.model}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700">
                      Currently at: {selectedCar.depot.name} ({selectedCar.depot.city}, {selectedCar.depot.state})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Destination Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Destination</h3>
              
              <div>
                <Label htmlFor="toDepotId">Destination Depot *</Label>
                {loadingDepots ? (
                  <div className="flex items-center gap-2 p-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-600">Loading depots...</span>
                  </div>
                ) : (
                  <select
                    id="toDepotId"
                    name="toDepotId"
                    value={formData.toDepotId}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!selectedCar}
                  >
                    <option value="">
                      {!selectedCar ? 'Select a car first' : 'Select destination depot'}
                    </option>
                    {availableDepots.map((depot) => (
                      <option key={depot.id} value={depot.id}>
                        {depot.name} - {depot.city}, {depot.state} (Available: {depot.availableSpace}/{depot.capacity})
                      </option>
                    ))}
                  </select>
                )}
                {selectedCar && availableDepots.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No available depots with capacity for this transfer.
                  </p>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Schedule</h3>
              
              <div>
                <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                <Input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  min={today + 'T00:00'}
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Select when this transfer should be executed.
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any special instructions or notes for this transfer..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            {/* Transfer Summary */}
            {selectedCar && formData.toDepotId && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-semibold text-green-900 mb-2">Transfer Summary</h4>
                <div className="text-green-800 space-y-1">
                  <p>
                    <strong>Car:</strong> {selectedCar.year} {selectedCar.make} {selectedCar.model}
                  </p>
                  <p>
                    <strong>From:</strong> {selectedCar.depot.name} ({selectedCar.depot.city}, {selectedCar.depot.state})
                  </p>
                  <p>
                    <strong>To:</strong> {depots.find(d => d.id === formData.toDepotId)?.name} 
                    ({depots.find(d => d.id === formData.toDepotId)?.city}, {depots.find(d => d.id === formData.toDepotId)?.state})
                  </p>
                  {formData.scheduledDate && (
                    <p>
                      <strong>Scheduled:</strong> {new Date(formData.scheduledDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={loading || !selectedCar || !formData.toDepotId || !formData.scheduledDate}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {loading ? 'Creating...' : 'Create Transfer'}
              </Button>
              <Link href="/admin/transfers">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}