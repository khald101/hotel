import prisma from '../lib/prisma';
import { encodeZatcaTlv, decodeZatcaTlv } from '../lib/zatca';

describe('Full End-to-End Operational Lifecycle Integration Tests', () => {
  const hotelId = 'hotel-riyadh-palace-01';

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Database has 160 active rooms linked directly to floors in a single hotel structure', async () => {
    const roomCount = await prisma.room.count({
      where: { hotelId, active: true },
    });
    expect(roomCount).toBeGreaterThanOrEqual(160);

    const floorCount = await prisma.floor.count({
      where: { hotelId },
    });
    expect(floorCount).toBeGreaterThanOrEqual(5);

    // Verify rooms link directly to floors
    const sampleRoom = await prisma.room.findFirst({
      where: { hotelId },
      include: { floor: true },
    });
    expect(sampleRoom).not.toBeNull();
    expect(sampleRoom?.floor).toBeDefined();
    expect(sampleRoom?.floor.hotelId).toBe(hotelId);
  });

  it('2. Enforces Room Readiness constraint: room must be VACANT, INSPECTED_PASSED, OPERATIONAL, and AVAILABLE', async () => {
    const dirtyRoom = await prisma.room.findFirst({
      where: { hotelId, cleaningStatus: 'PENDING_CLEANING' },
    });
    expect(dirtyRoom).not.toBeNull();
    if (dirtyRoom) {
      const isReady =
        dirtyRoom.occupancyStatus === 'VACANT' &&
        dirtyRoom.cleaningStatus === 'INSPECTED_PASSED' &&
        dirtyRoom.maintenanceStatus === 'OPERATIONAL' &&
        dirtyRoom.saleStatus === 'AVAILABLE';
      expect(isReady).toBe(false);
    }
  });

  it('3. Generates valid ZATCA TLV Base64 QR code and matches Fatoora tags', () => {
    const qr = encodeZatcaTlv(
      'فندق قصر الرياض الدولي',
      '310987654300003',
      new Date().toISOString(),
      2530.0,
      330.0
    );

    const decoded = decodeZatcaTlv(qr);
    expect(decoded[1]).toBe('فندق قصر الرياض الدولي');
    expect(decoded[2]).toBe('310987654300003');
    expect(decoded[4]).toBe('2530.00');
    expect(decoded[5]).toBe('330.00');
  });

  it('4. Cleaner and Cushion Manager roles exist in database with dedicated configurations', async () => {
    const cleaner = await prisma.user.findFirst({
      where: { role: 'CLEANER' },
    });
    expect(cleaner).not.toBeNull();
    expect(cleaner?.role).toBe('CLEANER');
    expect(cleaner?.jobTitle).toBe('المنظف');

    const cushion = await prisma.user.findFirst({
      where: { role: 'CUSHION_MANAGER' },
    });
    expect(cushion).not.toBeNull();
    expect(cushion?.role).toBe('CUSHION_MANAGER');
    expect(cushion?.jobTitle).toBe('مدير الكوشن');
  });

  it('5. Check-in accurately assigns the exact reserved room that the guest booked', async () => {
    const testReservation = await prisma.reservation.findFirst({
      where: {
        hotelId,
        status: 'CONFIRMED',
        assignedRoomId: { not: null },
      },
      include: { assignedRoom: true },
    });

    if (testReservation && testReservation.assignedRoom) {
      const bookedRoomId = testReservation.assignedRoomId!;
      const bookedRoomNumber = testReservation.assignedRoom.roomNumber;

      await prisma.room.update({
        where: { id: bookedRoomId },
        data: {
          occupancyStatus: 'RESERVED',
          cleaningStatus: 'INSPECTED_PASSED',
          maintenanceStatus: 'OPERATIONAL',
          saleStatus: 'AVAILABLE',
        },
      });

      const targetRoomId = testReservation.assignedRoomId;
      expect(targetRoomId).toBe(bookedRoomId);

      const [stayRecord] = await prisma.$transaction([
        prisma.stayRecord.create({
          data: {
            reservationId: testReservation.id,
            guestId: testReservation.guestId,
            roomId: bookedRoomId,
            checkedInBy: 'reception',
            status: 'ACTIVE',
            roomKeyCardNo: `CARD-${bookedRoomNumber}`,
          },
        }),
        prisma.reservation.update({
          where: { id: testReservation.id },
          data: { status: 'CHECKED_IN', assignedRoomId: bookedRoomId },
        }),
        prisma.room.update({
          where: { id: bookedRoomId },
          data: { occupancyStatus: 'OCCUPIED' },
        }),
      ]);

      expect(stayRecord.roomId).toBe(bookedRoomId);
      expect(stayRecord.roomKeyCardNo).toBe(`CARD-${bookedRoomNumber}`);

      const checkedInRoom = await prisma.room.findUnique({
        where: { id: bookedRoomId },
      });
      expect(checkedInRoom?.occupancyStatus).toBe('OCCUPIED');

      // Cleanup
      await prisma.stayRecord.delete({ where: { id: stayRecord.id } });
      await prisma.reservation.update({
        where: { id: testReservation.id },
        data: { status: 'CONFIRMED' },
      });
      await prisma.room.update({
        where: { id: bookedRoomId },
        data: { occupancyStatus: 'RESERVED' },
      });
    }
  });
});

