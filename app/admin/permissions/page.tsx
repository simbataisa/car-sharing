"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Settings,
  Users,
  Eye,
  Key,
} from "lucide-react";

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions: Array<{
    role: {
      id: string;
      name: string;
      displayName: string;
    };
  }>;
  userPermissions: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface PermissionFormData {
  name: string;
  displayName: string;
  description: string;
  resource: string;
  action: string;
}

export default function PermissionsManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<PermissionFormData>({
    name: "",
    displayName: "",
    description: "",
    resource: "",
    action: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<PermissionFormData>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch permissions
  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/rbac/permissions");
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }
      const data = await response.json();
      // The API returns an object with permissions array, not a direct array
      setPermissions(data.permissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Get unique resources and actions for filtering
  const uniqueResources = Array.from(new Set(permissions.map(p => p.resource))).sort();
  const uniqueActions = Array.from(new Set(permissions.map(p => p.action))).sort();

  // Filter permissions
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResource = !selectedResource || permission.resource === selectedResource;
    const matchesAction = !selectedAction || permission.action === selectedAction;
    return matchesSearch && matchesResource && matchesAction;
  });

  // Validate form
  const validateForm = (data: PermissionFormData): Partial<PermissionFormData> => {
    const errors: Partial<PermissionFormData> = {};
    
    if (!data.name.trim()) {
      errors.name = "Permission name is required";
    } else if (!/^[a-z_]+:[a-z_]+$/.test(data.name)) {
      errors.name = "Permission name must follow format 'resource:action'";
    }
    
    if (!data.displayName.trim()) {
      errors.displayName = "Display name is required";
    }
    
    if (!data.resource.trim()) {
      errors.resource = "Resource is required";
    }
    
    if (!data.action.trim()) {
      errors.action = "Action is required";
    }
    
    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const url = selectedPermission 
        ? `/api/admin/rbac/permissions/${selectedPermission.id}`
        : "/api/admin/rbac/permissions";
      
      const method = selectedPermission ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedPermission ? formData : formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save permission");
      }
      
      setSuccess(selectedPermission ? "Permission updated successfully" : "Permission created successfully");
      setShowCreateModal(false);
      setShowEditModal(false);
      resetForm();
      fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permission");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedPermission) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/rbac/permissions/${selectedPermission.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete permission");
      }
      
      setSuccess("Permission deleted successfully");
      setShowDeleteModal(false);
      setSelectedPermission(null);
      fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete permission");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      resource: "",
      action: "",
    });
    setFormErrors({});
    setSelectedPermission(null);
  };

  // Open modals
  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormData({
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description || "",
      resource: permission.resource,
      action: permission.action,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDeleteModal = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowDeleteModal(true);
  };

  const openViewModal = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowViewModal(true);
  };

  // Auto-generate permission name when resource and action change
  const handleResourceActionChange = (field: 'resource' | 'action', value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    // Auto-generate name if both resource and action are present
    if (newFormData.resource && newFormData.action) {
      newFormData.name = `${newFormData.resource}:${newFormData.action}`;
    }
    
    setFormData(newFormData);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading permissions...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permissions Management</h1>
            <p className="text-muted-foreground">
              Manage system permissions and their assignments
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Permission
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <a
              href="/admin/roles"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Roles
            </a>
            <div className="border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
              <Key className="h-4 w-4 inline mr-2" />
              Permissions
            </div>
            <a
              href="/admin/permissions/migration"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Migration
            </a>
          </nav>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="resource-filter">Resource</Label>
                <select
                  id="resource-filter"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  value={selectedResource}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedResource(e.target.value)}
                >
                  <option value="">All Resources</option>
                  {uniqueResources.map(resource => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="action-filter">Action</Label>
                <select
                  id="action-filter"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  value={selectedAction}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedAction(e.target.value)}
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions ({filteredPermissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Display Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Resource</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Action</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Roles</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Users</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((permission) => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                        {permission.name}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        {permission.displayName}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {permission.resource}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {permission.action}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {permission.rolePermissions.length}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {permission.userPermissions.length}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {permission.isActive ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(permission)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(permission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(permission)}
                            disabled={permission.rolePermissions.length > 0 || permission.userPermissions.length > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredPermissions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No permissions found matching your criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Permission Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Create New Permission</h2>
                <p className="text-sm text-gray-600">Create a new permission for the system.</p>
              </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resource">Resource</Label>
                  <Input
                    id="resource"
                    value={formData.resource}
                    onChange={(e) => handleResourceActionChange('resource', e.target.value)}
                    placeholder="e.g., users, cars"
                  />
                  {formErrors.resource && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.resource}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Input
                    id="action"
                    value={formData.action}
                    onChange={(e) => handleResourceActionChange('action', e.target.value)}
                    placeholder="e.g., read, write"
                  />
                  {formErrors.action && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.action}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="name">Permission Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="resource:action"
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Human-readable name"
                />
                {formErrors.displayName && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.displayName}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this permission allows"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Permission"}
                </Button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Edit Permission Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Edit Permission</h2>
                <p className="text-sm text-gray-600">Update the permission details.</p>
              </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-resource">Resource</Label>
                  <Input
                    id="edit-resource"
                    value={formData.resource}
                    onChange={(e) => handleResourceActionChange('resource', e.target.value)}
                    placeholder="e.g., users, cars"
                  />
                  {formErrors.resource && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.resource}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-action">Action</Label>
                  <Input
                    id="edit-action"
                    value={formData.action}
                    onChange={(e) => handleResourceActionChange('action', e.target.value)}
                    placeholder="e.g., read, write"
                  />
                  {formErrors.action && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.action}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-name">Permission Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="resource:action"
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Human-readable name"
                />
                {formErrors.displayName && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.displayName}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <textarea
                  id="edit-description"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this permission allows"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Updating..." : "Update Permission"}
                </Button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* View Permission Modal */}
        {showViewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Permission Details</h2>
                <p className="text-sm text-gray-600">View permission information and assignments.</p>
              </div>
            {selectedPermission && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p className="font-mono text-sm">{selectedPermission.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Display Name</Label>
                    <p>{selectedPermission.displayName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Resource</Label>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">{selectedPermission.resource}</span>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Action</Label>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">{selectedPermission.action}</span>
                  </div>
                </div>
                
                {selectedPermission.description && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm">{selectedPermission.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned Roles ({selectedPermission.rolePermissions.length})</Label>
                    <div className="space-y-1 mt-2">
                      {selectedPermission.rolePermissions.length > 0 ? (
                        selectedPermission.rolePermissions.map((rp) => (
                          <span key={rp.role.id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            {rp.role.displayName}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No roles assigned</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Direct User Assignments ({selectedPermission.userPermissions.length})</Label>
                    <div className="space-y-1 mt-2">
                      {selectedPermission.userPermissions.length > 0 ? (
                        selectedPermission.userPermissions.map((up) => (
                          <span key={up.user.id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 mr-1">
                            {up.user.name}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No direct user assignments</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p>{new Date(selectedPermission.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p>{new Date(selectedPermission.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </Button>
            </div>
            </div>
          </div>
        )}

        {/* Delete Permission Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Delete Permission</h2>
                <p className="text-sm text-gray-600">Are you sure you want to delete this permission? This action cannot be undone.</p>
              </div>
            {selectedPermission && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedPermission.displayName}</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedPermission.name}</p>
                </div>
                
                {(selectedPermission.rolePermissions.length > 0 || selectedPermission.userPermissions.length > 0) && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      This permission is assigned to {selectedPermission.rolePermissions.length} role(s) and {selectedPermission.userPermissions.length} user(s). 
                      It cannot be deleted until all assignments are removed.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting || Boolean(selectedPermission && (selectedPermission.rolePermissions.length > 0 || selectedPermission.userPermissions.length > 0))}
              >
                {submitting ? "Deleting..." : "Delete Permission"}
              </Button>
            </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}