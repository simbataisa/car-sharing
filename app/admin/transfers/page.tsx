'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, Search, Filter, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
}

interface Depot {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface CarTransfer {
  id: string;
  carId: string;
  fromDepotId: string;
  toDepotId: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  notes?: string;
  createdAt: string;
  car: Car;
  fromDepot: Depot;
  toDepot: Depot;
}

interface TransferStats {
  total: number;
  pending: number;
  inTransit: number;
  completed: number;
  cancelled: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons = {
  pending: Clock,
  in_transit: ArrowRight,
  completed: CheckCircle,
  cancelled: XCircle,
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<CarTransfer[]>([]);
  const [stats, setStats] = useState<TransferStats>({
    total: 0,
    pending: 0,
    inTransit: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Fetch transfers
  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/transfers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transfers');
      }

      const data = await response.json();
      setTransfers(data.transfers);
      setStats(data.stats);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [currentPage, searchTerm, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTransfers();
  };

  const handleStatusChange = async (transferId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/transfers/${transferId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transfer status');
      }

      // Refresh the transfers list
      fetchTransfers();
    } catch (error) {
      console.error('Error updating transfer status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Car Transfers</h1>
          <p className="text-gray-600 mt-2">Manage car movements between depots</p>
        </div>
        <Link href="/admin/transfers/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transfer
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transfers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <ArrowRight className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inTransit}</p>
              </div>
              <ArrowRight className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Transfers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by car, depot, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <Button type="submit" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
          <CardDescription>
            View and manage all car transfers between depots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transfers found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No car transfers have been created yet.'}
              </p>
              <Link href="/admin/transfers/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Transfer
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => {
                const StatusIcon = statusIcons[transfer.status];
                return (
                  <div
                    key={transfer.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-5 w-5" />
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              statusColors[transfer.status]
                            }`}
                          >
                            {transfer.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {transfer.car.year} {transfer.car.make} {transfer.car.model}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Transfer ID: {transfer.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {transfer.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(transfer.id, 'in_transit')}
                            >
                              Start Transfer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(transfer.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {transfer.status === 'in_transit' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(transfer.id, 'completed')}
                          >
                            Mark Complete
                          </Button>
                        )}
                        <Link href={`/admin/transfers/${transfer.id}`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">From Depot</p>
                        <p className="font-medium">
                          {transfer.fromDepot.name}
                        </p>
                        <p className="text-gray-500">
                          {transfer.fromDepot.city}, {transfer.fromDepot.state}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-gray-600">To Depot</p>
                        <p className="font-medium">
                          {transfer.toDepot.name}
                        </p>
                        <p className="text-gray-500">
                          {transfer.toDepot.city}, {transfer.toDepot.state}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-gray-600">Scheduled Date</p>
                        <p className="font-medium">
                          {formatDate(transfer.scheduledDate)}
                        </p>
                        {transfer.completedDate && (
                          <>
                            <p className="text-gray-600 mt-1">Completed</p>
                            <p className="text-green-600 font-medium">
                              {formatDate(transfer.completedDate)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {transfer.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <strong>Notes:</strong> {transfer.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}