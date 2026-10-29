import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role !== 'ADMIN' && session.role !== 'GENERAL_MANAGER') {
      return NextResponse.json({ error: 'إدارة المستخدمين محصورة بالمسؤول العام ومدير الفندق' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { hotelId: session.hotelId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        jobTitle: true,
        department: true,
        permissions: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'فشل استرجاع الموظفين' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'إنشاء حسابات الموظفين محصور بمسؤول النظام' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, fullName, role, jobTitle, department, email, phone, permissions } = body;

    if (!username || !password || !fullName || !role) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم مسجل مسبقاً' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        hotelId: session.hotelId,
        username,
        passwordHash,
        fullName,
        role, // e.g. 'CLEANER' (المنظف) or 'CUSHION_MANAGER' (مدير الكوشن) or standard roles
        jobTitle: jobTitle || (role === 'CUSHION_MANAGER' ? 'مدير الكوشن' : role === 'CLEANER' ? 'المنظف' : 'موظف'),
        department: department || null,
        email: email || null,
        phone: phone || null,
        permissions: permissions ? JSON.stringify(permissions) : null,
        active: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        jobTitle: true,
        department: true,
        active: true,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      details: `إنشاء حساب موظف جديد: ${user.fullName} بدور: ${user.role} (${user.jobTitle})`,
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: any) {
    console.error('User create error:', error);
    return NextResponse.json({ error: 'فشل إنشاء حساب الموظف' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'تعديل الصلاحيات والحسابات محصور بمسؤول النظام' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role, jobTitle, department, active, permissions, newPassword } = body;

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (jobTitle) updateData.jobTitle = jobTitle;
    if (department !== undefined) updateData.department = department;
    if (active !== undefined) updateData.active = Boolean(active);
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        jobTitle: true,
        department: true,
        active: true,
        permissions: true,
      },
    });

    await logAuditEvent({
      hotelId: session.hotelId,
      userId: session.userId,
      username: session.username,
      action: 'UPDATE_USER_PERMISSIONS',
      entityType: 'User',
      entityId: userId,
      details: `تحديث بيانات وصلاحيات الموظف ${updated.fullName}: دور ${updated.role} (${updated.jobTitle})`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'فشل تحديث بيانات الموظف' }, { status: 500 });
  }
}

