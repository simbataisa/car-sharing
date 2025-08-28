import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { authorize } from '@/lib/rbac';
import { z } from 'zod';

// Validation schema for transfer updates
const updateTransferSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'REJECTED']).optional(),
  reason: z.string().min(1).max(500).optional(),
  notes: z.string().max(1000).optional(),
  scheduledDate: z.string().datetime().optional(),
});

// GET /api/admin/transfers/[id] - Get transfer by ID
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

    const transfer = await prisma.carTransfer.findUnique({
      where: { id: params.id },
      include: {
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            available: true,
          },
        },
        fromDepot: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
        toDepot: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
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
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error fetching transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/transfers/[id] - Update transfer
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
    const validatedData = updateTransferSchema.parse(body);

    // Check if transfer exists
    const existingTransfer = await prisma.carTransfer.findUnique({
      where: { id: params.id },
      include: {
        car: true,
      },
    });

    if (!existingTransfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Validate status transitions
    if (validatedData.status) {
      const validTransitions: Record<string, string[]> = {
        PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
        APPROVED: ['IN_TRANSIT', 'CANCELLED'],
        IN_TRANSIT: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [], // Final state
        CANCELLED: [], // Final state
        REJECTED: [], // Final state
      };

      const allowedNextStates = validTransitions[existingTransfer.status] || [];
      if (!allowedNextStates.includes(validatedData.status)) {
        return NextResponse.json(
          { 
            error: `Invalid status transition from ${existingTransfer.status} to ${validatedData.status}`,
            allowedTransitions: allowedNextStates
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
    };

    // Set appropriate user fields based on status
    if (validatedData.status === 'APPROVED') {
      updateData.approvedBy = session.user.id;
    } else if (validatedData.status === 'IN_TRANSIT') {
      updateData.startedAt = new Date();
    } else if (validatedData.status === 'COMPLETED') {
      updateData.completedBy = session.user.id;
      updateData.completedAt = new Date();
    }

    // Convert scheduledDate string to Date if provided
    if (validatedData.scheduledDate) {
      updateData.scheduledDate = new Date(validatedData.scheduledDate);
    }

    // Use transaction to update transfer and car location if completing
    const result = await prisma.$transaction(async (tx) => {
      // Update the transfer
      const updatedTransfer = await tx.carTransfer.update({
        where: { id: params.id },
        data: updateData,
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
      });

      // If transfer is completed, update car's depot
      if (validatedData.status === 'COMPLETED') {
        await tx.car.update({
          where: { id: existingTransfer.carId },
          data: {
            depotId: existingTransfer.toDepotId,
          },
        });
      }

      return updatedTransfer;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/transfers/[id] - Cancel transfer
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

    // Check if transfer exists and can be cancelled
    const transfer = await prisma.carTransfer.findUnique({
      where: { id: params.id },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Only allow cancellation of pending, approved, or in-transit transfers
    if (!['PENDING', 'APPROVED', 'IN_TRANSIT'].includes(transfer.status)) {
      return NextResponse.json(
        { error: `Cannot cancel transfer with status: ${transfer.status}` },
        { status: 400 }
      );
    }

    const cancelledTransfer = await prisma.carTransfer.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
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
        toDepot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Transfer cancelled successfully',
      transfer: cancelledTransfer,
    });
  } catch (error) {
    console.error('Error cancelling transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}