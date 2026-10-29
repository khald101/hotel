import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-enterprise-hotel-jwt-key-ksa-2026';

export interface UserSession {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  hotelId: string;
  jobTitle: string;
  department?: string;
  permissions: string[];
}

export function signToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch {
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<UserSession | null> {
  // Check Authorization header or cookie
  const authHeader = req.headers.get('authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get('token')?.value || '';
  }

  if (!token) return null;
  return verifyToken(token);
}

export function hasPermission(session: UserSession, requiredPermission: string): boolean {
  if (session.role === 'ADMIN') return true;
  if (session.permissions.includes('ALL')) return true;
  return session.permissions.includes(requiredPermission);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

