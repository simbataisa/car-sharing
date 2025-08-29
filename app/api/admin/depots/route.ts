import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { authorize } from '@/lib/rbac';
import { z } from 'zod';

// Validation schema for depot creation/update
const depotSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().default('US'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  managerId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  operatingHours: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().default(true)
});

// GET /api/admin/depots - List all depots with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check depot read permissions
    const authResult = await authorize(session.user.id, 'depots', 'read');
    if (!authResult.allowed) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    
    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get depots with car counts and manager info
    const [depots, total] = await Promise.all([
      prisma.depot.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          cars: {
            select: {
              id: true,
              available: true
            }
          },
          _count: {
            select: {
              cars: true,
              transfersFrom: true,
              transfersTo: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.depot.count({ where })
    ]);

    // Calculate statistics for each depot
    const depotsWithStats = depots.map(depot => ({
      ...depot,
      stats: {
        totalCars: depot._count.cars,
        availableCars: depot.cars.filter(car => car.available).length,
        occupancyRate: depot.capacity > 0 ? (depot._count.cars / depot.capacity) * 100 : 0,
        transfersFrom: depot._count.transfersFrom,
        transfersTo: depot._count.transfersTo
      }
    }));

    return NextResponse.json({
      depots: depotsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching depots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch depots' },
      { status: 500 }
    );
  }
}

// POST /api/admin/depots - Create new depot
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check depot write permissions
    const authResult = await authorize(session.user.id, 'depots', 'write');
    if (!authResult.allowed) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = depotSchema.parse(body);

    // Check if depot name already exists
    const existingDepot = await prisma.depot.findUnique({
      where: { name: validatedData.name }
    });

    if (existingDepot) {
      return NextResponse.json(
        { error: 'Depot with this name already exists' },
        { status: 400 }
      );
    }

    // If managerId is provided, verify the user exists and has appropriate role
    if (validatedData.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: validatedData.managerId }
      });

      if (!manager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 400 }
        );
      }
    }

    const depot = await prisma.depot.create({
      data: {
        ...validatedData,
        operatingHours: validatedData.operatingHours ? JSON.stringify(validatedData.operatingHours) : null
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            cars: true
          }
        }
      }
    });

    return NextResponse.json(depot, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating depot:', error);
    return NextResponse.json(
      { error: 'Failed to create depot' },
      { status: 500 }
    );
  }
}