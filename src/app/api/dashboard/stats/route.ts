import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    // If not authenticated, return 401
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Role-based filtering: Cleaners should NOT access general executive dashboard!
    if (session.role === 'CLEANER') {
      return NextResponse.json({ error: 'غير مصرح لهذا الدور بالاطلاع على المؤشرات التنفيذية' }, { status: 403 });
    }

    const hotelId = session.hotelId;

    // 1. Fetch Rooms Data
    const rooms = await prisma.room.findMany({
      where: { hotelId, active: true },
      select: {
        id: true,
        roomNumber: true,
        occupancyStatus: true,
        cleaningStatus: true,
        maintenanceStatus: true,
        saleStatus: true,
      },
    });

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.occupancyStatus === 'OCCUPIED').length;
    const reservedArrival = rooms.filter((r) => r.occupancyStatus === 'RESERVED').length;
    const departedNeedsCleaning = rooms.filter((r) => r.cleaningStatus === 'PENDING_CLEANING').length;
    const inProgressCleaning = rooms.filter((r) => r.cleaningStatus === 'CLEANING_IN_PROGRESS').length;
    const pendingInspection = rooms.filter((r) => r.cleaningStatus === 'PENDING_INSPECTION').length;
    const readyRooms = rooms.filter(
      (r) =>
        r.occupancyStatus === 'VACANT' &&
        r.cleaningStatus === 'INSPECTED_PASSED' &&
        r.maintenanceStatus === 'OPERATIONAL' &&
        r.saleStatus === 'AVAILABLE'
    ).length;
    const underMaintenance = rooms.filter(
      (r) => r.maintenanceStatus === 'UNDER_MAINTENANCE' || r.saleStatus === 'OUT_OF_ORDER'
    ).length;
    const availableForSale = rooms.filter((r) => r.saleStatus === 'AVAILABLE').length;

    // Occupancy Rate
    const occupancyRate = totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(1)) : 0;

    // 2. Financial Metrics: Invoices & Payments & Folios
    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        folio: { hotelId },
      },
      select: { amount: true },
    });
    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    const folios = await prisma.folio.findMany({
      where: { hotelId, status: 'OPEN' },
      select: { totalCharges: true, totalPayments: true, balance: true },
    });
    const totalOutstanding = folios.reduce((acc, f) => acc + Math.max(0, f.balance), 0);

    // Folio items room revenue
    const folioItems = await prisma.folioItem.findMany({
      where: {
        folio: { hotelId },
      },
      select: { category: true, totalAmount: true },
    });

    const roomRevenue = folioItems
      .filter((i) => i.category === 'ROOM_CHARGE')
      .reduce((acc, i) => acc + i.totalAmount, 0);

    const posRevenue = folioItems
      .filter((i) => i.category === 'RESTAURANT' || i.category === 'MINIBAR')
      .reduce((acc, i) => acc + i.totalAmount, 0);

    // ADR = Room Revenue / Occupied Rooms (or booked nights)
    const adr = occupiedRooms > 0 ? Math.round(roomRevenue / occupiedRooms) : 0;
    // RevPAR = Total Room Revenue / Total Available Rooms
    const revpar = totalRooms > 0 ? Math.round(roomRevenue / totalRooms) : 0;

    // 3. Operational Counts: Today's arrivals / departures
    const todayStr = new Date().toISOString().split('T')[0];
    const todayArrivals = await prisma.reservation.count({
      where: {
        hotelId,
        checkInDate: todayStr,
        status: { in: ['CONFIRMED', 'ARRIVED'] },
      },
    });

    const todayDepartures = await prisma.reservation.count({
      where: {
        hotelId,
        checkOutDate: todayStr,
        status: { in: ['CHECKED_IN'] },
      },
    });

    // 4. Tasks & Tickets
    const openCleaningTasks = await prisma.housekeepingTask.count({
      where: {
        room: { hotelId },
        status: { in: ['PENDING', 'IN_PROGRESS', 'PENDING_INSPECTION'] },
      },
    });

    const openMaintenanceTickets = await prisma.maintenanceTicket.count({
      where: {
        room: { hotelId },
        status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_PARTS'] },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRooms,
        availableForSale,
        occupiedRooms,
        reservedArrival,
        departedNeedsCleaning,
        inProgressCleaning,
        pendingInspection,
        readyRooms,
        underMaintenance,
        occupancyRate,
        adr,
        revpar,
        roomRevenue,
        posRevenue,
        totalCollected,
        totalOutstanding,
        todayArrivals,
        todayDepartures,
        openCleaningTasks,
        openMaintenanceTickets,
      },
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'فشل استرجاع المؤشرات التنفيذية' }, { status: 500 });
  }
}
