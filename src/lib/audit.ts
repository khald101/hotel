import prisma from './prisma';

export async function logAuditEvent({
  hotelId,
  userId,
  username,
  action,
  entityType,
  entityId,
  details,
}: {
  hotelId: string;
  userId?: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        hotelId,
        userId,
        username,
        action,
        entityType,
        entityId,
        details,
      },
    });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
}

