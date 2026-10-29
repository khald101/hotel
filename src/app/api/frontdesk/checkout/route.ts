import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (!['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST'].includes(session.role)) {
      return NextResponse.json({ error: 'صلاحية تسجيل المغادرة محصورة بموظفي الاستقبال والإدارة' }, { status: 403 });
    }

    const { reservationId, forceCheckout = false } = await req.json();

    if (!reservationId) {
      return NextResponse.json({ error: 'معرف الحجز مطلوب' }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: true,
        assignedRoom: true,
        stayRecord: true,
        folios: {
          include: { items: true, payments: true },
        },
      },
    });

    if (!reservation || !reservation.assignedRoomId || !reservation.assignedRoom) {
      return NextResponse.json({ error: 'الحجز أو الغرفة المسندة غير موجودة' }, { status: 404 });
    }

    if (reservation.status !== 'CHECKED_IN') {
      return NextResponse.json({ error: 'الحجز ليس في حالة إقامة حالية' }, { status: 400 });
    }

    // Check Folio Balance
    const mainFolio = reservation.folios[0];
    if (mainFolio && mainFolio.balance > 0.01 && !forceCheckout) {
      return NextResponse.json(
        {
          error: `يوجد رصيد متبقٍ مستحق على حساب الغرفة (${mainFolio.balance.toFixed(2)} ر.س). يرجى تسوية الحساب أولاً أو تأكيد المغادرة الاستثنائية.`,
          balance: mainFolio.balance,
          folioId: mainFolio.id,
          requiresSettlement: true,
        },
        { status: 422 }
      );
    }

    const room = reservation.assignedRoom;

    // Transaction: Checkout stay, mark room dirty, create housekeeping task
    const taskNumber = `HSK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await prisma.$transaction([
      // Close stay record
      prisma.stayRecord.updateMany({
        where: { reservationId: reservation.id },
        data: {
          actualCheckOut: new Date(),
          checkedOutBy: session.username,
          status: 'COMPLETED',
        },
      }),
      // Update reservation
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CHECKED_OUT' },
      }),
      // Set room to VACANT & PENDING_CLEANING (Never mark ready directly!)
      prisma.room.update({
        where: { id: room.id },
        data: {
          occupancyStatus: 'VACANT',
          cleaningStatus: 'PENDING_CLEANING',
        },
      }),
      // Automatically generate a cleaning task for housekeeping team
      prisma.housekeepingTask.create({
        data: {
          taskNumber,
          roomId: room.id,
          priority: 'HIGH',
          status: 'PENDING',
          cleanerNotes: `مغادرة مؤكدة للنزيل: ${reservation.guest.fullNameAr} (حجز ${reservation.confirmationNo})`,
        },
      }),
      // Close folio if balance is zero
      ...(mainFolio && mainFolio.balance <= 0.01
        ? [
            prisma.folio.update({
              where: { id: mainFolio.id },
              data: { status: 'CLOSED' },
            }),
          ]
        : []),
    ]);

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CHECK_OUT',
      entityType: 'Reservation',
      entityId: reservation.id,
      details: `تسجيل مغادرة النزيل ${reservation.guest.fullNameAr} من الغرفة ${room.roomNumber}، وتحويل الغرفة إلى (تحتاج تنظيف) وإسناد مهمة التدبير الفندقي ${taskNumber}`,
    });

    return NextResponse.json({
      success: true,
      message: `تم تسجيل مغادرة الغرفة ${room.roomNumber} بنجاح، وتحويلها للتدبير الفندقي للتنظيف والتفتيش.`,
      taskNumber,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'فشل إتمام تسجيل المغادرة' }, { status: 500 });
  }
}
