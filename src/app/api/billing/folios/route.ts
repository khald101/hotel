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
      return NextResponse.json({ error: 'غير مصرح للمنظف بالوصول إلى الفواتير والحسابات المالية' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const folioId = searchParams.get('id');
    const status = searchParams.get('status');

    if (folioId) {
      const folio = await prisma.folio.findUnique({
        where: { id: folioId },
        include: {
          guest: true,
          reservation: { include: { assignedRoom: true, roomType: true } },
          items: { orderBy: { postedAt: 'desc' } },
          payments: { orderBy: { createdAt: 'desc' } },
          invoices: true,
        },
      });

      if (!folio) {
        return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: folio });
    }

    const where: any = { hotelId: session.hotelId };
    if (status) where.status = status;

    const folios = await prisma.folio.findMany({
      where,
      include: {
        guest: true,
        reservation: { include: { assignedRoom: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: folios });
  } catch (error: any) {
    console.error('Folios GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع حسابات الفوترة' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { folioId, category = 'SERVICE', description, quantity = 1, unitPrice } = body;

    if (!folioId || !description || unitPrice === undefined) {
      return NextResponse.json({ error: 'بيانات الرسوم غير مكتملة' }, { status: 400 });
    }

    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
    });

    if (!folio || folio.status === 'CLOSED') {
      return NextResponse.json({ error: 'لا يمكن إضافة رسوم لحساب مغلق أو غير موجود' }, { status: 400 });
    }

    const qty = parseInt(String(quantity), 10) || 1;
    const price = parseFloat(String(unitPrice));
    const sub = qty * price;
    const tax = Number((sub * 0.15).toFixed(2));
    const total = Number((sub + tax).toFixed(2));

    const [item, updatedFolio] = await prisma.$transaction([
      prisma.folioItem.create({
        data: {
          folioId,
          category,
          description,
          quantity: qty,
          unitPrice: price,
          taxAmount: tax,
          totalAmount: total,
          postedBy: session.username,
        },
      }),
      prisma.folio.update({
        where: { id: folioId },
        data: {
          totalCharges: { increment: total },
          balance: { increment: total },
        },
      }),
    ]);

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'ADD_FOLIO_CHARGE',
      entityType: 'Folio',
      entityId: folioId,
      details: `إضافة رسم ${description} بقيمة ${total} ر.س إلى الحساب ${folio.folioNumber}`,
    });

    return NextResponse.json({ success: true, data: { item, folio: updatedFolio } });
  } catch (error: any) {
    console.error('Folio add charge error:', error);
    return NextResponse.json({ error: 'فشل إضافة الرسم إلى الحساب' }, { status: 500 });
  }
}

