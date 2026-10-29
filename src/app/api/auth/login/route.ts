import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { hotel: true },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة، أو تم تعطيل الحساب' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = user.permissions ? JSON.parse(user.permissions) : [];
    } catch {
      parsedPermissions = [];
    }

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      hotelId: user.hotelId,
      jobTitle: user.jobTitle,
      department: user.department || '',
      permissions: parsedPermissions,
    };

    const token = signToken(sessionPayload);

    await logAuditEvent({
      hotelId: user.hotelId,
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: `تسجيل دخول ناجح للمستخدم: ${user.fullName} (${user.jobTitle})`,
    });

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      hotel: {
        id: user.hotel.id,
        nameAr: user.hotel.nameAr,
        nameEn: user.hotel.nameEn,
        currency: user.hotel.currency,
      },
    });

    // Set secure httpOnly cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة تسجيل الدخول' }, { status: 500 });
  }
}

