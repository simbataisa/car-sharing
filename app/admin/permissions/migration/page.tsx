"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Key,
  Database,
  RefreshCw,
} from "lucide-react";

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  isActive: boolean;
  isSystem?: boolean;
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

interface MigrationStats {
  total: number;
  system: number;
  custom: number;
  active: number;
  inactive: number;
  assigned: number;
  unassigned: number;
}

export default function PermissionMigration() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [stats, setStats] = useState<MigrationStats>({
    total: 0,
    system: 0,
    custom: 0,
    active: 0,
    inactive: 0,
    assigned: 0,
    unassigned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/rbac/permissions");
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const data = await response.json();
      const perms = data.permissions || [];
      setPermissions(perms);

      // Calculate stats
      const newStats: MigrationStats = {
        total: perms.length,
        system: perms.filter((p: Permission) => p.isSystem).length,
        custom: perms.filter((p: Permission) => !p.isSystem).length,
        active: perms.filter((p: Permission) => p.isActive).length,
        inactive: perms.filter((p: Permission) => !p.isActive).length,
        assigned: perms.filter((p: Permission) => 
          p.rolePermissions.length > 0 || p.userPermissions.length > 0
        ).length,
        unassigned: perms.filter((p: Permission) => 
          p.rolePermissions.length === 0 && p.userPermissions.length === 0
        ).length,
      };
      setStats(newStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSystem = async (permissionId: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/admin/rbac/permissions/${permissionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isSystem: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to mark permission as system");
      }

      setSuccess("Permission marked as system successfully");
      fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permission");
    }
  };

  const handleBulkSystemMigration = async () => {
    try {
      setMigrating(true);
      setError(null);

      // Mark core system permissions as system
      const systemPermissionPatterns = [
        'admin:*',
        'system:*',
        'rbac:*',
        'user:manage',
        'role:manage',
        'permission:manage'
      ];

      const permissionsToUpdate = permissions.filter(p => 
        !p.isSystem && systemPermissionPatterns.some(pattern => {
          if (pattern.endsWith(':*')) {
            return p.name.startsWith(pattern.slice(0, -1));
          }
          return p.name === pattern;
        })
      );

      for (const permission of permissionsToUpdate) {
        await handleMarkAsSystem(permission.id);
      }

      setSuccess(`Successfully migrated ${permissionsToUpdate.length} permissions to system status`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform bulk migration");
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading migration data...</div>
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
            <h1 className="text-3xl font-bold tracking-tight">Permission Migration</h1>
            <p className="text-muted-foreground">
              Review and migrate existing permissions with system protection
            </p>
          </div>
          <Button onClick={fetchPermissions} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
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
            <a
              href="/admin/permissions"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
            >
              <Key className="h-4 w-4 inline mr-2" />
              Permissions
            </a>
            <div className="border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
              <Database className="h-4 w-4 inline mr-2" />
              Migration
            </div>
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

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Permissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      System Protected
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.system}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Key className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Custom Permissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.custom}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Unassigned
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.unassigned}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Bulk System Permission Migration</h3>
                <p className="text-sm text-gray-500">
                  Automatically mark core system permissions (admin:*, system:*, rbac:*, etc.) as system-protected
                </p>
              </div>
              <Button 
                onClick={handleBulkSystemMigration}
                disabled={migrating}
                className="flex items-center gap-2"
              >
                {migrating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {migrating ? "Migrating..." : "Migrate System Permissions"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Permissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{permission.displayName}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        permission.isSystem
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {permission.isSystem ? "System" : "Custom"}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        permission.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {permission.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-mono">{permission.name}</p>
                    <p className="text-sm text-gray-500">
                      Resource: {permission.resource} | Action: {permission.action}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span>Roles: {permission.rolePermissions.length}</span>
                      <span>Users: {permission.userPermissions.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!permission.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsSystem(permission.id)}
                        className="flex items-center gap-1"
                      >
                        <Shield className="h-3 w-3" />
                        Mark as System
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}