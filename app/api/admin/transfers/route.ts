import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { authorize } from '@/lib/rbac';
import { z } from 'zod';

// Validation schema for car transfer creation
const createTransferSchema = z.object({
  carId: z.number().int().positive(),
  fromDepotId: z.string().uuid().optional(),
  toDepotId: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
  notes: z.string().max(1000).optional(),
  scheduledDate: z.string().datetime().optional(),
});

// GET /api/admin/transfers - List car transfers
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const status = searchParams.get('status');
    const carId = searchParams.get('carId');
    const depotId = searchParams.get('depotId');
    const initiatedBy = searchParams.get('initiatedBy');

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (carId) where.carId = parseInt(carId);
    if (depotId) {
      where.OR = [
        { fromDepotId: depotId },
        { toDepotId: depotId }
      ];
    }
    if (initiatedBy) where.initiatedBy = initiatedBy;

    const [transfers, total] = await Promise.all([
      prisma.carTransfer.findMany({
        where,
        include: {
          car: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
            },
          },
          fromDepot: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          toDepot: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          initiator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          completer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.carTransfer.count({ where }),
    ]);

    // Get transfer statistics
    const stats = await prisma.carTransfer.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      transfers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      statistics: {
        total,
        byStatus: statusCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/transfers - Create new car transfer
export async function POST(request: NextRequest) {
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
    const validatedData = createTransferSchema.parse(body);

    // Validate car exists and get current depot
    const car = await prisma.car.findUnique({
      where: { id: validatedData.carId },
      include: {
        depot: true,
      },
    });

    if (!car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    // Validate destination depot exists
    const toDepot = await prisma.depot.findUnique({
      where: { id: validatedData.toDepotId },
    });

    if (!toDepot) {
      return NextResponse.json(
        { error: 'Destination depot not found' },
        { status: 404 }
      );
    }

    // Check if car is already at the destination depot
    if (car.depotId === validatedData.toDepotId) {
      return NextResponse.json(
        { error: 'Car is already at the destination depot' },
        { status: 400 }
      );
    }

    // Check if there's already a pending transfer for this car
    const existingTransfer = await prisma.carTransfer.findFirst({
      where: {
        carId: validatedData.carId,
        status: {
          in: ['PENDING', 'APPROVED', 'IN_TRANSIT'],
        },
      },
    });

    if (existingTransfer) {
      return NextResponse.json(
        { error: 'Car already has a pending transfer' },
        { status: 400 }
      );
    }

    // Check destination depot capacity
    const [currentCarsInDestination] = await Promise.all([
      prisma.car.count({
        where: { depotId: validatedData.toDepotId },
      }),
    ]);

    if (currentCarsInDestination >= toDepot.capacity) {
      return NextResponse.json(
        { error: 'Destination depot is at full capacity' },
        { status: 400 }
      );
    }

    const transfer = await prisma.carTransfer.create({
      data: {
        carId: validatedData.carId,
        fromDepotId: car.depotId,
        toDepotId: validatedData.toDepotId,
        reason: validatedData.reason,
        notes: validatedData.notes,
        scheduledDate: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null,
        initiatedBy: session.user.id,
        status: 'PENDING',
      },
      include: {
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
          },
        },
        fromDepot: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        toDepot: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        initiator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}