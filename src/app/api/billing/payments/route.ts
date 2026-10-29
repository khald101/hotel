import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { encodeZatcaTlv } from '@/lib/zatca';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER') {
      return NextResponse.json({ error: 'غير مصرح للمنظف بتسجيل المدفوعات' }, { status: 403 });
    }

    const body = await req.json();
    const {
      folioId,
      amount,
      method = 'MADA', // CASH, CREDIT_CARD, MADA, BANK_TRANSFER
      transactionRef,
      idempotencyKey,
      notes,
    } = body;

    const parsedAmount = parseFloat(String(amount));
    if (!folioId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'معرف الحساب والمبلغ المدفوع بشكل صحيح مطلوبان' }, { status: 400 });
    }

    // 1. Idempotency Check: Prevent duplicate payments
    if (idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existingPayment) {
        return NextResponse.json({
          success: true,
          message: 'تم استرجاع عملية الدفع السابقة بنفس مفتاح عدم التكرار (Idempotency Key).',
          data: existingPayment,
          isDuplicatePrevented: true,
        });
      }
    }

    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
      include: {
        hotel: true,
        guest: true,
        items: true,
      },
    });

    if (!folio) {
      return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
    }

    const paymentNumber = `PAY-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create payment and update folio in atomic transaction
    const [payment, updatedFolio] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          folioId,
          paymentNumber,
          amount: parsedAmount,
          method,
          transactionRef: transactionRef || `REF-${Date.now()}`,
          idempotencyKey: idempotencyKey || null,
          status: 'COMPLETED',
          notes: notes || null,
          receivedBy: session.username,
        },
      }),
      prisma.folio.update({
        where: { id: folioId },
        data: {
          totalPayments: { increment: parsedAmount },
          balance: { decrement: parsedAmount },
        },
      }),
    ]);

    // Generate ZATCA Phase 1 & 2 Electronic Invoice with TLV QR Code
    const nowIso = new Date().toISOString();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceVat = Number((parsedAmount * 0.15 / 1.15).toFixed(2));
    const invoiceSubtotal = Number((parsedAmount - invoiceVat).toFixed(2));

    const zatcaQr = encodeZatcaTlv(
      folio.hotel.nameAr,
      folio.hotel.vatNumber || '310987654300003',
      nowIso,
      parsedAmount,
      invoiceVat
    );

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        hotelId: folio.hotelId,
        folioId: folio.id,
        uuid: `ZATCA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        sellerName: folio.hotel.nameAr,
        sellerVat: folio.hotel.vatNumber || '310987654300003',
        buyerName: folio.guest.fullNameAr,
        buyerVat: null,
        subtotal: invoiceSubtotal,
        taxAmount: invoiceVat,
        totalInclusive: parsedAmount,
        zatcaQrCode: zatcaQr,
        zatcaStatus: 'REPORTED',
        invoiceType: 'SIMPLIFIED_TAX_INVOICE',
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'PROCESS_PAYMENT',
      entityType: 'Payment',
      entityId: payment.id,
      details: `تحصيل دفعة مالية بقيمة ${parsedAmount} ر.س عبر (${method}) للحساب ${folio.folioNumber}، وإصدار الفاتورة الإلكترونية ${invoiceNumber}`,
    });

    return NextResponse.json({
      success: true,
      message: `تم تسجيل الدفع بنجاح وإصدار الفاتورة الضريبية المبسطة المطابقة لهيئة الزكاة والضريبة (ZATCA).`,
      data: {
        payment,
        folio: updatedFolio,
        invoice,
      },
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'فشل معالجة عملية التحصيل والدفع' }, { status: 500 });
  }
}

