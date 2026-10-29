import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { csvContent } = await req.json();
    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'محتوى ملف CSV مطلوب' }, { status: 400 });
    }

    const lines = csvContent
      .replace(/\r/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      return NextResponse.json({ error: 'الملف فارغ أو لا يحتوي على صفوف بيانات' }, { status: 400 });
    }

    // Reference maps for floors and room types
    const floors = await prisma.floor.findMany({ where: { hotelId: session.hotelId } });
    const roomTypes = await prisma.roomType.findMany({ where: { hotelId: session.hotelId } });
    const existingRooms = await prisma.room.findMany({
      where: { hotelId: session.hotelId },
      select: { roomNumber: true },
    });

    const floorMap = new Map(floors.map((f) => [f.floorNumber, f]));
    const typeMap = new Map(roomTypes.map((t) => [t.code.toUpperCase(), t.id]));
    const existingSet = new Set(existingRooms.map((r) => r.roomNumber));

    const acceptedRows: any[] = [];
    const rejectedRows: { row: number; roomNumber: string; reason: string }[] = [];

    // Header index map: RoomNumber, FloorNumber, RoomTypeCode, Features
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 3) {
        rejectedRows.push({ row: i + 1, roomNumber: parts[0] || 'N/A', reason: 'عدد الحقول غير كافٍ في الصف' });
        continue;
      }

      // Supports either 3-4 columns: RoomNumber, FloorNumber, RoomTypeCode, Features
      // or legacy 5 columns: RoomNumber, BuildingCode, FloorNumber, RoomTypeCode, Features
      let roomNumber = '';
      let floorNumStr = '';
      let typeCode = '';
      let features = '';

      if (parts.length >= 5) {
        // legacy 5 cols: RoomNumber, (ignored), FloorNumber, RoomTypeCode, Features
        roomNumber = parts[0];
        floorNumStr = parts[2];
        typeCode = parts[3];
        features = parts[4] || '';
      } else {
        // 3-4 cols: RoomNumber, FloorNumber, RoomTypeCode, Features
        roomNumber = parts[0];
        floorNumStr = parts[1];
        typeCode = parts[2];
        features = parts[3] || '';
      }

      if (!roomNumber) {
        rejectedRows.push({ row: i + 1, roomNumber: 'فارغ', reason: 'رقم الغرفة مفقود' });
        continue;
      }

      if (existingSet.has(roomNumber)) {
        rejectedRows.push({ row: i + 1, roomNumber, reason: 'الغرفة مسجلة مسبقاً في الفندق' });
        continue;
      }

      const floorNum = parseInt(floorNumStr, 10);
      const floorObj = floorMap.get(floorNum);
      if (!floorObj) {
        rejectedRows.push({ row: i + 1, roomNumber, reason: `الطابق ${floorNumStr} غير مسجل في الفندق` });
        continue;
      }

      if (!floorObj.active) {
        rejectedRows.push({ row: i + 1, roomNumber, reason: `الطابق ${floorNumStr} معطل وموقوف عن استقبال غرف جديدة` });
        continue;
      }

      const roomTypeId = typeMap.get(typeCode.toUpperCase());
      if (!roomTypeId) {
        rejectedRows.push({ row: i + 1, roomNumber, reason: `رمز نوع الغرفة ${typeCode} غير معروف` });
        continue;
      }

      acceptedRows.push({
        hotelId: session.hotelId,
        floorId: floorObj.id,
        roomTypeId,
        roomNumber,
        features: features || 'غير مدخنين',
        occupancyStatus: 'VACANT',
        cleaningStatus: 'INSPECTED_PASSED',
        maintenanceStatus: 'OPERATIONAL',
        saleStatus: 'AVAILABLE',
      });
      existingSet.add(roomNumber); // Prevent duplicates inside the same CSV
    }

    if (acceptedRows.length > 0) {
      await prisma.$transaction(
        acceptedRows.map((data) =>
          prisma.room.create({
            data,
          })
        )
      );

      await logAuditEvent({
        hotelId: session.hotelId,
        userId: session.userId,
        username: session.username,
        action: 'IMPORT_ROOMS_CSV',
        entityType: 'Room',
        entityId: 'CSV-IMPORT',
        details: `تم استيراد ${acceptedRows.length} غرفة بنجاح من ملف CSV (رُفض ${rejectedRows.length} صف)`,
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: lines.length - 1,
        importedCount: acceptedRows.length,
        rejectedCount: rejectedRows.length,
        rejectedRows,
      },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة ملف الاستيراد' }, { status: 500 });
  }
}

