import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const where: any = {
      room: { hotelId: session.hotelId },
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tickets = await prisma.maintenanceTicket.findMany({
      where,
      include: {
        room: { include: { floor: true } },
        reportedBy: { select: { fullName: true, username: true } },
        assignedTo: { select: { fullName: true, username: true } },
      },
      orderBy: [{ priority: 'desc' }, { reportedAt: 'desc' }],
    });

    const technicians = await prisma.user.findMany({
      where: {
        hotelId: session.hotelId,
        role: { in: ['MAINTENANCE_TECH', 'ADMIN'] },
        active: true,
      },
      select: { id: true, fullName: true, username: true },
    });

    return NextResponse.json({ success: true, data: tickets, technicians });
  } catch (error: any) {
    console.error('Maintenance GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع بلاغات الصيانة' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const {
      roomId,
      assetName,
      issueType = 'PLUMBING',
      priority = 'MEDIUM',
      description,
      assignedToId,
      blocksRoomSale = false,
    } = body;

    if (!description) {
      return NextResponse.json({ error: 'يرجى تقديم وصف مفصل للعطل' }, { status: 400 });
    }

    const ticketNumber = `MNT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        ticketNumber,
        roomId: roomId || null,
        assetName: assetName || null,
        issueType,
        priority,
        status: assignedToId ? 'ASSIGNED' : 'NEW',
        reportedById: session.userId,
        assignedToId: assignedToId || null,
        description,
        blocksRoomSale: Boolean(blocksRoomSale),
      },
      include: { room: true },
    });

    // If blocks room sale or is under maintenance, update the room statuses
    if (roomId && blocksRoomSale) {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          maintenanceStatus: 'UNDER_MAINTENANCE',
          saleStatus: 'OUT_OF_ORDER',
        },
      });
    }

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_MAINTENANCE_TICKET',
      entityType: 'MaintenanceTicket',
      entityId: ticket.id,
      details: `إنشاء بلاغ صيانة رقم ${ticketNumber} للغرفة ${ticket.room?.roomNumber || 'عام'} (أولوية: ${priority})`,
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: any) {
    console.error('Maintenance POST error:', error);
    return NextResponse.json({ error: 'فشل إنشاء بلاغ الصيانة' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, status, resolutionNotes, assignedToId } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ error: 'معرف التذكرة والحالة مطلوبان' }, { status: 400 });
    }

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: ticketId },
      include: { room: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'بلاغ الصيانة غير موجود' }, { status: 404 });
    }

    const updateData: any = { status };
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (assignedToId) updateData.assignedToId = assignedToId;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.maintenanceTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // If resolved or closed, restore room maintenanceStatus to OPERATIONAL and saleStatus to AVAILABLE!
    if ((status === 'RESOLVED' || status === 'CLOSED') && ticket.roomId) {
      await prisma.room.update({
        where: { id: ticket.roomId },
        data: {
          maintenanceStatus: 'OPERATIONAL',
          saleStatus: 'AVAILABLE',
        },
      });
    }

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_MAINTENANCE_TICKET',
      entityType: 'MaintenanceTicket',
      entityId: ticketId,
      details: `تحديث بلاغ الصيانة ${ticket.ticketNumber} إلى حالة: ${status}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Maintenance update error:', error);
    return NextResponse.json({ error: 'فشل تحديث بلاغ الصيانة' }, { status: 500 });
  }
}

