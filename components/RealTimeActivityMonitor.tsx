'use client';

import React, { useState, useEffect } from 'react';
import { ActivityAction, ActivitySeverity } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useAdminActivityStream, 
  useErrorStream, 
  ActivityStreamMessage,
  ActivityStreamFilters 
} from '@/hooks/useActivityStream';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Wifi, 
  WifiOff,
  Bell,
  BellOff,
  Trash2,
  Filter,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';

interface RealTimeActivityMonitorProps {
  className?: string;
}

export default function RealTimeActivityMonitor({ className }: RealTimeActivityMonitorProps) {
  const [filters, setFilters] = useState<ActivityStreamFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);
  const [showErrors, setShowErrors] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [notificationText, setNotificationText] = useState('');
  const [notificationType, setNotificationType] = useState('info');

  // Activity stream hook
  const {
    connected,
    connecting,
    error,
    messages,
    activeConnections,
    connectionId,
    reconnectAttempts,
    notifications,
    criticalAlerts,
    connect,
    disconnect,
    reconnect,
    clearMessages,
    clearNotifications,
    clearCriticalAlerts,
    sendNotification,
  } = useAdminActivityStream(filters);

  // Error stream hook
  const {
    errorEvents,
    clearErrors,
  } = useErrorStream();

  // Helper functions
  const getConnectionStatusColor = () => {
    if (connected) return 'text-green-600';
    if (connecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConnectionStatusText = () => {
    if (connected) return 'Connected';
    if (connecting) return 'Connecting...';
    return 'Disconnected';
  };

  // Get severity color for badges
  const getSeverityColor = (severity: ActivitySeverity) => {
    switch (severity) {
      case 'DEBUG': return 'bg-gray-100 text-gray-800';
      case 'INFO': return 'bg-blue-100 text-blue-800';
      case 'WARN': return 'bg-yellow-100 text-yellow-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'CRITICAL': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    };
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Handle sending notifications
  const handleSendNotification = async () => {
    if (!notificationText.trim()) return;
    
    try {
      await sendNotification({
        type: notificationType as any,
        message: notificationText,
      });
      setNotificationText('');
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  // Handle filter application
  const handleApplyFilters = () => {
    // Filters are applied automatically through the filters state
  };

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      const feedElement = document.getElementById('activity-feed');
      if (feedElement) {
        feedElement.scrollTop = feedElement.scrollHeight;
      }
    }
  }, [messages, autoScroll]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {connected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
                <div>
                  <p className={`font-medium ${getConnectionStatusColor()}`}>
                    {getConnectionStatusText()}
                  </p>
                  {connectionId && (
                    <p className="text-xs text-gray-500">ID: {connectionId.slice(-8)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{activeConnections} active connections</span>
              </div>

              {reconnectAttempts > 0 && (
                <span className="px-2 py-1 rounded text-xs font-medium border">
                  Reconnect attempts: {reconnectAttempts}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>

              {connected ? (
                <Button variant="outline" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={reconnect}>
                  {connecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="severityFilter">Severity</Label>
                <Input
                  id="severityFilter"
                  placeholder="DEBUG,INFO,WARN,ERROR,CRITICAL"
                  value={filters.severity?.join(',') || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    severity: e.target.value.split(',').filter(Boolean) as ActivitySeverity[],
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="actionsFilter">Actions</Label>
                <Input
                  id="actionsFilter"
                  placeholder="LOGIN,CREATE,UPDATE,DELETE"
                  value={filters.actions?.join(',') || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    actions: e.target.value.split(',').filter(Boolean) as ActivityAction[],
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="resourcesFilter">Resources</Label>
                <Input
                  id="resourcesFilter"
                  placeholder="user,car,booking"
                  value={filters.resources?.join(',') || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    resources: e.target.value.split(',').filter(Boolean),
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="usersFilter">User IDs</Label>
                <Input
                  id="usersFilter"
                  placeholder="user1,user2"
                  value={filters.userIds?.join(',') || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    userIds: e.target.value.split(',').filter(Boolean),
                  }))}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Live Activities</p>
                <p className="text-2xl font-bold">{messages.filter(m => m.type === 'activity').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Errors</p>
                <p className="text-2xl font-bold">{errorEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Critical Alerts</p>
                <p className="text-2xl font-bold">{criticalAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Send Notification</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>

            <Input
              placeholder="Enter notification message..."
              value={notificationText}
              onChange={(e) => setNotificationText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendNotification()}
              className="flex-1"
            />

            <Button onClick={handleSendNotification} disabled={!notificationText.trim()}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Live Activity Feed</span>
            </CardTitle>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                {showNotifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                Notifications
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
              >
                {showErrors ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Errors
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActivities(!showActivities)}
              >
                {showActivities ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Activities
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearMessages}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              <span>Auto-scroll</span>
            </label>
          </div>
        </CardHeader>

        <CardContent>
          <div
            id="activity-feed"
            className="h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 space-y-2"
          >
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No activity yet. Waiting for events...
              </div>
            )}

            {messages.map((message, index) => {
              // Filter messages based on visibility settings
              if (message.type === 'notification' && !showNotifications) return null;
              if (message.type === 'activity' && message.data.severity && ['ERROR', 'CRITICAL'].includes(message.data.severity) && !showErrors) return null;
              if (message.type === 'activity' && !showActivities) return null;

              return (
                <div key={`${message.data.id || index}-${message.data.timestamp}`} className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {message.type === 'activity' && <Activity className="h-4 w-4 text-blue-500" />}
                        {message.type === 'notification' && <Bell className="h-4 w-4 text-green-500" />}
                        {message.type === 'connection' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {message.type === 'heartbeat' && <Wifi className="h-4 w-4 text-gray-400" />}
                        {message.type === 'system' && <AlertCircle className="h-4 w-4 text-orange-500" />}

                        <span className="font-medium text-sm capitalize">{message.type}</span>

                        {message.data.severity && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(message.data.severity)}`}>
                            {message.data.severity}
                          </span>
                        )}

                        {message.data.action && (
                          <span className="px-2 py-1 rounded text-xs font-medium border">{message.data.action}</span>
                        )}
                      </div>

                      <p className="text-sm text-gray-900">
                        {message.data.description || message.data.message || 'No description'}
                      </p>

                      {message.data.resource && (
                        <p className="text-xs text-gray-500">
                          Resource: {message.data.resource}
                          {message.data.resourceId && ` (${message.data.resourceId})`}
                        </p>
                      )}

                      {message.data.userId && (
                        <p className="text-xs text-gray-500">
                          User: {message.data.userId}
                        </p>
                      )}

                      {message.data.tags && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.data.tags.map(tag => (
                              <span key={tag} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>

                    <span className="text-xs text-gray-500 ml-2">
                      {formatTime(message.data.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}