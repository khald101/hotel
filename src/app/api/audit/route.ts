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

    if (!['ADMIN', 'GENERAL_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'سجل التدقيق الأمني محصور بمسؤول النظام والمدير العام' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');

    const where: any = { hotelId: session.hotelId };
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Audit GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع سجل التدقيق' }, { status: 500 });
  }
}
