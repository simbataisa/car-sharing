import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { authorize } from '@/lib/rbac';
import { z } from 'zod';

// Validation schema for depot updates
const updateDepotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(500).optional(),
  capacity: z.number().int().min(1).optional(),
  managerId: z.uuid().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.email().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/depots/[id] - Get depot by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const authResult = await authorize(session.user.id, 'admin', 'read');
    if (!authResult.allowed) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const depot = await prisma.depot.findUnique({
      where: { id: params.id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cars: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            available: true,
          },
        },
        transfersFrom: {
          include: {
            car: {
              select: {
                id: true,
                make: true,
                model: true,
              },
            },
            toDepot: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        transfersTo: {
          include: {
            car: {
              select: {
                id: true,
                make: true,
                model: true,
              },
            },
            fromDepot: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            cars: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
    });

    if (!depot) {
      return NextResponse.json({ error: 'Depot not found' }, { status: 404 });
    }

    // Calculate occupancy rate
    const occupancyRate = depot.capacity > 0 ? (depot._count.cars / depot.capacity) * 100 : 0;

    return NextResponse.json({
      ...depot,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching depot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/depots/[id] - Update depot
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const authResult = await authorize(session.user.id, 'admin', 'write');
    if (!authResult.allowed) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateDepotSchema.parse(body);

    // Check if depot exists
    const existingDepot = await prisma.depot.findUnique({
      where: { id: params.id },
    });

    if (!existingDepot) {
      return NextResponse.json({ error: 'Depot not found' }, { status: 404 });
    }

    // Check if name is unique (if being updated)
    if (validatedData.name && validatedData.name !== existingDepot.name) {
      const nameExists = await prisma.depot.findFirst({
        where: {
          name: validatedData.name,
          id: { not: params.id },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Depot name already exists' },
          { status: 400 }
        );
      }
    }

    // Validate manager exists (if being updated)
    if (validatedData.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: validatedData.managerId },
      });

      if (!manager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 400 }
        );
      }
    }

    const updatedDepot = await prisma.depot.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            cars: true,
          },
        },
      },
    });

    return NextResponse.json(updatedDepot);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating depot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/depots/[id] - Delete depot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const authResult = await authorize(session.user.id, 'admin', 'write');
    if (!authResult.allowed) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if depot exists
    const depot = await prisma.depot.findUnique({
      where: { id: params.id },
      include: {
        cars: true,
        transfersFrom: true,
        transfersTo: true,
      },
    });

    if (!depot) {
      return NextResponse.json({ error: 'Depot not found' }, { status: 404 });
    }

    // Check if depot has cars or transfers
    if (depot.cars.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete depot with assigned cars. Please transfer cars first.' },
        { status: 400 }
      );
    }

    if (depot.transfersFrom.length > 0 || depot.transfersTo.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete depot with transfer history. Please archive instead.' },
        { status: 400 }
      );
    }

    await prisma.depot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Depot deleted successfully' });
  } catch (error) {
    console.error('Error deleting depot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}