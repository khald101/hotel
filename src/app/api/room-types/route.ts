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
      where.OR = [
        { nameAr: { contains: search } },
        { nameEn: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const roomTypes = await prisma.roomType.findMany({
      where,
      include: {
        _count: {
          select: {
            rooms: true,
            reservations: true,
          },
        },
      },
      orderBy: { basePrice: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: roomTypes,
      meta: {
        total: roomTypes.length,
        activeCount: roomTypes.filter((t) => t.active).length,
        inactiveCount: roomTypes.filter((t) => !t.active).length,
      },
    });
  } catch (error: any) {
    console.error('Room types GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع أنواع الغرف والشقق' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إضافة أنواع الغرف والشقق' }, { status: 403 });
    }

    const body = await req.json();
    const {
      nameAr,
      nameEn,
      code,
      basePrice,
      maxOccupancy = 2,
      bedType = 'سرير مزدوج كبير',
      description,
      active = true,
      amenities = [],
    } = body;

    if (!nameAr || typeof nameAr !== 'string' || !nameAr.trim()) {
      return NextResponse.json({ error: 'اسم نوع الغرفة أو الشقة بالعربية مطلوب' }, { status: 400 });
    }

    const parsedPrice = parseFloat(String(basePrice));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'يرجى إدخال سعر ليلة صحيح وغير سالب' }, { status: 400 });
    }

    // Auto-generate or sanitize unique code
    let finalCode = (code || '').trim().toUpperCase();
    if (!finalCode) {
      finalCode = `TYPE-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Check duplicate code within the hotel
    const existing = await prisma.roomType.findUnique({
      where: {
        hotelId_code: {
          hotelId: session.hotelId,
          code: finalCode,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `الرمز المختصر (${finalCode}) مستخدم مسبقاً لنوع آخر في هذا الفندق.` },
        { status: 409 }
      );
    }

    const roomType = await prisma.roomType.create({
      data: {
        hotelId: session.hotelId,
        code: finalCode,
        nameAr: nameAr.trim(),
        nameEn: nameEn?.trim() || null,
        basePrice: parsedPrice,
        maxOccupancy: parseInt(String(maxOccupancy), 10) || 2,
        bedType: bedType?.trim() || 'سرير مزدوج',
        description: description?.trim() || null,
        amenities: typeof amenities === 'string' ? amenities : JSON.stringify(amenities),
        active: Boolean(active),
      },
      include: {
        _count: {
          select: { rooms: true, reservations: true },
        },
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_ROOM_TYPE',
      entityType: 'RoomType',
      entityId: roomType.id,
      details: `إنشاء نوع جديد: ${roomType.nameAr} بسعر ${roomType.basePrice} ر.س / ليلة`,
    });

    return NextResponse.json({ success: true, data: roomType }, { status: 201 });
  } catch (error: any) {
    console.error('Room type create error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ نوع الغرفة أو الشقة' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل أنواع الغرف والشقق' }, { status: 403 });
    }

    const body = await req.json();
    const { id, nameAr, nameEn, basePrice, maxOccupancy, bedType, description, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف النوع مطلوب' }, { status: 400 });
    }

    const existing = await prisma.roomType.findUnique({
      where: { id },
    });

    if (!existing || existing.hotelId !== session.hotelId) {
      return NextResponse.json({ error: 'نوع الغرفة أو الشقة غير موجود' }, { status: 404 });
    }

    const updateData: any = {};
    if (nameAr !== undefined) {
      if (!nameAr.trim()) return NextResponse.json({ error: 'اسم النوع لا يمكن أن يكون فارغاً' }, { status: 400 });
      updateData.nameAr = nameAr.trim();
    }
    if (nameEn !== undefined) updateData.nameEn = nameEn.trim() || null;
    if (basePrice !== undefined) {
      const parsedPrice = parseFloat(String(basePrice));
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: 'سعر الليلة يجب أن يكون رقماً غير سالب' }, { status: 400 });
      }
      updateData.basePrice = parsedPrice;
    }
    if (maxOccupancy !== undefined) updateData.maxOccupancy = parseInt(String(maxOccupancy), 10) || 2;
    if (bedType !== undefined) updateData.bedType = bedType.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (active !== undefined) updateData.active = Boolean(active);

    const updated = await prisma.roomType.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { rooms: true, reservations: true },
        },
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_ROOM_TYPE',
      entityType: 'RoomType',
      entityId: updated.id,
      details: `تحديث نوع الغرفة/الشقة: ${updated.nameAr} - السعر: ${updated.basePrice} ر.س - الحالة: ${updated.active ? 'مفعل' : 'معطل'}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Room type update error:', error);
    return NextResponse.json({ error: 'فشل تحديث بيانات نوع الغرفة أو الشقة' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (!['ADMIN', 'GENERAL_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'حذف أو تعطيل أنواع الوحدات محصور بالإدارة العامة' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف النوع مطلوب' }, { status: 400 });
    }

    const targetType = await prisma.roomType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rooms: true, reservations: true },
        },
      },
    });

    if (!targetType || targetType.hotelId !== session.hotelId) {
      return NextResponse.json({ error: 'النوع غير موجود' }, { status: 404 });
    }

    // Safety rule: Never delete a room type linked to existing rooms or reservations!
    const linkedCount = targetType._count.rooms + targetType._count.reservations;
    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف هذا النوع لوجود (${targetType._count.rooms}) غرف/شقق و (${targetType._count.reservations}) حجوزات مرتبطة به. يرجى تعطيل النوع بدلاً من الحذف للحفاظ على سلامة وسجلات النظام.`,
          roomsCount: targetType._count.rooms,
          reservationsCount: targetType._count.reservations,
          canDeactivate: true,
        },
        { status: 400 }
      );
    }

    await prisma.roomType.delete({ where: { id } });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'DELETE_ROOM_TYPE',
      entityType: 'RoomType',
      entityId: id,
      details: `حذف نوع الغرفة/الشقة نهائياً: ${targetType.nameAr}`,
    });

    return NextResponse.json({ success: true, message: 'تم حذف النوع بنجاح' });
  } catch (error: any) {
    console.error('Room type delete error:', error);
    return NextResponse.json({ error: 'فشل حذف نوع الغرفة أو الشقة' }, { status: 500 });
  }
}

