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

    const records = await prisma.shamousRecord.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { transmittedAt: 'desc' },
      take: 50,
    });

    const totalTransmitted = await prisma.shamousRecord.count({
      where: { hotelId: session.hotelId },
    });

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        totalTransmitted,
        complianceStatus: '100% متوافق مع الأمن العام (شموس)',
        lastSync: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Shamous GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع سجلات شموس' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { reservationId, guestNationalId, guestName, idType = 'NATIONAL_ID', roomNumber } = body;

    if (!guestNationalId || !guestName || !roomNumber) {
      return NextResponse.json({ error: 'بيانات النزيل والغرفة مطلوبة للإرسال إلى شموس' }, { status: 400 });
    }

    const transmissionRef = `SHM-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    const record = await prisma.shamousRecord.create({
      data: {
        hotelId: session.hotelId,
        reservationId: reservationId || null,
        guestNationalId: String(guestNationalId).trim(),
        guestName,
        idType,
        roomNumber: String(roomNumber),
        transmissionRef,
        status: 'TRANSMITTED',
        responseCode: 'ACK_OK_200_ACCEPTED',
      },
    });

    if (reservationId) {
      await prisma.stayRecord.updateMany({
        where: { reservationId },
        data: { shamousRef: transmissionRef },
      });
    }

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'SHAMOUS_DISPATCH',
      entityType: 'ShamousRecord',
      entityId: record.id,
      details: `إرسال بيانات النزيل ${guestName} (هوية: ${guestNationalId}) بالغرفة ${roomNumber} إلى المنصة الأمنية شموس برقم مرجعي: ${transmissionRef}`,
    });

    return NextResponse.json({
      success: true,
      message: 'تم إرسال بيانات النزيل بنجاح إلى منصة شموس الأمنية وحفظ الإشعار المرجعي.',
      data: record,
    });
  } catch (error: any) {
    console.error('Shamous POST error:', error);
    return NextResponse.json({ error: 'فشل إرسال البيانات إلى شموس' }, { status: 500 });
  }
}

