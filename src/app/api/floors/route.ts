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
    const search = searchParams.get('search');
    const activeFilter = searchParams.get('active');

    const where: any = {
      hotelId: session.hotelId,
    };

    if (activeFilter === 'true') where.active = true;
    if (activeFilter === 'false') where.active = false;

    if (search) {
      const parsedNum = parseInt(search, 10);
      where.OR = [
        { nameAr: { contains: search } },
        { nameEn: { contains: search } },
        { description: { contains: search } },
        ...(!isNaN(parsedNum) ? [{ floorNumber: parsedNum }] : []),
      ];
    }

    const floors = await prisma.floor.findMany({
      where,
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { floorNumber: 'asc' },
    });

    const hotel = await prisma.hotel.findUnique({
      where: { id: session.hotelId },
      select: { id: true, nameAr: true, nameEn: true, code: true },
    });

    return NextResponse.json({
      success: true,
      data: floors,
      hotel,
      meta: {
        total: floors.length,
        activeCount: floors.filter((f) => f.active).length,
        inactiveCount: floors.filter((f) => !f.active).length,
      },
    });
  } catch (error: any) {
    console.error('Floors GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع بيانات الطوابق' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إنشاء الطوابق' }, { status: 403 });
    }

    const body = await req.json();
    const { floorNumber, nameAr, nameEn, description, active = true } = body;

    const parsedNumber = parseInt(String(floorNumber), 10);
    if (isNaN(parsedNumber)) {
      return NextResponse.json({ error: 'يرجى إدخال رقم طابق صحيح (مثال: -1, 0, 1, 2)' }, { status: 400 });
    }

    if (!nameAr || typeof nameAr !== 'string' || !nameAr.trim()) {
      return NextResponse.json({ error: 'اسم الطابق بالعربية مطلوب' }, { status: 400 });
    }

    // Safety rule: Prevent duplicate floor number within the hotel
    const existing = await prisma.floor.findUnique({
      where: {
        hotelId_floorNumber: {
          hotelId: session.hotelId,
          floorNumber: parsedNumber,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `الطابق رقم (${parsedNumber}) مسجل مسبقاً في هذا الفندق. لا يمكن إنشاء طابقين بنفس الرقم.` },
        { status: 409 }
      );
    }

    const floor = await prisma.floor.create({
      data: {
        hotelId: session.hotelId,
        floorNumber: parsedNumber,
        nameAr: nameAr.trim(),
        nameEn: nameEn?.trim() || `Floor ${parsedNumber}`,
        description: description?.trim() || null,
        active: Boolean(active),
      },
      include: {
        _count: { select: { rooms: true } },
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_FLOOR',
      entityType: 'Floor',
      entityId: floor.id,
      details: `تم إنشاء الطابق رقم ${floor.floorNumber} (${floor.nameAr}) بنجاح`,
    });

    return NextResponse.json({ success: true, data: floor }, { status: 201 });
  } catch (error: any) {
    console.error('Floor create error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ الطابق' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل الطوابق' }, { status: 403 });
    }

    const body = await req.json();
    const { id, floorNumber, nameAr, nameEn, description, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الطابق مطلوب' }, { status: 400 });
    }

    const existing = await prisma.floor.findUnique({
      where: { id },
      include: { _count: { select: { rooms: true } } },
    });

    if (!existing || existing.hotelId !== session.hotelId) {
      return NextResponse.json({ error: 'الطابق غير موجود في هذا الفندق' }, { status: 404 });
    }

    const updateData: any = {};

    if (floorNumber !== undefined) {
      const parsedNumber = parseInt(String(floorNumber), 10);
      if (isNaN(parsedNumber)) {
        return NextResponse.json({ error: 'رقم الطابق غير صحيح' }, { status: 400 });
      }

      if (parsedNumber !== existing.floorNumber) {
        // Check duplicate
        const duplicate = await prisma.floor.findUnique({
          where: {
            hotelId_floorNumber: {
              hotelId: session.hotelId,
              floorNumber: parsedNumber,
            },
          },
        });

        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { error: `الرقم (${parsedNumber}) مستخدم بالفعل لطابق آخر في هذا الفندق.` },
            { status: 409 }
          );
        }
        updateData.floorNumber = parsedNumber;
      }
    }

    if (nameAr !== undefined) updateData.nameAr = nameAr.trim();
    if (nameEn !== undefined) updateData.nameEn = nameEn.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (active !== undefined) updateData.active = Boolean(active);

    const updated = await prisma.floor.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { rooms: true } },
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_FLOOR',
      entityType: 'Floor',
      entityId: updated.id,
      details: `تم تحديث بيانات الطابق ${updated.floorNumber} (${updated.nameAr})`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Floor update error:', error);
    return NextResponse.json({ error: 'فشل تحديث بيانات الطابق' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role !== 'ADMIN' && session.role !== 'GENERAL_MANAGER') {
      return NextResponse.json({ error: 'حذف الطوابق محصور بالمسؤولين فقط' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الطابق مطلوب' }, { status: 400 });
    }

    const floor = await prisma.floor.findUnique({
      where: { id },
      include: { _count: { select: { rooms: true } } },
    });

    if (!floor || floor.hotelId !== session.hotelId) {
      return NextResponse.json({ error: 'الطابق غير موجود' }, { status: 404 });
    }

    // Safety rule: Never delete a floor with rooms linked to it!
    if (floor._count.rooms > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف هذا الطابق لوجود (${floor._count.rooms}) غرفة مرتبطة به. يرجى نقل أو حذف الغرف المرتبطة أولاً لحماية سلامة البيانات.`,
          roomsCount: floor._count.rooms,
        },
        { status: 400 }
      );
    }

    await prisma.floor.delete({ where: { id } });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'DELETE_FLOOR',
      entityType: 'Floor',
      entityId: id,
      details: `تم حذف الطابق رقم ${floor.floorNumber} (${floor.nameAr}) بنجاح`,
    });

    return NextResponse.json({ success: true, message: 'تم حذف الطابق بنجاح' });
  } catch (error: any) {
    console.error('Floor delete error:', error);
    return NextResponse.json({ error: 'فشل حذف الطابق' }, { status: 500 });
  }
}

