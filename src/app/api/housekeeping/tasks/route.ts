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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const floorId = searchParams.get('floorId');
    const cleanerOnly = searchParams.get('cleanerOnly') === 'true' || session.role === 'CLEANER';

    const where: any = {
      room: { hotelId: session.hotelId },
    };

    // Strict Cleaner Isolation: A Cleaner can ONLY see tasks assigned to them!
    if (cleanerOnly || session.role === 'CLEANER') {
      where.assignedToId = session.userId;
    }

    if (status) where.status = status;
    if (floorId) where.room.floorId = floorId;

    const tasks = await prisma.housekeepingTask.findMany({
      where,
      include: {
        room: {
          include: { floor: true, roomType: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, username: true, role: true },
        },
        inspectedBy: {
          select: { id: true, fullName: true, username: true, role: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    const cleaners = await prisma.user.findMany({
      where: {
        hotelId: session.hotelId,
        role: 'CLEANER',
        active: true,
      },
      select: { id: true, fullName: true, username: true },
    });

    return NextResponse.json({ success: true, data: tasks, cleaners });
  } catch (error: any) {
    console.error('Housekeeping GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع مهام التدبير الفندقي' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Role check: Only Supervisor, GM, Admin can create or reassign tasks
    if (!['ADMIN', 'GENERAL_MANAGER', 'HOUSEKEEPING_SUPERVISOR'].includes(session.role)) {
      return NextResponse.json({ error: 'صلاحية إسناد المهام محصورة بمشرفي التدبير الفندقي والإدارة' }, { status: 403 });
    }

    const { roomId, assignedToId, priority = 'NORMAL', notes } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: 'معرف الغرفة مطلوب' }, { status: 400 });
    }

    const taskNumber = `HSK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const task = await prisma.housekeepingTask.create({
      data: {
        taskNumber,
        roomId,
        assignedToId: assignedToId || null,
        priority,
        status: 'PENDING',
        cleanerNotes: notes || null,
      },
      include: {
        room: true,
        assignedTo: true,
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { cleaningStatus: 'PENDING_CLEANING' },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'ASSIGN_CLEANING_TASK',
      entityType: 'HousekeepingTask',
      entityId: task.id,
      details: `إسناد مهمة تنظيف للغرفة ${task.room.roomNumber} للمنظف ${task.assignedTo?.fullName || 'غير مسند'}`,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    console.error('Housekeeping create task error:', error);
    return NextResponse.json({ error: 'فشل إنشاء مهمة التنظيف' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, action, notes } = body;
    // Possible actions:
    // 'START' (Cleaner starts work)
    // 'FINISH' (Cleaner completes, moves to PENDING_INSPECTION)
    // 'INSPECT_PASS' (Supervisor approves -> room becomes INSPECTED_PASSED and ready!)
    // 'INSPECT_FAIL' (Supervisor rejects -> NEEDS_RECLEAN)
    // 'REASSIGN' (Supervisor reassigns to another cleaner)

    if (!taskId || !action) {
      return NextResponse.json({ error: 'بيانات العملية غير مكتملة' }, { status: 400 });
    }

    const task = await prisma.housekeepingTask.findUnique({
      where: { id: taskId },
      include: { room: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    // Role Enforcement & Workflow Transitions:
    if (action === 'START') {
      const updated = await prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          cleanerNotes: notes ? `${task.cleanerNotes || ''}\n${notes}` : task.cleanerNotes,
        },
      });

      await prisma.room.update({
        where: { id: task.roomId },
        data: { cleaningStatus: 'CLEANING_IN_PROGRESS' },
      });

      return NextResponse.json({ success: true, message: 'تم بدء التنظيف', data: updated });
    }

    if (action === 'FINISH') {
      // Cleaner reports done -> must wait for inspection!
      const updated = await prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: 'PENDING_INSPECTION',
          completedAt: new Date(),
          cleanerNotes: notes ? `${task.cleanerNotes || ''}\n[اكتمال العمل: ${notes}]` : task.cleanerNotes,
        },
      });

      await prisma.room.update({
        where: { id: task.roomId },
        data: { cleaningStatus: 'PENDING_INSPECTION' },
      });

      return NextResponse.json({
        success: true,
        message: 'تم تسجيل اكتمال التنظيف وتحويل الغرفة إلى قائمة انتظار التفتيش للمشرف.',
        data: updated,
      });
    }

    // INSPECTION ACTIONS: Cleaners are STRICTLY FORBIDDEN from self-inspecting!
    if (action === 'INSPECT_PASS' || action === 'INSPECT_FAIL') {
      if (session.role === 'CLEANER') {
        return NextResponse.json(
          { error: 'غير مصرح للمنظف باعتماد التفتيش أو إعلان جاهزية الغرفة بنفسه!' },
          { status: 403 }
        );
      }

      if (!['ADMIN', 'GENERAL_MANAGER', 'HOUSEKEEPING_SUPERVISOR'].includes(session.role)) {
        return NextResponse.json({ error: 'صلاحية التفتيش محصورة بمشرفي التدبير الفندقي والإدارة' }, { status: 403 });
      }

      if (action === 'INSPECT_PASS') {
        const updated = await prisma.housekeepingTask.update({
          where: { id: taskId },
          data: {
            status: 'INSPECTED_PASSED',
            inspectedById: session.userId,
            inspectedAt: new Date(),
            inspectorNotes: notes || 'اجتازت الغرفة معايير الفحص المعتمدة بنجاح.',
          },
        });

        // Set room cleaning status to INSPECTED_PASSED!
        await prisma.room.update({
          where: { id: task.roomId },
          data: { cleaningStatus: 'INSPECTED_PASSED' },
        });

        await logAuditEvent({
          hotelId: session.hotelId,
          userId: session.userId,
          username: session.username,
          action: 'INSPECT_ROOM_PASSED',
          entityType: 'Room',
          entityId: task.roomId,
          details: `المشرف ${session.fullName} اعتمد نظافة وجاهزية الغرفة ${task.room.roomNumber} بعد التفتيش`,
        });

        return NextResponse.json({
          success: true,
          message: `تم اعتماد تفتيش الغرفة ${task.room.roomNumber} بنجاح، وأصبحت جاهزة للتسكين.`,
          data: updated,
        });
      }

      if (action === 'INSPECT_FAIL') {
        const updated = await prisma.housekeepingTask.update({
          where: { id: taskId },
          data: {
            status: 'NEEDS_RECLEAN',
            inspectedById: session.userId,
            inspectedAt: new Date(),
            inspectorNotes: notes || 'لم تجتز معايير النظافة، يرجى إعادة التنظيف.',
          },
        });

        await prisma.room.update({
          where: { id: task.roomId },
          data: { cleaningStatus: 'NEEDS_RECLEAN' },
        });

        await logAuditEvent({
          hotelId: session.hotelId,
          userId: session.userId,
          username: session.username,
          action: 'INSPECT_ROOM_REJECTED',
          entityType: 'Room',
          entityId: task.roomId,
          details: `المشرف ${session.fullName} رفض تفتيش الغرفة ${task.room.roomNumber} وطلب إعادة التنظيف: ${notes}`,
        });

        return NextResponse.json({
          success: true,
          message: `تم رفض التفتيش وإعادة الغرفة ${task.room.roomNumber} للمنظف لإعادة التنظيف مع الملاحظات.`,
          data: updated,
        });
      }
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Housekeeping update error:', error);
    return NextResponse.json({ error: 'فشل تحديث حالة مهمة التدبير الفندقي' }, { status: 500 });
  }
}

