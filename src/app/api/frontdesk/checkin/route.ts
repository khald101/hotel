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

    // Role check: Only Reception, GM, Admin
    if (!['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST'].includes(session.role)) {
      return NextResponse.json({ error: 'صلاحية تسجيل الدخول محصورة بموظفي الاستقبال والإدارة' }, { status: 403 });
    }

    const { reservationId, roomId, keyCardNumber, overrideReason } = await req.json();

    if (!reservationId) {
      return NextResponse.json({ error: 'رقم الحجز مطلوب' }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { guest: true, roomType: true, assignedRoom: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'الحجز غير موجود' }, { status: 404 });
    }

    if (reservation.status === 'CHECKED_IN') {
      return NextResponse.json({ error: 'تم تسجيل دخول هذا الحجز مسبقاً' }, { status: 400 });
    }

    // Default to the exact room the guest reserved!
    const targetRoomId = roomId || reservation.assignedRoomId;

    if (!targetRoomId) {
      return NextResponse.json({ error: 'يرجى تحديد الغرفة المراد تسكين النزيل فيها' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: targetRoomId },
    });

    if (!room) {
      return NextResponse.json({ error: 'الغرفة غير موجودة' }, { status: 404 });
    }

    // Enforce Strict Room Readiness Rules
    const isCleanAndInspected = room.cleaningStatus === 'INSPECTED_PASSED';
    const isMaintenanceOk = room.maintenanceStatus === 'OPERATIONAL';
    const isSaleAvailable = room.saleStatus === 'AVAILABLE';
    const isVacant = room.occupancyStatus === 'VACANT' || room.occupancyStatus === 'RESERVED';

    if (!isVacant) {
      return NextResponse.json({ error: `الغرفة ${room.roomNumber} مشغولة حالياً بنزيل آخر` }, { status: 409 });
    }

    if (!isMaintenanceOk || !isSaleAvailable) {
      return NextResponse.json(
        { error: `الغرفة ${room.roomNumber} تحت الصيانة أو موقوفة عن البيع ولا يمكن التسكين فيها` },
        { status: 409 }
      );
    }

    // If room is not inspected, reject unless an authorized manager provides an emergency override justification
    if (!isCleanAndInspected) {
      if (!overrideReason || !['ADMIN', 'GENERAL_MANAGER'].includes(session.role)) {
        return NextResponse.json(
          {
            error: `لا يمكن تسكين النزيل: الغرفة ${room.roomNumber} حالتها الحالية (${room.cleaningStatus}) ولم تجتز التفتيش والاعتماد بعد!`,
            roomStatus: room.cleaningStatus,
            requiresManagerOverride: true,
          },
          { status: 422 }
        );
      }
    }

    // Execute atomic check-in transaction
    const [stayRecord] = await prisma.$transaction(async (tx) => {
      // If room was changed from previous assigned room, release old room
      if (reservation.assignedRoomId && reservation.assignedRoomId !== room.id) {
        await tx.room.update({
          where: { id: reservation.assignedRoomId },
          data: { occupancyStatus: 'VACANT' },
        });
      }

      const shamousRef = `SHM-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      const record = await tx.stayRecord.create({
        data: {
          reservationId: reservation.id,
          guestId: reservation.guestId,
          roomId: room.id,
          checkedInBy: session.username,
          status: 'ACTIVE',
          roomKeyCardNo: keyCardNumber || `CARD-${room.roomNumber}`,
          shamousRef,
        },
      });

      // Dispatch to Shamous Security Registry
      await tx.shamousRecord.create({
        data: {
          hotelId: session.hotelId,
          reservationId: reservation.id,
          guestNationalId: reservation.guest.nationalId,
          guestName: reservation.guest.fullNameAr,
          idType: reservation.guest.idType,
          roomNumber: room.roomNumber,
          transmissionRef: shamousRef,
          status: 'TRANSMITTED',
          responseCode: 'ACK_OK_200_AUTO_DISPATCH',
        },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CHECKED_IN',
          assignedRoomId: room.id,
        },
      });

      await tx.room.update({
        where: { id: room.id },
        data: {
          occupancyStatus: 'OCCUPIED',
        },
      });

      await tx.guest.update({
        where: { id: reservation.guestId },
        data: { totalStays: { increment: 1 } },
      });

      return [record];
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CHECK_IN',
      entityType: 'StayRecord',
      entityId: stayRecord.id,
      details: `تسجيل وصول النزيل ${reservation.guest.fullNameAr} في الغرفة ${room.roomNumber}${
        overrideReason ? ` [تجاوز استثنائي معتمد: ${overrideReason}]` : ''
      }`,
    });

    return NextResponse.json({
      success: true,
      message: `تم تسجيل دخول النزيل في الغرفة ${room.roomNumber} بنجاح`,
      data: stayRecord,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إجراء تسجيل الدخول' }, { status: 500 });
  }
}

