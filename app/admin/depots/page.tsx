'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, Search, MapPin, Users, Car, TrendingUp, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Depot {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  capacity: number;
  isActive: boolean;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    cars: number;
  };
  occupancyRate: number;
}

interface DepotStats {
  total: number;
  active: number;
  totalCapacity: number;
  totalCars: number;
  averageOccupancy: number;
}

export default function DepotsPage() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [stats, setStats] = useState<DepotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepots = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/depots?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch depots');
      }

      const data = await response.json();
      setDepots(data.depots);
      setStats(data.statistics);
      setTotalPages(data.pagination.pages);
      setCurrentPage(data.pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepots(currentPage, searchTerm);
  }, [currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDepots(1, searchTerm);
  };

  const handleDeleteDepot = async (depotId: string) => {
    if (!confirm('Are you sure you want to delete this depot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/depots/${depotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete depot');
      }

      // Refresh the list
      fetchDepots(currentPage, searchTerm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete depot');
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && depots.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Depot Management</h1>
          <p className="text-gray-600 mt-2">Manage car depots and track capacity</p>
        </div>
        <Link href="/admin/depots/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Depot
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Depots</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCapacity}</div>
              <p className="text-xs text-muted-foreground">
                cars maximum
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cars Assigned</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCars}</div>
              <p className="text-xs text-muted-foreground">
                across all depots
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getOccupancyColor(stats.averageOccupancy)}`}>
                {stats.averageOccupancy.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                capacity utilization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Space</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCapacity - stats.totalCars}</div>
              <p className="text-xs text-muted-foreground">
                cars can be added
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Depots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search by name or location</Label>
              <Input
                id="search"
                placeholder="Enter depot name or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Depots List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {depots.map((depot) => (
          <Card key={depot.id} className={`${!depot.isActive ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {depot.name}
                    {!depot.isActive && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {depot.address}, {depot.city}, {depot.state}
                    </div>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/depots/${depot.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDepot(depot.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Capacity</p>
                  <p className="font-semibold">{depot.capacity} cars</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Cars</p>
                  <p className="font-semibold">{depot._count.cars} cars</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Occupancy Rate</p>
                  <p className={`font-semibold ${getOccupancyColor(depot.occupancyRate)}`}>
                    {depot.occupancyRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Manager</p>
                  <p className="font-semibold">
                    {depot.manager ? depot.manager.name : 'Unassigned'}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Link href={`/admin/depots/${depot.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
                <Link href={`/admin/transfers?depotId=${depot.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Transfers
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Empty State */}
      {depots.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No depots found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No depots match your search criteria.' : 'Get started by creating your first depot.'}
            </p>
            <Link href="/admin/depots/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Depot
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}