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
      return NextResponse.json({ error: 'غير مصرح للمنظف بالوصول إلى ورديات الصندوق' }, { status: 403 });
    }

    // Find current active open shift
    const currentOpenShift = await prisma.cashierShift.findFirst({
      where: {
        hotelId: session.hotelId,
        status: 'OPEN',
      },
      include: {
        user: { select: { fullName: true, username: true, role: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    // If active shift, calculate current collections since opening
    let liveStats = {
      cashCollected: 0,
      cardCollected: 0,
      totalCollected: 0,
    };

    if (currentOpenShift) {
      const paymentsSinceOpen = await prisma.payment.findMany({
        where: {
          folio: { hotelId: session.hotelId },
          status: 'COMPLETED',
          createdAt: { gte: currentOpenShift.openedAt },
        },
      });

      for (const p of paymentsSinceOpen) {
        if (p.method === 'CASH') {
          liveStats.cashCollected += p.amount;
        } else {
          liveStats.cardCollected += p.amount;
        }
      }
      liveStats.totalCollected = liveStats.cashCollected + liveStats.cardCollected;
    }

    const recentShifts = await prisma.cashierShift.findMany({
      where: { hotelId: session.hotelId },
      include: {
        user: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      currentOpenShift,
      liveStats,
      recentShifts,
    });
  } catch (error: any) {
    console.error('Shifts GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع بيانات الورديات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { action, startingCash = 0, actualCash, closingNotes } = body;

    if (action === 'OPEN') {
      // Check if open shift already exists
      const existingOpen = await prisma.cashierShift.findFirst({
        where: { hotelId: session.hotelId, status: 'OPEN' },
      });

      if (existingOpen) {
        return NextResponse.json(
          { error: `توجد وردية مفتوحة حالياً برقم (${existingOpen.shiftNumber}). يرجى إغلاقها أولاً قبل فتح وردية جديدة.` },
          { status: 409 }
        );
      }

      const shiftNumber = `SHF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const parsedStartCash = parseFloat(String(startingCash)) || 0;

      const shift = await prisma.cashierShift.create({
        data: {
          shiftNumber,
          hotelId: session.hotelId,
          userId: session.userId,
          startingCash: parsedStartCash,
          status: 'OPEN',
        },
        include: { user: true },
      });

      await logAuditEvent({
        hotelId: session.hotelId,
        userId: session.userId,
        username: session.username,
        action: 'OPEN_CASHIER_SHIFT',
        entityType: 'CashierShift',
        entityId: shift.id,
        details: `فتح وردية كاشير جديدة برقم ${shiftNumber} وعهدة بداية ${parsedStartCash} ر.س`,
      });

      return NextResponse.json({ success: true, message: 'تم فتح الوردية بنجاح', data: shift });
    }

    if (action === 'CLOSE') {
      const openShift = await prisma.cashierShift.findFirst({
        where: { hotelId: session.hotelId, status: 'OPEN' },
      });

      if (!openShift) {
        return NextResponse.json({ error: 'لا توجد وردية مفتوحة حالياً لإغلاقها' }, { status: 400 });
      }

      const parsedActual = parseFloat(String(actualCash));
      if (isNaN(parsedActual)) {
        return NextResponse.json({ error: 'يرجى إدخال المبلغ الفعلي في الدرج عند الجرد' }, { status: 400 });
      }

      // Calculate payments made during this shift
      const payments = await prisma.payment.findMany({
        where: {
          folio: { hotelId: session.hotelId },
          status: 'COMPLETED',
          createdAt: { gte: openShift.openedAt },
        },
      });

      let cashPayments = 0;
      let cardPayments = 0;
      for (const p of payments) {
        if (p.method === 'CASH') cashPayments += p.amount;
        else cardPayments += p.amount;
      }

      const expectedCash = openShift.startingCash + cashPayments;
      const difference = Number((parsedActual - expectedCash).toFixed(2));

      const closed = await prisma.cashierShift.update({
        where: { id: openShift.id },
        data: {
          closedAt: new Date(),
          cashPayments,
          cardPayments,
          expectedCash,
          actualCash: parsedActual,
          difference,
          status: 'CLOSED',
          closingNotes: closingNotes || (difference === 0 ? 'مطابقة تامة 100%' : `فارق عهدة: ${difference} ر.س`),
        },
      });

      await logAuditEvent({
        hotelId: session.hotelId,
        userId: session.userId,
        username: session.username,
        action: 'CLOSE_CASHIER_SHIFT',
        entityType: 'CashierShift',
        entityId: closed.id,
        details: `إغلاق وردية الكاشير ${closed.shiftNumber}: النقد الفعلي ${parsedActual} ر.س، المتوقع ${expectedCash} ر.س (الفارق: ${difference} ر.س)`,
      });

      return NextResponse.json({
        success: true,
        message: 'تم إغلاق الوردية وجرد الصندوق ومطابقة العهد بنجاح',
        data: closed,
      });
    }

    return NextResponse.json({ error: 'إجراء غير مدعوم' }, { status: 400 });
  } catch (error: any) {
    console.error('Shift POST error:', error);
    return NextResponse.json({ error: 'فشل معالجة وردية الكاشير' }, { status: 500 });
  }
}

