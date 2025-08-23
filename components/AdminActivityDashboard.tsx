/**
 * Admin Activity Dashboard Component
 * Provides comprehensive view of user activities and system analytics
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RealTimeActivityMonitor from "@/components/RealTimeActivityMonitor";

// Define types locally since we can't import them directly from Prisma client
type LocalActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "PASSWORD_RESET"
  | "EMAIL_VERIFY"
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "BOOK"
  | "CANCEL_BOOKING"
  | "CONFIRM_BOOKING"
  | "COMPLETE_BOOKING"
  | "ADMIN_LOGIN"
  | "USER_PROMOTE"
  | "USER_DEMOTE"
  | "USER_ACTIVATE"
  | "USER_DEACTIVATE"
  | "ROLE_ASSIGN"
  | "ROLE_REMOVE"
  | "SEARCH"
  | "FILTER"
  | "EXPORT"
  | "IMPORT"
  | "BACKUP"
  | "SYSTEM_ERROR"
  | "CUSTOM";

type LocalActivitySeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

interface ActivityRecord {
  id: string;
  userId?: string;
  action: LocalActivityAction;
  resource: string;
  resourceId?: string;
  description?: string;
  severity: LocalActivitySeverity;
  timestamp: string;
  duration?: number;
  ipAddress?: string;
  userAgent?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ActivityAnalytics {
  totalActivities: number;
  activitiesByAction: Array<{
    action: LocalActivityAction;
    _count: { id: number };
  }>;
  activitiesByResource: Array<{ resource: string; _count: { id: number } }>;
  activitiesBySeverity: Array<{
    severity: LocalActivitySeverity;
    _count: { id: number };
  }>;
  recentActivities: ActivityRecord[];
}

interface ActivityFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  actions?: LocalActivityAction[];
  resources?: string[];
  severity?: LocalActivitySeverity[];
  searchTerm?: string;
}

export default function AdminActivityDashboard() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [analytics, setAnalytics] = useState<ActivityAnalytics | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityRecord | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [autoRefresh, setAutoRefresh] = useState(false);

  const pageSize = 50;

  // Fetch activities with filters
  const fetchActivities = useCallback(
    async (page = 0, reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          limit: pageSize.toString(),
          offset: (page * pageSize).toString(),
        });

        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.actions?.length)
          params.append("actions", filters.actions.join(","));
        if (filters.resources?.length)
          params.append("resources", filters.resources.join(","));
        if (filters.severity?.length)
          params.append("severity", filters.severity.join(","));

        const response = await fetch(`/api/activity/track?${params}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.statusText}`);
        }

        const result = await response.json();

        if (reset || page === 0) {
          setActivities(result.activities);
        } else {
          setActivities((prev) => [...prev, ...result.activities]);
        }

        setTotalActivities(result.total);
        setHasMore(result.hasMore);
        setCurrentPage(page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch activities"
        );
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.userId) params.append("userId", filters.userId);

      const response = await fetch(`/api/activity/analytics?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const result = await response.json();
      setAnalytics(result);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchActivities(0, true);
    fetchAnalytics();
  }, [fetchActivities, fetchAnalytics]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchActivities(0, true);
        fetchAnalytics();
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, fetchActivities, fetchAnalytics]);

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(0);
    fetchActivities(0, true);
    fetchAnalytics();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    setCurrentPage(0);
  };

  // Load more activities
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchActivities(currentPage + 1);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: LocalActivitySeverity) => {
    const colors: Record<LocalActivitySeverity, string> = {
      DEBUG: "text-gray-500",
      INFO: "text-blue-500",
      WARN: "text-yellow-500",
      ERROR: "text-red-500",
      CRITICAL: "text-red-700",
    };
    return colors[severity] || "text-gray-500";
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Filter component
  const FilterSection = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              value={filters.userId || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, userId: e.target.value }))
              }
            />
          </div>

          <div className="flex items-end space-x-2">
            <Button onClick={applyFilters}>Apply</Button>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Analytics section
  const AnalyticsSection = () => {
    if (!analytics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalActivities.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {analytics.activitiesByAction.slice(0, 3).map((item) => (
                <div key={item.action} className="flex justify-between text-sm">
                  <span>{item.action}</span>
                  <span className="font-medium">{item._count.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {analytics.activitiesByResource.slice(0, 3).map((item) => (
                <div
                  key={item.resource}
                  className="flex justify-between text-sm"
                >
                  <span>{item.resource}</span>
                  <span className="font-medium">{item._count.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {analytics.activitiesBySeverity.map((item) => (
                <div
                  key={item.severity}
                  className="flex justify-between text-sm"
                >
                  <span className={getSeverityColor(item.severity)}>
                    {item.severity}
                  </span>
                  <span className="font-medium">{item._count.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Activity detail modal
  const ActivityDetailModal = () => {
    if (!selectedActivity) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Activity Details</h3>
            <Button variant="outline" onClick={() => setSelectedActivity(null)}>
              Close
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Action</Label>
                <div className="font-medium">{selectedActivity.action}</div>
              </div>
              <div>
                <Label>Resource</Label>
                <div className="font-medium">{selectedActivity.resource}</div>
              </div>
              <div>
                <Label>Severity</Label>
                <div
                  className={`font-medium ${getSeverityColor(
                    selectedActivity.severity
                  )}`}
                >
                  {selectedActivity.severity}
                </div>
              </div>
              <div>
                <Label>Timestamp</Label>
                <div className="font-medium">
                  {formatTimestamp(selectedActivity.timestamp)}
                </div>
              </div>
              {selectedActivity.user && (
                <div className="col-span-2">
                  <Label>User</Label>
                  <div className="font-medium">
                    {selectedActivity.user.name} ({selectedActivity.user.email})
                  </div>
                </div>
              )}
              {selectedActivity.duration && (
                <div>
                  <Label>Duration</Label>
                  <div className="font-medium">
                    {selectedActivity.duration}ms
                  </div>
                </div>
              )}
            </div>

            {selectedActivity.description && (
              <div>
                <Label>Description</Label>
                <div className="font-medium">
                  {selectedActivity.description}
                </div>
              </div>
            )}

            {selectedActivity.metadata && (
              <div>
                <Label>Metadata</Label>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(selectedActivity.metadata, null, 2)}
                </pre>
              </div>
            )}

            {selectedActivity.tags && selectedActivity.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedActivity.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Activity Dashboard</h1>
        <div className="text-sm text-gray-500">
          {autoRefresh && "Auto-refreshing every 30s"}
        </div>
      </div>

      <FilterSection />
      <AnalyticsSection />

      {/* Real-time Activity Monitor */}
      <RealTimeActivityMonitor className="mb-6" />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>
            Showing {activities.length} of {totalActivities.toLocaleString()}{" "}
            activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Resource</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-xs">
                      {formatTimestamp(activity.timestamp)}
                    </td>
                    <td className="p-2">
                      {activity.user ? (
                        <div>
                          <div className="font-medium">
                            {activity.user.name}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {activity.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="p-2 font-medium">{activity.action}</td>
                    <td className="p-2">{activity.resource}</td>
                    <td
                      className={`p-2 font-medium ${getSeverityColor(
                        activity.severity
                      )}`}
                    >
                      {activity.severity}
                    </td>
                    <td className="p-2 max-w-xs truncate">
                      {activity.description}
                    </td>
                    <td className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedActivity(activity)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && <div className="text-center py-4">Loading...</div>}

          {hasMore && !loading && (
            <div className="text-center py-4">
              <Button onClick={loadMore} variant="outline">
                Load More
              </Button>
            </div>
          )}

          {!hasMore && activities.length > 0 && (
            <div className="text-center py-4 text-gray-500">
              No more activities to load
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityDetailModal />
    </div>
  );
}
