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

    if (session.role === 'CLEANER') {
      return NextResponse.json({ error: 'غير مصرح للمنظف بالوصول إلى بيانات الحجوزات' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const date = searchParams.get('date');

    const where: any = { hotelId: session.hotelId };
    if (status) where.status = status;
    if (date) {
      where.OR = [{ checkInDate: date }, { checkOutDate: date }];
    }
    if (search) {
      where.OR = [
        { confirmationNo: { contains: search } },
        { guest: { fullNameAr: { contains: search } } },
        { guest: { nationalId: { contains: search } } },
        { guest: { phone: { contains: search } } },
      ];
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        guest: true,
        roomType: true,
        assignedRoom: {
          include: { floor: true },
        },
        folios: {
          include: { payments: true },
        },
        stayRecord: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: reservations });
  } catch (error: any) {
    console.error('Reservations GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع الحجوزات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إنشاء حجوزات' }, { status: 403 });
    }

    const body = await req.json();
    const {
      guestData, // { fullNameAr, nationalId, idType, phone, email, nationality }
      roomTypeId,
      assignedRoomId,
      checkInDate, // YYYY-MM-DD
      checkOutDate, // YYYY-MM-DD
      adultsCount = 1,
      childrenCount = 0,
      source = 'DIRECT',
      specialRequests,
      notes,
    } = body;

    if (!roomTypeId || !checkInDate || !checkOutDate || !guestData?.fullNameAr || !guestData?.nationalId) {
      return NextResponse.json({ error: 'بيانات الحجز والنزيل غير مكتملة' }, { status: 400 });
    }

    // Validate date sequence
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const nightsCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nightsCount <= 0) {
      return NextResponse.json({ error: 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول بيوم واحد على الأقل' }, { status: 400 });
    }

    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType || !roomType.active) {
      return NextResponse.json(
        { error: 'نوع الغرفة أو الشقة المحدد غير مفعل أو غير موجود' },
        { status: 400 }
      );
    }

    // Double-Booking Prevention & Strict Room Readiness Verification:
    // If a specific room is assigned, verify it is empty and completely ready (vacant, inspected, operational, available)
    if (assignedRoomId) {
      const targetRoom = await prisma.room.findUnique({
        where: { id: assignedRoomId },
      });

      if (!targetRoom) {
        return NextResponse.json({ error: 'الغرفة المحددة غير موجودة' }, { status: 404 });
      }

      const isRoomCompletelyReady =
        targetRoom.occupancyStatus === 'VACANT' &&
        targetRoom.cleaningStatus === 'INSPECTED_PASSED' &&
        targetRoom.maintenanceStatus === 'OPERATIONAL' &&
        targetRoom.saleStatus === 'AVAILABLE';

      if (!isRoomCompletelyReady) {
        return NextResponse.json(
          {
            error: `لا يمكن حجز الغرفة #${targetRoom.roomNumber} لأنها غير جاهزة بالكامل (حالتها الحالية: ${targetRoom.occupancyStatus} / ${targetRoom.cleaningStatus} / ${targetRoom.maintenanceStatus}). يسمح النظام فقط بحجز الغرف الفاضية والجاهزة والمفتشة.`,
          },
          { status: 422 }
        );
      }

      const conflictingBooking = await prisma.reservation.findFirst({
        where: {
          hotelId: session.hotelId,
          assignedRoomId: assignedRoomId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkInDate: { lt: checkOutDate } },
            { checkOutDate: { gt: checkInDate } },
          ],
        },
      });

      if (conflictingBooking) {
        return NextResponse.json(
          {
            error: `الغرفة المحددة محجوزة مسبقاً في نفس الفترة (الحجز رقم: ${conflictingBooking.confirmationNo}). يرجى اختيار غرفة أخرى أو تغيير التواريخ.`,
          },
          { status: 409 }
        );
      }
    } else {
      // Check inventory availability for the room type:
      const totalRoomsOfType = await prisma.room.count({
        where: { hotelId: session.hotelId, roomTypeId, active: true },
      });

      const overlappingCount = await prisma.reservation.count({
        where: {
          hotelId: session.hotelId,
          roomTypeId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkInDate: { lt: checkOutDate } },
            { checkOutDate: { gt: checkInDate } },
          ],
        },
      });

      if (overlappingCount >= totalRoomsOfType) {
        return NextResponse.json(
          { error: `عفواً، لا توجد غرف متاحة من نوع (${roomType.nameAr}) في الفترة المحددة.` },
          { status: 409 }
        );
      }
    }

    // Dynamic & Seasonal Pricing Calculation
    let nightlyRate = roomType.basePrice;
    let pricingRuleName: string | null = null;

    const activeRule = await prisma.pricingRule.findFirst({
      where: {
        hotelId: session.hotelId,
        active: true,
        startDate: { lte: checkInDate },
        endDate: { gte: checkOutDate },
        OR: [{ roomTypeId: roomType.id }, { roomTypeId: null }],
        minNights: { lte: nightsCount },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeRule) {
      if (activeRule.priceType === 'MULTIPLIER') {
        nightlyRate = Math.round(roomType.basePrice * activeRule.value);
      } else {
        nightlyRate = activeRule.value;
      }
      pricingRuleName = activeRule.nameAr;
    }

    const subtotal = nightlyRate * nightsCount;
    const taxAmount = Number((subtotal * 0.15).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    // Upsert Guest profile
    const guest = await prisma.guest.upsert({
      where: {
        idType_nationalId: {
          idType: guestData.idType || 'NATIONAL_ID',
          nationalId: String(guestData.nationalId).trim(),
        },
      },
      update: {
        fullNameAr: guestData.fullNameAr,
        phone: guestData.phone || '0500000000',
        email: guestData.email || null,
        nationality: guestData.nationality || 'SA',
      },
      create: {
        idType: guestData.idType || 'NATIONAL_ID',
        nationalId: String(guestData.nationalId).trim(),
        fullNameAr: guestData.fullNameAr,
        phone: guestData.phone || '0500000000',
        email: guestData.email || null,
        nationality: guestData.nationality || 'SA',
      },
    });

    const confirmationNo = `RES-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create Reservation and initial Folio in a transaction
    const [reservation, folio] = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.create({
        data: {
          confirmationNo,
          hotelId: session.hotelId,
          guestId: guest.id,
          roomTypeId,
          assignedRoomId: assignedRoomId || null,
          checkInDate,
          checkOutDate,
          nightsCount,
          adultsCount: parseInt(String(adultsCount), 10) || 1,
          childrenCount: parseInt(String(childrenCount), 10) || 0,
          nightlyRate,
          subtotal,
          taxAmount,
          totalAmount,
          status: 'CONFIRMED',
          source,
          pricingRuleName: pricingRuleName || null,
          channelRef: body.channelRef || null,
          specialRequests: specialRequests || null,
          notes: notes || null,
        },
      });

      // Update room to RESERVED if room assigned
      if (assignedRoomId) {
        await tx.room.update({
          where: { id: assignedRoomId },
          data: { occupancyStatus: 'RESERVED' },
        });
      }

      // Create Folio
      const fol = await tx.folio.create({
        data: {
          folioNumber: `FOL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          hotelId: session.hotelId,
          guestId: guest.id,
          reservationId: res.id,
          status: 'OPEN',
          totalCharges: totalAmount,
          totalPayments: 0,
          balance: totalAmount,
        },
      });

      // Add room charge item
      await tx.folioItem.create({
        data: {
          folioId: fol.id,
          category: 'ROOM_CHARGE',
          description: `إقامة ${roomType.nameAr} (${nightsCount} ليالٍ) من ${checkInDate} إلى ${checkOutDate}`,
          quantity: nightsCount,
          unitPrice: nightlyRate,
          taxAmount,
          totalAmount,
          postedBy: session.username,
        },
      });

      return [res, fol];
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_RESERVATION',
      entityType: 'Reservation',
      entityId: reservation.id,
      details: `إنشاء حجز جديد رقم ${reservation.confirmationNo} للنزيل ${guest.fullNameAr} بمبلغ ${totalAmount} ر.س`,
    });

    return NextResponse.json({
      success: true,
      data: {
        reservation,
        folio,
      },
    });
  } catch (error: any) {
    console.error('Reservation create error:', error);
    return NextResponse.json({ error: 'فشل إتمام الحجز' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id, status, cancellationReason } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { assignedRoom: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'الحجز غير موجود' }, { status: 404 });
    }

    // If cancelling, release assigned room if not checked in
    if (status === 'CANCELLED' && existing.assignedRoomId && existing.status !== 'CHECKED_IN') {
      await prisma.room.update({
        where: { id: existing.assignedRoomId },
        data: { occupancyStatus: 'VACANT' },
      });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status,
        notes: cancellationReason ? `${existing.notes || ''} [سبب الإلغاء: ${cancellationReason}]` : existing.notes,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_RESERVATION_STATUS',
      entityType: 'Reservation',
      entityId: id,
      details: `تحديث حالة الحجز ${existing.confirmationNo} إلى ${status}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Reservation status update error:', error);
    return NextResponse.json({ error: 'فشل تحديث حالة الحجز' }, { status: 500 });
  }
}

