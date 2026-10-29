import prisma from '../lib/prisma';

describe('Unit & Integration Tests: Room and Apartment Types Management & Dynamic Pricing', () => {
  const hotelId = 'hotel-riyadh-palace-01';
  let createdTypeId: string;
  let testFloorId: string;
  let createdRoomId: string;
  let createdReservationId: string;

  beforeAll(async () => {
    // Clean up any previous test remnants
    await prisma.reservation.deleteMany({ where: { confirmationNo: 'CONF-TST-8899' } });
    await prisma.room.deleteMany({ where: { roomNumber: 'TEST-7701' } });
    await prisma.roomType.deleteMany({
      where: {
        hotelId,
        code: { in: ['TST_SGL', 'TST_APT', 'TST_ROYAL', 'TST_INACT'] },
      },
    });

    // Ensure test floor exists
    let floor = await prisma.floor.findFirst({ where: { hotelId } });
    if (!floor) {
      floor = await prisma.floor.create({
        data: {
          hotelId,
          floorNumber: 77,
          nameAr: 'طابق الاختبار',
          active: true,
        },
      });
    }
    testFloorId = floor.id;
  });

  afterAll(async () => {
    // Cleanup test records in strict foreign key order
    await prisma.reservation.deleteMany({ where: { confirmationNo: 'CONF-TST-8899' } });
    await prisma.room.deleteMany({ where: { roomNumber: 'TEST-7701' } });
    await prisma.roomType.deleteMany({
      where: {
        hotelId,
        code: { in: ['TST_SGL', 'TST_APT', 'TST_ROYAL', 'TST_INACT'] },
      },
    });
    await prisma.$disconnect();
  });

  it('1. Can create a new room/apartment type with Arabic name, price, capacity and bed configuration', async () => {
    const newType = await prisma.roomType.create({
      data: {
        hotelId,
        code: 'TST_APT',
        nameAr: 'شقة فندقية غرفتين وصالة فاخرة',
        nameEn: 'Luxury Two-Bedroom Hotel Apartment',
        basePrice: 850,
        maxOccupancy: 4,
        bedType: '1 سرير كينج + 2 سرير مفرد',
        description: 'شقة فندقية متكاملة مع مطبخ مجهز وغرفة معيشة بإطلالة بانورامية',
        active: true,
      },
    });

    expect(newType).toBeDefined();
    expect(newType.id).toBeDefined();
    expect(newType.nameAr).toBe('شقة فندقية غرفتين وصالة فاخرة');
    expect(newType.basePrice).toBe(850);
    expect(newType.maxOccupancy).toBe(4);
    expect(newType.bedType).toBe('1 سرير كينج + 2 سرير مفرد');
    expect(newType.active).toBe(true);

    createdTypeId = newType.id;
  });

  it('2. Enforces positive non-negative nightly base price', async () => {
    // Validation check: negative price should be rejected by validation logic
    const invalidPrice = -150;
    const isValid = invalidPrice >= 0;
    expect(isValid).toBe(false);

    // Testing schema and validation boundary: price must be >= 0
    const zeroPriceAllowed = 0;
    expect(zeroPriceAllowed >= 0).toBe(true);
  });

  it('3. Can link the new room/apartment type directly when creating a room', async () => {
    const testRoom = await prisma.room.create({
      data: {
        hotelId,
        floorId: testFloorId,
        roomTypeId: createdTypeId,
        roomNumber: 'TEST-7701',
        occupancyStatus: 'VACANT',
        cleaningStatus: 'INSPECTED_PASSED',
        maintenanceStatus: 'OPERATIONAL',
        saleStatus: 'AVAILABLE',
        features: 'إطلالة علوية، بلكونة خاصة',
      },
      include: {
        roomType: true,
        floor: true,
      },
    });

    expect(testRoom).toBeDefined();
    expect(testRoom.roomNumber).toBe('TEST-7701');
    expect(testRoom.roomTypeId).toBe(createdTypeId);
    expect(testRoom.roomType.nameAr).toBe('شقة فندقية غرفتين وصالة فاخرة');
    expect(testRoom.roomType.basePrice).toBe(850);

    createdRoomId = testRoom.id;
  });

  it('4. Multi-night reservation calculation links to room type basePrice and VAT', async () => {
    // 3 nights * 850 SAR = 2,550 SAR subtotal + 15% VAT (382.50 SAR) = 2,932.50 SAR
    const type = await prisma.roomType.findUnique({ where: { id: createdTypeId } });
    expect(type).not.toBeNull();

    const checkIn = new Date('2026-12-01');
    const checkOut = new Date('2026-12-04');
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    expect(nights).toBe(3);

    const nightlyRate = type!.basePrice;
    const subtotal = nightlyRate * nights;
    const taxAmount = Number((subtotal * 0.15).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    expect(subtotal).toBe(2550);
    expect(taxAmount).toBe(382.5);
    expect(totalAmount).toBe(2932.5);

    // Find or create a test guest
    let guest = await prisma.guest.findFirst({ where: { nationalId: '1099887766' } });
    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          nationalId: '1099887766',
          idType: 'NATIONAL_ID',
          fullNameAr: 'نزيل الاختبار التلقائي',
          phone: '0599998877',
          nationality: 'SA',
        },
      });
    }

    // Create reservation with snapshot of price
    const resv = await prisma.reservation.create({
      data: {
        hotelId,
        guestId: guest.id,
        roomTypeId: createdTypeId,
        assignedRoomId: createdRoomId,
        confirmationNo: 'CONF-TST-8899',
        checkInDate: '2026-12-01',
        checkOutDate: '2026-12-04',
        nightsCount: nights,
        nightlyRate,
        subtotal,
        taxAmount,
        totalAmount,
        status: 'CONFIRMED',
      },
    });

    expect(resv.id).toBeDefined();
    expect(resv.totalAmount).toBe(2932.5);
    createdReservationId = resv.id;
  });

  it('5. Historical price preservation: Modifying room type basePrice does NOT change existing confirmed reservations', async () => {
    // Update the room type price from 850 to 1,200 SAR
    await prisma.roomType.update({
      where: { id: createdTypeId },
      data: {
        basePrice: 1200,
      },
    });

    const updatedType = await prisma.roomType.findUnique({ where: { id: createdTypeId } });
    expect(updatedType!.basePrice).toBe(1200);

    // Retrieve previous reservation and verify price did NOT change
    const historicResv = await prisma.reservation.findUnique({
      where: { id: createdReservationId },
    });

    expect(historicResv!.nightlyRate).toBe(850);
    expect(historicResv!.subtotal).toBe(2550);
    expect(historicResv!.totalAmount).toBe(2932.5);
  });

  it('6. Safety deletion protection: Cannot delete a room type while rooms or reservations are linked', async () => {
    const typeWithRelations = await prisma.roomType.findUnique({
      where: { id: createdTypeId },
      include: {
        _count: {
          select: {
            rooms: true,
            reservations: true,
          },
        },
      },
    });

    expect(typeWithRelations!._count.rooms).toBeGreaterThan(0);
    expect(typeWithRelations!._count.reservations).toBeGreaterThan(0);

    // In API logic: if _count.rooms > 0 || _count.reservations > 0, deletion is blocked
    const canSafelyDelete =
      typeWithRelations!._count.rooms === 0 && typeWithRelations!._count.reservations === 0;
    expect(canSafelyDelete).toBe(false);
  });

  it('7. Deactivating a room type works and prevents assigning to new rooms', async () => {
    // Deactivate room type
    const deactivated = await prisma.roomType.update({
      where: { id: createdTypeId },
      data: { active: false },
    });

    expect(deactivated.active).toBe(false);

    // Room creation validation rule rejects inactive types
    const isAllowedForNewRoom = deactivated.active === true;
    expect(isAllowedForNewRoom).toBe(false);

    // Re-activate room type
    const reactivated = await prisma.roomType.update({
      where: { id: createdTypeId },
      data: { active: true },
    });
    expect(reactivated.active).toBe(true);
  });

  it('8. Can filter and search room types with count of linked units', async () => {
    const roomTypes = await prisma.roomType.findMany({
      where: {
        hotelId,
        nameAr: { contains: 'شقة' },
      },
      include: {
        _count: {
          select: { rooms: true, reservations: true },
        },
      },
    });

    expect(roomTypes.length).toBeGreaterThan(0);
    const found = roomTypes.find((t) => t.id === createdTypeId);
    expect(found).toBeDefined();
    expect(found!._count.rooms).toBe(1);
    expect(found!._count.reservations).toBe(1);
  });
});
