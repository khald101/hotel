import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER') {
      return NextResponse.json({ error: 'غير مصرح للمنظف بالاطلاع على التقارير' }, { status: 403 });
    }

    const hotelId = session.hotelId;

    // 1. Rooms statistics
    const rooms = await prisma.room.findMany({
      where: { hotelId, active: true },
      include: { roomType: true },
    });

    const totalRooms = rooms.length;
    const occupied = rooms.filter((r) => r.occupancyStatus === 'OCCUPIED').length;
    const vacant = rooms.filter((r) => r.occupancyStatus === 'VACANT').length;
    const inspected = rooms.filter((r) => r.cleaningStatus === 'INSPECTED_PASSED').length;
    const dirty = rooms.filter((r) => r.cleaningStatus === 'PENDING_CLEANING' || r.cleaningStatus === 'NEEDS_RECLEAN').length;
    const maintenance = rooms.filter((r) => r.maintenanceStatus !== 'OPERATIONAL').length;

    // 2. Revenue calculations
    const items = await prisma.folioItem.findMany({
      where: { folio: { hotelId } },
    });

    const roomRev = items.filter((i) => i.category === 'ROOM_CHARGE').reduce((acc, i) => acc + i.totalAmount, 0);
    const fbRev = items.filter((i) => i.category === 'RESTAURANT').reduce((acc, i) => acc + i.totalAmount, 0);
    const serviceRev = items.filter((i) => i.category === 'SERVICE' || i.category === 'MINIBAR' || i.category === 'SPA').reduce((acc, i) => acc + i.totalAmount, 0);
    const totalTax = items.reduce((acc, i) => acc + i.taxAmount, 0);
    const grossRev = roomRev + fbRev + serviceRev;

    // 3. Operational KPIs
    const occupancyRate = totalRooms > 0 ? Number(((occupied / totalRooms) * 100).toFixed(1)) : 0;
    const adr = occupied > 0 ? Math.round(roomRev / occupied) : 0;
    const revpar = totalRooms > 0 ? Math.round(roomRev / totalRooms) : 0;

    // 4. Housekeeping SLA
    const totalTasks = await prisma.housekeepingTask.count({ where: { room: { hotelId } } });
    const passedTasks = await prisma.housekeepingTask.count({ where: { room: { hotelId }, status: 'INSPECTED_PASSED' } });
    const recleanTasks = await prisma.housekeepingTask.count({ where: { room: { hotelId }, status: 'NEEDS_RECLEAN' } });

    // 5. Room Type breakdown
    const typeBreakdown: Record<string, { name: string; count: number; occupied: number }> = {};
    for (const r of rooms) {
      if (!typeBreakdown[r.roomType.code]) {
        typeBreakdown[r.roomType.code] = {
          name: r.roomType.nameAr,
          count: 0,
          occupied: 0,
        };
      }
      typeBreakdown[r.roomType.code].count++;
      if (r.occupancyStatus === 'OCCUPIED') {
        typeBreakdown[r.roomType.code].occupied++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRooms,
        occupied,
        vacant,
        inspected,
        dirty,
        maintenance,
        occupancyRate,
        adr,
        revpar,
        roomRev,
        fbRev,
        serviceRev,
        totalTax,
        grossRev,
        housekeeping: {
          totalTasks,
          passedTasks,
          recleanTasks,
        },
        typeBreakdown: Object.values(typeBreakdown),
      },
    });
  } catch (error: any) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'فشل استخراج التقارير' }, { status: 500 });
  }
}
