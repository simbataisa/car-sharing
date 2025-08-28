'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Edit, Save, X, Car, Users, TrendingUp, MapPin, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Depot {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  capacity: number;
  managerId?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  manager?: User;
  _count: {
    cars: number;
  };
  occupancyRate: number;
  availableSpace: number;
}

interface FormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  capacity: number;
  managerId: string;
  phone: string;
  email: string;
}

export default function DepotDetailPage() {
  const router = useRouter();
  const params = useParams();
  const depotId = params.id as string;
  
  const [depot, setDepot] = useState<Depot | null>(null);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    capacity: 50,
    managerId: '',
    phone: '',
    email: '',
  });

  // Fetch depot details
  useEffect(() => {
    const fetchDepot = async () => {
      try {
        const response = await fetch(`/api/admin/depots/${depotId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch depot');
        }
        const depotData = await response.json();
        setDepot(depotData);
        
        // Initialize form data
        setFormData({
          name: depotData.name,
          address: depotData.address,
          city: depotData.city,
          state: depotData.state,
          zipCode: depotData.zipCode,
          country: depotData.country,
          capacity: depotData.capacity,
          managerId: depotData.managerId || '',
          phone: depotData.phone || '',
          email: depotData.email || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (depotId) {
      fetchDepot();
    }
  }, [depotId]);

  // Fetch available managers when editing
  useEffect(() => {
    const fetchManagers = async () => {
      if (!editing) return;
      
      try {
        const response = await fetch('/api/admin/rbac/users?role=admin&limit=100');
        if (response.ok) {
          const data = await response.json();
          setManagers(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch managers:', err);
      }
    };

    fetchManagers();
  }, [editing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/depots/${depotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          managerId: formData.managerId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update depot');
      }

      const updatedDepot = await response.json();
      setDepot(updatedDepot);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (depot) {
      setFormData({
        name: depot.name,
        address: depot.address,
        city: depot.city,
        state: depot.state,
        zipCode: depot.zipCode,
        country: depot.country,
        capacity: depot.capacity,
        managerId: depot.managerId || '',
        phone: depot.phone || '',
        email: depot.email || '',
      });
    }
    setEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error && !depot) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin/depots">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Depots
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!depot) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Depot Not Found</h1>
          <Link href="/admin/depots">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Depots
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/depots">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Depots
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{depot.name}</h1>
            <p className="text-gray-600 mt-2">
              {depot.address}, {depot.city}, {depot.state} {depot.zipCode}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cars Assigned</p>
                <p className="text-2xl font-bold text-gray-900">{depot._count.cars}</p>
              </div>
              <Car className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Capacity</p>
                <p className="text-2xl font-bold text-gray-900">{depot.capacity}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{depot.occupancyRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Space</p>
                <p className="text-2xl font-bold text-gray-900">{depot.availableSpace}</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              {editing ? 'Edit the depot details below' : 'View depot information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Depot Name</Label>
              {editing ? (
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Downtown Depot"
                />
              ) : (
                <p className="text-gray-900 font-medium">{depot.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="capacity">Capacity</Label>
              {editing ? (
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  placeholder="Maximum number of cars"
                />
              ) : (
                <p className="text-gray-900 font-medium">{depot.capacity} cars</p>
              )}
            </div>

            <div>
              <Label>Depot Manager</Label>
              {editing ? (
                <select
                  name="managerId"
                  value={formData.managerId}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a manager (optional)</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900 font-medium">
                  {depot.manager ? `${depot.manager.name} (${depot.manager.email})` : 'No manager assigned'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>
              {editing ? 'Update the depot location' : 'Depot address information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              {editing ? (
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                />
              ) : (
                <p className="text-gray-900 font-medium">{depot.address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                {editing ? (
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="New York"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{depot.city}</p>
                )}
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                {editing ? (
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="NY"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{depot.state}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                {editing ? (
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="10001"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{depot.zipCode}</p>
                )}
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                {editing ? (
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="MX">Mexico</option>
                  </select>
                ) : (
                  <p className="text-gray-900 font-medium">{depot.country}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              {editing ? 'Update contact details' : 'Depot contact information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              {editing ? (
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <p className="text-gray-900 font-medium">{depot.phone || 'Not provided'}</p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              {editing ? (
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="depot@company.com"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <p className="text-gray-900 font-medium">{depot.email || 'Not provided'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>
              System information about this depot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Created</Label>
              <p className="text-gray-900 font-medium">
                {new Date(depot.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div>
              <Label>Last Updated</Label>
              <p className="text-gray-900 font-medium">
                {new Date(depot.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div>
              <Label>Depot ID</Label>
              <p className="text-gray-900 font-medium font-mono text-sm">{depot.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}