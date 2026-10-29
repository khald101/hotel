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

    const rules = await prisma.pricingRule.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { startDate: 'asc' },
    });

    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId: session.hotelId, active: true },
    });

    return NextResponse.json({ success: true, data: rules, roomTypes });
  } catch (error: any) {
    console.error('Pricing rules GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع قواعد التسعير' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (!['ADMIN', 'GENERAL_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'إدارة وتعديل الأسعار محصورة بالإدارة العامة' }, { status: 403 });
    }

    const body = await req.json();
    const { nameAr, nameEn, roomTypeId, startDate, endDate, priceType = 'MULTIPLIER', value, minNights = 1 } = body;

    if (!nameAr || !startDate || !endDate || value === undefined) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية لقاعدة التسعير مطلوبة' }, { status: 400 });
    }

    const rule = await prisma.pricingRule.create({
      data: {
        hotelId: session.hotelId,
        nameAr,
        nameEn: nameEn || null,
        roomTypeId: roomTypeId || null,
        startDate,
        endDate,
        priceType,
        value: parseFloat(String(value)),
        minNights: parseInt(String(minNights), 10) || 1,
        active: true,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_PRICING_RULE',
      entityType: 'PricingRule',
      entityId: rule.id,
      details: `إنشاء قاعدة تسعير مواسم: ${rule.nameAr} (${startDate} إلى ${endDate}) بقيمة ${value}`,
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error: any) {
    console.error('Pricing rule create error:', error);
    return NextResponse.json({ error: 'فشل إنشاء قاعدة التسعير' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (!['ADMIN', 'GENERAL_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'تعديل قواعد الأسعار محصور بالإدارة' }, { status: 403 });
    }

    const body = await req.json();
    const { id, active, value, startDate, endDate, nameAr } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف القاعدة مطلوب' }, { status: 400 });
    }

    const updateData: any = {};
    if (active !== undefined) updateData.active = Boolean(active);
    if (value !== undefined) updateData.value = parseFloat(String(value));
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (nameAr) updateData.nameAr = nameAr;

    const updated = await prisma.pricingRule.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_PRICING_RULE',
      entityType: 'PricingRule',
      entityId: id,
      details: `تحديث قاعدة التسعير ${updated.nameAr} (نشط: ${updated.active})`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Pricing rule update error:', error);
    return NextResponse.json({ error: 'فشل تحديث قاعدة التسعير' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (!['ADMIN', 'GENERAL_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'حذف قواعد الأسعار محصور بالإدارة' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف القاعدة مطلوب' }, { status: 400 });
    }

    await prisma.pricingRule.delete({ where: { id } });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'DELETE_PRICING_RULE',
      entityType: 'PricingRule',
      entityId: id,
      details: `حذف قاعدة تسعير المواسم`,
    });

    return NextResponse.json({ success: true, message: 'تم حذف قاعدة التسعير بنجاح' });
  } catch (error: any) {
    console.error('Pricing rule delete error:', error);
    return NextResponse.json({ error: 'فشل حذف قاعدة التسعير' }, { status: 500 });
  }
}

