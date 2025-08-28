'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Edit, Save, X, Car, MapPin, Clock, CheckCircle, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';
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
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
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
  updatedAt: string;
  car: Car;
  fromDepot: Depot;
  toDepot: Depot;
}

interface FormData {
  status: string;
  scheduledDate: string;
  notes: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons = {
  pending: Clock,
  in_transit: ArrowRight,
  completed: CheckCircle,
  cancelled: XCircle,
};

export default function TransferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const transferId = params.id as string;
  
  const [transfer, setTransfer] = useState<CarTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    status: '',
    scheduledDate: '',
    notes: '',
  });

  // Fetch transfer details
  useEffect(() => {
    const fetchTransfer = async () => {
      try {
        const response = await fetch(`/api/admin/transfers/${transferId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transfer');
        }
        const transferData = await response.json();
        setTransfer(transferData);
        
        // Initialize form data
        setFormData({
          status: transferData.status,
          scheduledDate: transferData.scheduledDate.slice(0, 16), // Format for datetime-local
          notes: transferData.notes || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (transferId) {
      fetchTransfer();
    }
  }, [transferId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/transfers/${transferId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: formData.status,
          scheduledDate: formData.scheduledDate,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update transfer');
      }

      const updatedTransfer = await response.json();
      setTransfer(updatedTransfer);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (transfer) {
      setFormData({
        status: transfer.status,
        scheduledDate: transfer.scheduledDate.slice(0, 16),
        notes: transfer.notes || '',
      });
    }
    setEditing(false);
    setError(null);
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/transfers/${transferId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update transfer status');
      }

      const updatedTransfer = await response.json();
      setTransfer(updatedTransfer);
      setFormData(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (error && !transfer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin/transfers">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transfers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Transfer Not Found</h1>
          <Link href="/admin/transfers">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transfers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[transfer.status];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/transfers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transfers
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Transfer #{transfer.id.slice(0, 8)}
            </h1>
            <p className="text-gray-600 mt-2">
              {transfer.car.year} {transfer.car.make} {transfer.car.model}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${statusColors[transfer.status]}`}>
            <StatusIcon className="h-5 w-5" />
            <span className="font-medium">
              {transfer.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {!editing && (
        <div className="flex gap-2 mb-8">
          {transfer.status === 'pending' && (
            <>
              <Button
                onClick={() => handleStatusChange('in_transit')}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <LoadingSpinner size="sm" /> : <ArrowRight className="h-4 w-4" />}
                Start Transfer
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange('cancelled')}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <LoadingSpinner size="sm" /> : <XCircle className="h-4 w-4" />}
                Cancel Transfer
              </Button>
            </>
          )}
          {transfer.status === 'in_transit' && (
            <Button
              onClick={() => handleStatusChange('completed')}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? <LoadingSpinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
              Mark Complete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            disabled={saving}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </Button>
        </div>
      )}

      {editing && (
        <div className="flex gap-2 mb-8">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer Route */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Route</CardTitle>
            <CardDescription>
              Car movement between depots
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* From Depot */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">From Depot</h4>
                <p className="text-lg font-medium">{transfer.fromDepot.name}</p>
                <p className="text-gray-600">
                  {transfer.fromDepot.address}
                </p>
                <p className="text-gray-600">
                  {transfer.fromDepot.city}, {transfer.fromDepot.state} {transfer.fromDepot.zipCode}
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-8 w-8 text-gray-400" />
            </div>

            {/* To Depot */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">To Depot</h4>
                <p className="text-lg font-medium">{transfer.toDepot.name}</p>
                <p className="text-gray-600">
                  {transfer.toDepot.address}
                </p>
                <p className="text-gray-600">
                  {transfer.toDepot.city}, {transfer.toDepot.state} {transfer.toDepot.zipCode}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Car Information */}
        <Card>
          <CardHeader>
            <CardTitle>Car Information</CardTitle>
            <CardDescription>
              Details about the car being transferred
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Car className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {transfer.car.year} {transfer.car.make} {transfer.car.model}
                </h4>
                <p className="text-gray-600">Car ID: {transfer.car.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Details</CardTitle>
            <CardDescription>
              {editing ? 'Edit transfer information' : 'Transfer scheduling and status information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Status</Label>
              {editing ? (
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusColors[transfer.status]}`}>
                  <StatusIcon className="h-4 w-4" />
                  {transfer.status.replace('_', ' ').toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <Label>Scheduled Date</Label>
              {editing ? (
                <Input
                  name="scheduledDate"
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                />
              ) : (
                <p className="text-gray-900 font-medium">
                  {formatDate(transfer.scheduledDate)}
                </p>
              )}
            </div>

            {transfer.completedDate && (
              <div>
                <Label>Completed Date</Label>
                <p className="text-green-600 font-medium">
                  {formatDate(transfer.completedDate)}
                </p>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              {editing ? (
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add notes about this transfer..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900">
                  {transfer.notes || 'No notes provided'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>
              System information about this transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Transfer ID</Label>
              <p className="text-gray-900 font-mono text-sm">{transfer.id}</p>
            </div>

            <div>
              <Label>Created</Label>
              <p className="text-gray-900 font-medium">
                {formatDate(transfer.createdAt)}
              </p>
            </div>

            <div>
              <Label>Last Updated</Label>
              <p className="text-gray-900 font-medium">
                {formatDate(transfer.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}