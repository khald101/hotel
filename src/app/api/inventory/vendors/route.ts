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

    const vendors = await prisma.vendor.findMany({
      where: { hotelId: session.hotelId },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: vendors });
  } catch (error: any) {
    console.error('Vendors GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع الموردين' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إضافة موردين' }, { status: 403 });
    }

    const body = await req.json();
    const { nameAr, contactPerson, phone, email, taxNumber, category = 'GENERAL' } = body;

    if (!nameAr) {
      return NextResponse.json({ error: 'اسم المورد بالعربية مطلوب' }, { status: 400 });
    }

    const vendor = await prisma.vendor.create({
      data: {
        hotelId: session.hotelId,
        nameAr,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        taxNumber: taxNumber || null,
        category,
        active: true,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_VENDOR',
      entityType: 'Vendor',
      entityId: vendor.id,
      details: `إضافة مورد جديد: ${vendor.nameAr} (${vendor.category})`,
    });

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error: any) {
    console.error('Vendor POST error:', error);
    return NextResponse.json({ error: 'فشل تسجيل المورد' }, { status: 500 });
  }
}

