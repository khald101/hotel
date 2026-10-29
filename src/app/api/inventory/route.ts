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

    const items = await prisma.inventoryItem.findMany({
      where: { hotelId: session.hotelId, active: true },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { nameAr: 'asc' },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع المخزون' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { actionType, itemId, quantity, notes, reference } = body;
    // actionType: 'RECEIVE' (add stock), 'CONSUME' (subtract stock), 'ADJUST' (set stock)

    if (!itemId || !quantity) {
      return NextResponse.json({ error: 'معرف الصنف والكمية مطلوبان' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 });
    }

    const qty = parseInt(String(quantity), 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'الكمية يجب أن تكون رقماً موجباً' }, { status: 400 });
    }

    let newStock = item.currentStock;
    if (actionType === 'RECEIVE') {
      newStock += qty;
    } else if (actionType === 'CONSUME') {
      if (item.currentStock < qty) {
        return NextResponse.json(
          { error: `الرصيد المتاح (${item.currentStock}) أقل من الكمية المطلوبة للصرف (${qty}).` },
          { status: 400 }
        );
      }
      newStock -= qty;
    } else if (actionType === 'ADJUST') {
      newStock = qty;
    }

    const [updatedItem, transaction] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: newStock },
      }),
      prisma.stockTransaction.create({
        data: {
          itemId,
          type: actionType,
          quantity: qty,
          reference: reference || null,
          notes: notes || null,
          performedBy: session.username,
        },
      }),
    ]);

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: `INVENTORY_${actionType}`,
      entityType: 'InventoryItem',
      entityId: itemId,
      details: `حركة مخزون (${actionType}) على صنف ${item.nameAr}: كمية ${qty}، الرصيد الجديد: ${newStock}`,
    });

    return NextResponse.json({ success: true, data: { item: updatedItem, transaction } });
  } catch (error: any) {
    console.error('Inventory transaction error:', error);
    return NextResponse.json({ error: 'فشل معالجة حركة المخزون' }, { status: 500 });
  }
}

