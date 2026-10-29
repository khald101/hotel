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

    const pos = await prisma.purchaseOrder.findMany({
      where: { hotelId: session.hotelId },
      include: {
        vendor: true,
        items: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const vendors = await prisma.vendor.findMany({
      where: { hotelId: session.hotelId, active: true },
      orderBy: { nameAr: 'asc' },
    });

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { hotelId: session.hotelId, active: true },
      orderBy: { nameAr: 'asc' },
    });

    return NextResponse.json({ success: true, data: pos, vendors, inventoryItems });
  } catch (error: any) {
    console.error('PO GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع أوامر الشراء' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER' || session.role === 'RESTAURANT_STAFF') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إنشاء أوامر شراء' }, { status: 403 });
    }

    const body = await req.json();
    const { vendorId, notes, items } = body;

    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'يرجى تحديد المورد وقائمة الأصناف المطلوبة' }, { status: 400 });
    }

    let totalAmount = 0;
    const validatedItems = items.map((it: any) => {
      const qty = parseInt(String(it.quantity), 10) || 1;
      const cost = parseFloat(String(it.unitCost)) || 0;
      const lineTotal = qty * cost;
      totalAmount += lineTotal;
      return {
        description: it.description || 'صنف مشتريات',
        quantity: qty,
        unitCost: cost,
        totalCost: lineTotal,
        inventoryItemId: it.inventoryItemId || null,
      };
    });

    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        hotelId: session.hotelId,
        vendorId,
        status: 'ORDERED',
        totalAmount,
        notes: notes || null,
        items: {
          create: validatedItems,
        },
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_PURCHASE_ORDER',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      details: `إنشاء أمر شراء رقم ${poNumber} من المورد ${po.vendor.nameAr} بقيمة ${totalAmount} ر.س`,
    });

    return NextResponse.json({ success: true, data: po }, { status: 201 });
  } catch (error: any) {
    console.error('PO POST error:', error);
    return NextResponse.json({ error: 'فشل إنشاء أمر الشراء' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'معرف أمر الشراء والحالة مطلوبان' }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, vendor: true },
    });

    if (!po) {
      return NextResponse.json({ error: 'أمر الشراء غير موجود' }, { status: 404 });
    }

    // If changing to RECEIVED, automatically add to inventory items!
    if (status === 'RECEIVED' && po.status !== 'RECEIVED') {
      await prisma.$transaction(async (tx) => {
        await tx.purchaseOrder.update({
          where: { id },
          data: { status: 'RECEIVED', deliveryDate: new Date() },
        });

        for (const item of po.items) {
          if (item.inventoryItemId) {
            await tx.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: { currentStock: { increment: item.quantity } },
            });

            await tx.stockTransaction.create({
              data: {
                itemId: item.inventoryItemId,
                type: 'RECEIVE',
                quantity: item.quantity,
                reference: po.poNumber,
                notes: `استلام آلي من أمر الشراء ${po.poNumber} (المورد: ${po.vendor.nameAr})`,
                performedBy: session.username,
              },
            });
          }
        }
      });
    } else {
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status },
      });
    }

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_PURCHASE_ORDER',
      entityType: 'PurchaseOrder',
      entityId: id,
      details: `تحديث أمر الشراء ${po.poNumber} إلى حالة (${status})`,
    });

    return NextResponse.json({ success: true, message: `تم تحديث أمر الشراء إلى ${status}` });
  } catch (error: any) {
    console.error('PO update error:', error);
    return NextResponse.json({ error: 'فشل تحديث أمر الشراء' }, { status: 500 });
  }
}

