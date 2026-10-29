import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const rooms = await prisma.room.findMany({
      where: { hotelId: session.hotelId, active: true },
      include: {
        floor: true,
        roomType: true,
      },
      orderBy: { roomNumber: 'asc' },
    });

    const headers = [
      'RoomNumber',
      'FloorNumber',
      'FloorName',
      'RoomTypeCode',
      'OccupancyStatus',
      'CleaningStatus',
      'MaintenanceStatus',
      'SaleStatus',
      'Features',
    ];

    const rows = rooms.map((r) => [
      `"${r.roomNumber}"`,
      r.floor.floorNumber,
      `"${(r.floor.nameAr || '').replace(/"/g, '""')}"`,
      `"${r.roomType.code}"`,
      `"${r.occupancyStatus}"`,
      `"${r.cleaningStatus}"`,
      `"${r.maintenanceStatus}"`,
      `"${r.saleStatus}"`,
      `"${(r.features || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rooms-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'فشل تصدير قائمة الغرف' }, { status: 500 });
  }
}

