import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerificationRecord {
  id: string;
  token: string;
  type:
    | "OTP"
    | "ACTIVATION_LINK"
    | "PASSWORD_RESET"
    | "EMAIL_CHANGE"
    | "TWO_FACTOR";
  purpose?: string;
  status: "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED" | "REVOKED";
  attempts: number;
  maxAttempts: number;
  expires: string;
  verifiedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface VerificationStats {
  total: number;
  verified: number;
  expired: number;
  failed: number;
  pending: number;
  successRate: number;
}

interface VerificationHistoryProps {
  userEmail?: string;
  className?: string;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return "bg-green-100 text-green-800 border-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "EXPIRED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "FAILED":
      return "bg-red-100 text-red-800 border-red-200";
    case "REVOKED":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "OTP":
      return "🔢";
    case "ACTIVATION_LINK":
      return "🔗";
    case "PASSWORD_RESET":
      return "🔑";
    case "EMAIL_CHANGE":
      return "📧";
    case "TWO_FACTOR":
      return "🔐";
    default:
      return "📝";
  }
};

export default function VerificationHistory({
  userEmail,
  className = "",
}: VerificationHistoryProps) {
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState(userEmail || "");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [days, setDays] = useState(30);

  const fetchVerificationData = async () => {
    if (!searchEmail) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        email: searchEmail,
        days: days.toString(),
        limit: "20",
      });

      if (selectedType !== "all") {
        params.append("type", selectedType);
      }

      const response = await fetch(`/api/admin/verifications?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch verification data");
      }

      setHistory(data.history);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchVerificationData();
    }
  }, [userEmail]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Email Verification History & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Verification Type</Label>
              <select
                id="type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="OTP">OTP</option>
                <option value="ACTIVATION_LINK">Activation Link</option>
                <option value="PASSWORD_RESET">Password Reset</option>
                <option value="EMAIL_CHANGE">Email Change</option>
                <option value="TWO_FACTOR">Two Factor</option>
              </select>
            </div>
            <div>
              <Label htmlFor="days">Time Period (Days)</Label>
              <select
                id="days"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchVerificationData}
                disabled={loading || !searchEmail}
                className="w-full"
              >
                {loading ? "Loading..." : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Statistics ({days} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.verified}
                </div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.expired}
                </div>
                <div className="text-sm text-gray-600">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Purpose</th>
                    <th className="text-left py-2 px-3">Attempts</th>
                    <th className="text-left py-2 px-3">Created</th>
                    <th className="text-left py-2 px-3">Expires</th>
                    <th className="text-left py-2 px-3">Verified</th>
                    <th className="text-left py-2 px-3">Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getTypeIcon(record.type)}
                          </span>
                          <span className="font-medium">{record.type}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        {record.purpose || "-"}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {record.attempts}/{record.maxAttempts}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        <div>{formatDate(record.createdAt)}</div>
                        <div className="text-xs text-gray-500">
                          {formatDuration(record.createdAt)}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        <div>{formatDate(record.expires)}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.expires) > new Date()
                            ? "Active"
                            : "Expired"}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        {record.verifiedAt ? (
                          <>
                            <div>{formatDate(record.verifiedAt)}</div>
                            <div className="text-xs text-gray-500">
                              {formatDuration(record.verifiedAt)}
                            </div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        {record.createdBy ? `Admin` : "System"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {searchEmail && history.length === 0 && !loading && !error && (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            No verification records found for {searchEmail} in the last {days}{" "}
            days.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
