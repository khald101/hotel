import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'CLEANER') {
      return NextResponse.json({ error: 'غير مصرح للمنظف بالاطلاع على الفواتير' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('id');

    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          hotel: true,
          folio: {
            include: {
              guest: true,
              items: true,
              payments: true,
            },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: invoice });
    }

    const invoices = await prisma.invoice.findMany({
      where: { hotelId: session.hotelId },
      include: {
        hotel: true,
        folio: { include: { guest: true } },
      },
      orderBy: { issueDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error('Invoices GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع الفواتير' }, { status: 500 });
  }
}
