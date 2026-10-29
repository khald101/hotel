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

    const outlets = await prisma.restaurantOutlet.findMany({
      where: { hotelId: session.hotelId, active: true },
      include: {
        categories: {
          include: {
            items: { where: { available: true } },
          },
        },
      },
    });

    const recentOrders = await prisma.posOrder.findMany({
      where: { outlet: { hotelId: session.hotelId } },
      include: { items: true, outlet: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, outlets, recentOrders });
  } catch (error: any) {
    console.error('POS GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع بيانات نقاط البيع والمطاعم' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const {
      outletId,
      targetType = 'DINE_IN', // DINE_IN, ROOM_CHARGE, TAKEAWAY
      roomNumber,
      paymentMode = 'CASH', // CASH, CARD, ROOM_FOLIO
      items, // array of { menuItemId, name, quantity, unitPrice, totalPrice }
    } = body;

    if (!outletId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'بيانات الطلب وقائمة الأصناف مطلوبة' }, { status: 400 });
    }

    let subtotal = 0;
    for (const it of items) {
      subtotal += (it.quantity || 1) * (it.unitPrice || 0);
    }
    const taxAmount = Number((subtotal * 0.15).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    const orderNumber = `POS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    let targetFolioId: string | null = null;
    let guestName: string | null = null;

    // If charge to room:
    if (paymentMode === 'ROOM_FOLIO' || targetType === 'ROOM_CHARGE') {
      if (!roomNumber) {
        return NextResponse.json({ error: 'يرجى تحديد رقم الغرفة لتحميل الفاتورة على حساب النزيل' }, { status: 400 });
      }

      const activeStay = await prisma.stayRecord.findFirst({
        where: {
          room: { hotelId: session.hotelId, roomNumber: String(roomNumber) },
          status: 'ACTIVE',
        },
        include: {
          guest: true,
          reservation: {
            include: { folios: { where: { status: 'OPEN' } } },
          },
        },
      });

      if (!activeStay || !activeStay.reservation.folios[0]) {
        return NextResponse.json(
          { error: `لا يوجد نزيل مسكن حالياً في الغرفة ${roomNumber} بحساب مفتوح.` },
          { status: 404 }
        );
      }

      const folio = activeStay.reservation.folios[0];
      targetFolioId = folio.id;
      guestName = activeStay.guest.fullNameAr;

      // Add to Folio
      await prisma.$transaction([
        prisma.folioItem.create({
          data: {
            folioId: folio.id,
            category: 'RESTAURANT',
            description: `طلب مطعم (${orderNumber}): ${items.map((i: any) => `${i.name}x${i.quantity}`).join(', ')}`,
            quantity: 1,
            unitPrice: subtotal,
            taxAmount,
            totalAmount,
            postedBy: session.username,
          },
        }),
        prisma.folio.update({
          where: { id: folio.id },
          data: {
            totalCharges: { increment: totalAmount },
            balance: { increment: totalAmount },
          },
        }),
      ]);
    }

    const order = await prisma.posOrder.create({
      data: {
        orderNumber,
        outletId,
        targetType,
        roomNumber: roomNumber ? String(roomNumber) : null,
        guestName,
        subtotal,
        taxAmount,
        totalAmount,
        status: 'COMPLETED',
        paymentMode,
        folioId: targetFolioId,
        items: {
          create: items.map((i: any) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            quantity: i.quantity || 1,
            unitPrice: i.unitPrice,
            totalPrice: (i.quantity || 1) * i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'POS_ORDER_CREATED',
      entityType: 'PosOrder',
      entityId: order.id,
      details: `إنشاء طلب مطعم ${orderNumber} بمبلغ ${totalAmount} ر.س (${paymentMode})`,
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error('POS order error:', error);
    return NextResponse.json({ error: 'فشل معالجة طلب المطعم' }, { status: 500 });
  }
}

