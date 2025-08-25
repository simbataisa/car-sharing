# Roles & Permissions Management System

## Overview

The Roles & Permissions Management System is a comprehensive administrative interface that provides granular control over user access rights and system permissions. Built on top of the existing RBAC (Role-Based Access Control) foundation, this system enables administrators to dynamically manage roles, assign permissions, and control user access across the entire application.

## System Architecture

### Core Components

1. **Frontend Interface** (`/admin/roles`)
   - Role management dashboard
   - Permission assignment matrix
   - User role management
   - Real-time updates

2. **API Layer**
   - RESTful endpoints for role operations
   - Permission management APIs
   - Enhanced user management
   - Authentication middleware

3. **Database Layer**
   - RBAC schema integration
   - Role-permission relationships
   - User-role assignments
   - System role protection

## Features

### Role Management

#### Create New Roles
- Dynamic role creation with custom names and descriptions
- Permission selection during role creation
- Validation to prevent duplicate role names
- Automatic assignment of selected permissions

#### Edit Existing Roles
- In-place editing of role names and descriptions
- Dynamic permission assignment/removal
- Real-time permission matrix updates
- Validation for system role protection

#### Delete Roles
- Safe role deletion with user count validation
- Prevention of system role deletion
- Cascade handling for role-permission relationships
- User notification for roles with assigned users

### Permission Management

#### Permission Matrix
- Visual checkbox interface for permission assignment
- Real-time updates when permissions change
- Grouped permissions by resource type
- Clear indication of assigned vs. available permissions

#### Permission Categories
- **Users Management**: Create, read, update, delete user accounts
- **Cars Management**: Manage vehicle inventory and details
- **Bookings Management**: Handle reservation operations
- **Admin Management**: Administrative system access

### System Role Protection

#### Protected Roles
- **SUPER_ADMIN**: Complete system access, cannot be modified/deleted
- **ADMIN**: Administrative access, cannot be modified/deleted
- **USER**: Basic user role, made editable for flexibility

#### Protection Mechanisms
- Database-level `isSystem` flag
- Frontend UI disabling for protected roles
- API-level validation preventing unauthorized changes
- Clear visual indicators for system roles

## Implementation Details

### Frontend Implementation

#### Main Component: `/app/admin/roles/page.tsx`

```typescript
// Key features implemented:
- Role listing with user counts
- Permission matrix with real-time updates
- Modal-based role creation and editing
- System role protection indicators
- Responsive design with accessibility features
```

#### Key State Management

```typescript
interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

// Real-time updates
const [roles, setRoles] = useState<Role[]>([]);
const [permissions, setPermissions] = useState<Permission[]>([]);
```

#### Permission Matrix Logic

```typescript
// Dynamic permission assignment
const handlePermissionChange = (permissionId: string, checked: boolean) => {
  if (checked) {
    setFormData(prev => ({
      ...prev,
      permissions: [...prev.permissions, permissionId]
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter(id => id !== permissionId)
    }));
  }
};
```

### API Implementation

#### Roles API: `/api/admin/rbac/roles/route.ts`

**GET** - Fetch all roles with user counts
```typescript
// Returns roles with associated user counts and permissions
const roles = await prisma.role.findMany({
  include: {
    userRoles: {
      select: { userId: true }
    },
    rolePermissions: {
      include: {
        permission: true
      }
    }
  }
});
```

**POST** - Create new role
```typescript
// Validates role data and creates with permissions
const newRole = await prisma.role.create({
  data: {
    name,
    description,
    isSystem: false,
    rolePermissions: {
      create: permissions.map(permissionId => ({
        permissionId
      }))
    }
  }
});
```

**PUT** - Update existing role
```typescript
// Updates role with system role protection
if (existingRole.isSystem) {
  return NextResponse.json(
    { error: 'Cannot modify system roles' },
    { status: 403 }
  );
}
```

**DELETE** - Delete role
```typescript
// Validates deletion constraints
if (existingRole.isSystem) {
  return NextResponse.json(
    { error: 'Cannot delete system roles' },
    { status: 403 }
  );
}

if (userCount > 0) {
  return NextResponse.json(
    { error: 'Cannot delete role with assigned users' },
    { status: 400 }
  );
}
```

#### Permissions API: `/api/admin/rbac/permissions/route.ts`

```typescript
// Fetches all available permissions
const permissions = await prisma.permission.findMany({
  orderBy: { name: 'asc' }
});
```

#### Role Permissions API: `/api/admin/rbac/roles/[id]/permissions/route.ts`

**POST** - Assign permission to role
```typescript
const rolePermission = await prisma.rolePermission.create({
  data: {
    roleId,
    permissionId
  }
});
```

**DELETE** - Remove permission from role
```typescript
await prisma.rolePermission.delete({
  where: {
    roleId_permissionId: {
      roleId,
      permissionId
    }
  }
});
```

### Authentication Enhancement

#### Enhanced Admin Middleware: `/lib/admin-auth.ts`

```typescript
// Support for both legacy and RBAC roles
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  include: {
    userRoles: {
      include: {
        role: true
      }
    }
  }
});

// Check admin access
const hasAdminAccess = user.role === "ADMIN" || 
  user.userRoles.some(ur => 
    ur.role.name === "ADMIN" || ur.role.name === "SUPER_ADMIN"
  );
```

### Database Schema Integration

#### Core Tables

```prisma
model Role {
  id              String           @id @default(cuid())
  name            String           @unique
  description     String?
  isSystem        Boolean          @default(false)
  userRoles       UserRole[]
  rolePermissions RolePermission[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model Permission {
  id              String           @id @default(cuid())
  name            String           @unique
  description     String?
  resource        String
  action          String
  rolePermissions RolePermission[]
  userPermissions UserPermission[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model RolePermission {
  id           String     @id @default(cuid())
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())

  @@unique([roleId, permissionId])
}
```

#### Seed Data Updates

```typescript
// Modified USER role to be editable
{
  name: "USER",
  description: "Standard user with basic access",
  isSystem: false, // Changed from true to allow editing
}
```

## Security Considerations

### System Role Protection

1. **Database Level**: `isSystem` flag prevents modification
2. **API Level**: Validation in all endpoints
3. **Frontend Level**: UI elements disabled for system roles
4. **Middleware Level**: Enhanced authentication checks

### Permission Validation

1. **Role Creation**: Validates permission existence
2. **Permission Assignment**: Prevents duplicate assignments
3. **Role Deletion**: Checks for assigned users
4. **System Integrity**: Maintains referential integrity

### Access Control

1. **Admin Authentication**: Required for all operations
2. **RBAC Integration**: Supports both legacy and new role systems
3. **Session Validation**: Ensures valid admin sessions
4. **Error Handling**: Secure error messages without information leakage

## User Experience Features

### Real-time Updates
- Immediate reflection of role changes
- Live user count updates
- Dynamic permission matrix
- Instant validation feedback

### Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast indicators
- Semantic HTML structure

### Responsive Design
- Mobile-friendly interface
- Adaptive table layouts
- Touch-friendly controls
- Optimized for various screen sizes

### Error Handling
- User-friendly error messages
- Validation feedback
- Loading states
- Graceful degradation

## Usage Examples

### Creating a New Role

1. Navigate to `/admin/roles`
2. Click "Create Role" button
3. Enter role name and description
4. Select desired permissions from the matrix
5. Click "Create" to save

### Editing Role Permissions

1. Find the role in the roles table
2. Click the "Edit" button
3. Modify permissions using checkboxes
4. Changes are saved automatically

### Managing User Roles

1. Navigate to `/admin/users`
2. Select a user to edit
3. Assign/remove roles using the role selector
4. Save changes to update user access

## Future Enhancements

### Planned Features

1. **Role Templates**: Pre-defined role configurations
2. **Permission Groups**: Logical grouping of related permissions
3. **Role Inheritance**: Hierarchical role relationships
4. **Audit Logging**: Detailed tracking of role changes
5. **Bulk Operations**: Mass role assignments and updates

### Technical Improvements

1. **Caching**: Redis-based permission caching
2. **Performance**: Optimized database queries
3. **Validation**: Enhanced client-side validation
4. **Testing**: Comprehensive test coverage
5. **Documentation**: API documentation with examples

## Troubleshooting

### Common Issues

1. **Cannot Edit System Roles**: By design, system roles are protected
2. **Cannot Delete Role with Users**: Remove users from role first
3. **Permission Changes Not Reflected**: Check browser cache and refresh
4. **Access Denied**: Ensure user has ADMIN or SUPER_ADMIN role

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify API responses in Network tab
3. Confirm database state using Prisma Studio
4. Review server logs for backend errors
5. Validate user session and permissions

## Conclusion

The Roles & Permissions Management System provides a robust, secure, and user-friendly interface for managing access control in the car-sharing application. With comprehensive protection mechanisms, real-time updates, and enterprise-grade security features, it enables administrators to maintain fine-grained control over user access while ensuring system integrity and security.

The implementation follows modern web development best practices, provides excellent user experience, and maintains backward compatibility with the existing RBAC system. The modular architecture allows for easy extension and customization to meet evolving business requirements.