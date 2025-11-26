import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function GET() {
  const result = await prisma.workOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      notes: true,
    },
  });
  return NextResponse.json({ success: true, data: result });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, assetId, priority, assignedTo, dueDate, description } = body;

    if (!title || !assetId || !priority) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found.' }, { status: 400 });
    }
    if (assignedTo) {
      const tech = await prisma.technician.findUnique({ where: { id: assignedTo } });
      if (!tech) {
        return NextResponse.json({ success: false, error: 'Technician not found.' }, { status: 400 });
      }
    }
    if (dueDate && isNaN(Date.parse(dueDate))) {
      return NextResponse.json({ success: false, error: 'Invalid due date.' }, { status: 400 });
    }
    if (!['Low','Medium','High'].includes(priority)) {
      return NextResponse.json({ success: false, error: 'Invalid priority.' }, { status: 400 });
    }

    const newWorkOrder = await prisma.workOrder.create({
      data: {
        id: nanoid(),
        title,
        assetId,
        priority,
        status: 'Open',
        assignedToId: assignedTo || undefined,
        createdAt: new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        description: description || undefined,
      },
    });
    return NextResponse.json({ success: true, data: newWorkOrder }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
