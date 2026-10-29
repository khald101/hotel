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

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إنشاء الغرف الجماعية' }, { status: 403 });
    }

    const body = await req.json();
    const {
      floorId,
      roomTypeId,
      startNumber, // e.g. 201
      count, // e.g. 50
      prefix = '',
      action = 'commit', // 'preview' or 'commit'
      features = 'إطلالة مدينة, غير مدخنين',
    } = body;

    const parsedStart = parseInt(startNumber, 10);
    const parsedCount = parseInt(count, 10);

    if (isNaN(parsedStart) || isNaN(parsedCount) || parsedCount <= 0 || parsedCount > 500) {
      return NextResponse.json({ error: 'رقم البداية أو عدد الغرف غير صحيح (الحد الأقصى 500 غرفة)' }, { status: 400 });
    }

    if (!floorId || !roomTypeId) {
      return NextResponse.json({ error: 'يرجى اختيار الطابق ونوع الغرفة' }, { status: 400 });
    }

    // Verify floor existence and active status
    const targetFloor = await prisma.floor.findUnique({
      where: { id: floorId },
    });

    if (!targetFloor || targetFloor.hotelId !== session.hotelId) {
      return NextResponse.json({ error: 'الطابق المحدد غير موجود في هذا الفندق' }, { status: 404 });
    }

    if (!targetFloor.active) {
      return NextResponse.json(
        { error: 'هذا الطابق معطل حالياً وموقوف عن استقبال غرف جديدة. يرجى تفعيله أولاً من قسم إدارة الطوابق.' },
        { status: 400 }
      );
    }

    // Verify room type existence and active status
    const targetRoomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!targetRoomType || targetRoomType.hotelId !== session.hotelId) {
      return NextResponse.json({ error: 'نوع الغرفة أو الشقة المحدد غير موجود في هذا الفندق' }, { status: 404 });
    }

    if (!targetRoomType.active) {
      return NextResponse.json(
        { error: 'نوع الغرفة أو الشقة المحدد معطل حالياً وموقوف عن الاستخدام وفق قواعد النظام. يرجى تفعيله أولاً من قسم أنواع الغرف والشقق.' },
        { status: 400 }
      );
    }

    // Generate room numbers
    const generatedNumbers: string[] = [];
    for (let i = 0; i < parsedCount; i++) {
      const num = parsedStart + i;
      generatedNumbers.push(`${prefix}${num}`);
    }

    // Fetch existing rooms in this hotel to detect collisions
    const existingCollisions = await prisma.room.findMany({
      where: {
        hotelId: session.hotelId,
        roomNumber: { in: generatedNumbers },
      },
      select: { roomNumber: true },
    });

    const collisionSet = new Set(existingCollisions.map((r) => r.roomNumber));
    const conflicts = generatedNumbers.filter((num) => collisionSet.has(num));

    // If PREVIEW MODE: return preview list and conflicts
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        preview: {
          totalToCreate: generatedNumbers.length,
          generatedNumbers,
          conflicts,
          hasConflicts: conflicts.length > 0,
        },
      });
    }

    // If COMMIT MODE: Strict transactional safety: if conflicts exist, reject atomic operation!
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: `تعذر إنشاء الغرف الجماعية لوجود ${conflicts.length} غرفة مسجلة مسبقاً: (${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? '...' : ''}). تم إيقاف العملية للحفاظ على سلامة البيانات.`,
          conflicts,
        },
        { status: 409 }
      );
    }

    // Execute atomic batch creation
    const createdRooms = await prisma.$transaction(
      generatedNumbers.map((roomNum) =>
        prisma.room.create({
          data: {
            hotelId: session.hotelId,
            floorId,
            roomTypeId,
            roomNumber: roomNum,
            occupancyStatus: 'VACANT',
            cleaningStatus: 'INSPECTED_PASSED',
            maintenanceStatus: 'OPERATIONAL',
            saleStatus: 'AVAILABLE',
            features,
            active: true,
          },
        })
      )
    );

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'BULK_CREATE_ROOMS',
      entityType: 'Room',
      entityId: `BULK-${parsedStart}-${parsedStart + parsedCount - 1}`,
      details: `تم إنشاء ${createdRooms.length} غرفة بنجاح من رقم ${parsedStart} إلى ${parsedStart + parsedCount - 1}`,
    });

    return NextResponse.json({
      success: true,
      message: `تم إنشاء ${createdRooms.length} غرفة دفعة واحدة بنجاح!`,
      count: createdRooms.length,
    });
  } catch (error: any) {
    console.error('Bulk rooms error:', error);
    return NextResponse.json({ error: 'فشل تنفيذ عملية إنشاء الغرف الجماعية' }, { status: 500 });
  }
}

