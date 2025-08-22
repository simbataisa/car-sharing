"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { UserWithRoles, Permission } from "@/lib/rbac";

// Client-side authorization hook
export function useAuthorization() {
  const { data: session } = useSession();
  const [userWithRoles, setUserWithRoles] = useState<UserWithRoles | null>(
    null
  );
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserPermissions() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/user/${session.user.id}/permissions`
        );
        if (response.ok) {
          const data = await response.json();
          setUserWithRoles(data.user);
          setPermissions(data.permissions);
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserPermissions();
  }, [session?.user?.id]);

  // Check if user has a specific permission
  const hasPermission = (permissionName: string): boolean => {
    return permissions.some((p) => p.name === permissionName);
  };

  // Check if user has permission on a resource with specific action
  const hasResourcePermission = (resource: string, action: string): boolean => {
    const permissionName = `${resource}:${action}`;
    return hasPermission(permissionName);
  };

  // Check if user has any admin permission on a resource
  const hasAdminPermission = (resource: string): boolean => {
    return hasResourcePermission(resource, "admin");
  };

  // Check if user has any role
  const hasRole = (roleName: string): boolean => {
    return (
      userWithRoles?.userRoles.some(
        (userRole) => userRole.role.name === roleName
      ) ?? false
    );
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some((roleName) => hasRole(roleName));
  };

  // Get user's roles
  const getUserRoles = (): string[] => {
    return userWithRoles?.userRoles.map((userRole) => userRole.role.name) ?? [];
  };

  // Check if user is admin (has any admin role)
  const isAdmin = (): boolean => {
    return hasAnyRole(["SUPER_ADMIN", "ADMIN"]);
  };

  // Check if user is super admin
  const isSuperAdmin = (): boolean => {
    return hasRole("SUPER_ADMIN");
  };

  return {
    user: userWithRoles,
    permissions,
    loading,
    hasPermission,
    hasResourcePermission,
    hasAdminPermission,
    hasRole,
    hasAnyRole,
    getUserRoles,
    isAdmin,
    isSuperAdmin,
  };
}

// Authorization wrapper component
interface AuthorizeProps {
  permission?: string;
  resource?: string;
  action?: string;
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Authorize({
  permission,
  resource,
  action,
  role,
  roles,
  fallback = null,
  children,
}: AuthorizeProps) {
  const auth = useAuthorization();

  if (auth.loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  let authorized = false;

  if (permission) {
    authorized = auth.hasPermission(permission);
  } else if (resource && action) {
    authorized = auth.hasResourcePermission(resource, action);
  } else if (role) {
    authorized = auth.hasRole(role);
  } else if (roles) {
    authorized = auth.hasAnyRole(roles);
  }

  return authorized ? <>{children}</> : <>{fallback}</>;
}

// Higher-order component for authorization
export function withAuthorization<P extends object>(
  Component: React.ComponentType<P>,
  authCheck: (auth: ReturnType<typeof useAuthorization>) => boolean,
  fallback?: React.ComponentType
) {
  return function AuthorizedComponent(props: P) {
    const auth = useAuthorization();

    if (auth.loading) {
      return <div className="animate-pulse">Loading...</div>;
    }

    if (!authCheck(auth)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent />;
      }
      return <div className="text-red-500">Access Denied</div>;
    }

    return <Component {...props} />;
  };
}

// Utility hooks for common authorization patterns
export function useIsAdmin() {
  const auth = useAuthorization();
  return { isAdmin: auth.isAdmin(), loading: auth.loading };
}

export function useIsSuperAdmin() {
  const auth = useAuthorization();
  return { isSuperAdmin: auth.isSuperAdmin(), loading: auth.loading };
}

export function useCanManageUsers() {
  const auth = useAuthorization();
  return {
    canManage:
      auth.hasResourcePermission("users", "admin") ||
      auth.hasResourcePermission("users", "write"),
    loading: auth.loading,
  };
}

export function useCanManageCars() {
  const auth = useAuthorization();
  return {
    canManage:
      auth.hasResourcePermission("cars", "admin") ||
      auth.hasResourcePermission("cars", "write"),
    loading: auth.loading,
  };
}

export function useCanManageBookings() {
  const auth = useAuthorization();
  return {
    canManage:
      auth.hasResourcePermission("bookings", "admin") ||
      auth.hasResourcePermission("bookings", "write"),
    loading: auth.loading,
  };
}
