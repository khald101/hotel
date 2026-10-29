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
    const floorId = searchParams.get('floorId');
    const roomTypeId = searchParams.get('roomTypeId');
    const occupancyStatus = searchParams.get('occupancyStatus');
    const cleaningStatus = searchParams.get('cleaningStatus');
    const maintenanceStatus = searchParams.get('maintenanceStatus');
    const search = searchParams.get('search');

    const where: any = {
      hotelId: session.hotelId,
      active: true,
    };

    if (floorId) where.floorId = floorId;
    if (roomTypeId) where.roomTypeId = roomTypeId;
    if (occupancyStatus) where.occupancyStatus = occupancyStatus;
    if (cleaningStatus) where.cleaningStatus = cleaningStatus;
    if (maintenanceStatus) where.maintenanceStatus = maintenanceStatus;
    if (search) {
      where.roomNumber = { contains: search };
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        floor: true,
        roomType: true,
      },
      orderBy: { roomNumber: 'asc' },
    });

    const floors = await prisma.floor.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { floorNumber: 'asc' },
    });

    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId: session.hotelId, active: true },
    });

    return NextResponse.json({
      success: true,
      data: rooms,
      meta: {
        floors,
        roomTypes,
        total: rooms.length,
      },
    });
  } catch (error: any) {
    console.error('Rooms GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع بيانات الغرف' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Role check: Only ADMIN, GENERAL_MANAGER or authorized staff
    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إضافة غرف' }, { status: 403 });
    }

    const body = await req.json();
    const { roomNumber, floorId, roomTypeId, features, notes } = body;

    if (!roomNumber || !floorId || !roomTypeId) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الغرفة وتحديد الطابق ونوع الغرفة' }, { status: 400 });
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
        { error: 'هذا الطابق معطل حالياً وموقوف عن استقبال غرف جديدة وفق قواعد النظام. يرجى تفعيله أولاً من قسم إدارة الطوابق.' },
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

    // Check duplicate roomNumber
    const existing = await prisma.room.findUnique({
      where: {
        hotelId_roomNumber: {
          hotelId: session.hotelId,
          roomNumber: String(roomNumber).trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `رقم الغرفة ${roomNumber} مسجل مسبقاً في هذا الفندق` }, { status: 409 });
    }

    const room = await prisma.room.create({
      data: {
        hotelId: session.hotelId,
        roomNumber: String(roomNumber).trim(),
        floorId,
        roomTypeId,
        features: features || 'إطلالة مدينة, غير مدخنين',
        notes: notes || null,
        occupancyStatus: 'VACANT',
        cleaningStatus: 'INSPECTED_PASSED',
        maintenanceStatus: 'OPERATIONAL',
        saleStatus: 'AVAILABLE',
        active: true,
      },
      include: {
        floor: true,
        roomType: true,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_ROOM',
      entityType: 'Room',
      entityId: room.id,
      details: `تمت إضافة الغرفة ${room.roomNumber} بنجاح`,
    });

    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (error: any) {
    console.error('Room create error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ الغرفة' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { id, occupancyStatus, cleaningStatus, maintenanceStatus, saleStatus, features, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الغرفة مطلوب' }, { status: 400 });
    }

    const updateData: any = {};
    if (occupancyStatus) updateData.occupancyStatus = occupancyStatus;
    if (cleaningStatus) updateData.cleaningStatus = cleaningStatus;
    if (maintenanceStatus) updateData.maintenanceStatus = maintenanceStatus;
    if (saleStatus) updateData.saleStatus = saleStatus;
    if (features !== undefined) updateData.features = features;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        floor: true,
        roomType: true,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_ROOM',
      entityType: 'Room',
      entityId: updated.id,
      details: `تحديث بيانات وحالات الغرفة ${updated.roomNumber}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Room update error:', error);
    return NextResponse.json({ error: 'فشل تحديث بيانات الغرفة' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role !== 'ADMIN' && session.role !== 'GENERAL_MANAGER') {
      return NextResponse.json({ error: 'حذف الغرف أو تعطيلها محصور بالإدارة' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الغرفة مطلوب' }, { status: 400 });
    }

    // Safety rule 5 & 6: Check if room has history (reservations, stays, folios)
    const reservationsCount = await prisma.reservation.count({
      where: { assignedRoomId: id },
    });

    const stayCount = await prisma.stayRecord.count({
      where: { roomId: id },
    });

    if (reservationsCount > 0 || stayCount > 0) {
      // Safe deactivation / archiving instead of hard delete
      const deactivated = await prisma.room.update({
        where: { id },
        data: { active: false, saleStatus: 'OUT_OF_ORDER' },
      });

      await logAuditEvent({
        hotelId: session.hotelId,
        userId: session.userId,
        username: session.username,
        action: 'DEACTIVATE_ROOM',
        entityType: 'Room',
        entityId: id,
        details: `تم تعطيل الغرفة ${deactivated.roomNumber} وأرشفتها لوجود سجلات إقامة وحجوزات تاريخية مرتبطة بها`,
      });

      return NextResponse.json({
        success: true,
        message: 'تم إيقاف الغرفة وأرشفتها بأمان لأنها تحتوي على سجلات تاريخية.',
        archived: true,
      });
    }

    // Safe to hard delete if truly empty
    await prisma.room.delete({ where: { id } });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'DELETE_ROOM',
      entityType: 'Room',
      entityId: id,
      details: `تم حذف الغرفة نهائياً لعدم ارتباطها بأي سجلات سابقة`,
    });

    return NextResponse.json({ success: true, message: 'تم حذف الغرفة بنجاح' });
  } catch (error: any) {
    console.error('Room delete error:', error);
    return NextResponse.json({ error: 'فشل معالجة طلب حذف الغرفة' }, { status: 500 });
  }
}

