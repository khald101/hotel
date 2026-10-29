import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: session.hotelId },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        currency: true,
        city: true,
      },
    });

    return NextResponse.json({
      authenticated: true,
      user: session,
      hotel,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

