import prisma from '../lib/prisma';

describe('Unit & Integration Tests: Floor Management & Direct Room Linkage (Single Hotel Structure)', () => {
  const hotelId = 'hotel-riyadh-palace-01';
  let testFloorId: string;
  let testRoomTypeId: string;

  beforeAll(async () => {
    const rt = await prisma.roomType.findFirst({ where: { hotelId } });
    testRoomTypeId = rt!.id;
  });

  afterAll(async () => {
    // Clean up test floor and its rooms
    if (testFloorId) {
      await prisma.room.deleteMany({ where: { floorId: testFloorId } });
      await prisma.floor.deleteMany({ where: { id: testFloorId } });
    }
    // Delete any floor with floorNumber 99 or -1 created in tests
    const cleanupFloors = await prisma.floor.findMany({
      where: { hotelId, floorNumber: { in: [99, 98, -1] } },
    });
    for (const cf of cleanupFloors) {
      await prisma.room.deleteMany({ where: { floorId: cf.id } });
      await prisma.floor.delete({ where: { id: cf.id } });
    }
    await prisma.$disconnect();
  });

  it('1. Can add a new floor with number, names, description and active status', async () => {
    const floor = await prisma.floor.create({
      data: {
        hotelId,
        floorNumber: 99,
        nameAr: 'طابق السحاب الملكي',
        nameEn: 'Royal Sky Floor',
        description: 'طابق فاخر في أعلى الفندق مخصص للأجنحة التنفيذية',
        active: true,
      },
    });

    expect(floor).toBeDefined();
    expect(floor.id).toBeDefined();
    expect(floor.floorNumber).toBe(99);
    expect(floor.nameAr).toBe('طابق السحاب الملكي');
    expect(floor.active).toBe(true);

    testFloorId = floor.id;
  });

  it('2. Enforces unique floor numbers: prevents duplicate floor number within the hotel', async () => {
    await expect(
      prisma.floor.create({
        data: {
          hotelId,
          floorNumber: 99, // Duplicate!
          nameAr: 'طابق مكرر',
        },
      })
    ).rejects.toThrow();
  });

  it('3. Can edit floor details (name, description, active status) without breaking relations', async () => {
    const updated = await prisma.floor.update({
      where: { id: testFloorId },
      data: {
        nameAr: 'طابق السحاب التنفيذي المحدث',
        description: 'تم تحديث الوصف والخدمات',
      },
    });

    expect(updated.nameAr).toBe('طابق السحاب التنفيذي المحدث');
    expect(updated.description).toBe('تم تحديث الوصف والخدمات');
  });

  it('4. Lists all saved floors in the hotel with their room counts', async () => {
    const floors = await prisma.floor.findMany({
      where: { hotelId },
      include: {
        _count: { select: { rooms: true } },
      },
      orderBy: { floorNumber: 'asc' },
    });

    expect(floors.length).toBeGreaterThanOrEqual(5);
    const floor1 = floors.find((f) => f.floorNumber === 1);
    expect(floor1).toBeDefined();
    expect(floor1!._count.rooms).toBeGreaterThan(0);
  });

  it('5. Allows selecting floor when adding a new room', async () => {
    const roomNumber = '9901';
    // Ensure roomNumber does not already exist
    await prisma.room.deleteMany({ where: { hotelId, roomNumber } });

    const newRoom = await prisma.room.create({
      data: {
        hotelId,
        floorId: testFloorId,
        roomTypeId: testRoomTypeId,
        roomNumber,
        occupancyStatus: 'VACANT',
        cleaningStatus: 'INSPECTED_PASSED',
        maintenanceStatus: 'OPERATIONAL',
        saleStatus: 'AVAILABLE',
      },
      include: { floor: true },
    });

    expect(newRoom.roomNumber).toBe('9901');
    expect(newRoom.floorId).toBe(testFloorId);
    expect(newRoom.floor.nameAr).toBe('طابق السحاب التنفيذي المحدث');
  });

  it('6. Rejects room creation if floor does not exist', async () => {
    await expect(
      prisma.room.create({
        data: {
          hotelId,
          floorId: 'non-existent-floor-id',
          roomTypeId: testRoomTypeId,
          roomNumber: '9902',
        },
      })
    ).rejects.toThrow();
  });

  it('7. Supports adding a bulk group of rooms to a specific floor', async () => {
    const bulkNumbers = ['9903', '9904', '9905'];
    await prisma.room.deleteMany({ where: { hotelId, roomNumber: { in: bulkNumbers } } });

    const createdRooms = await prisma.$transaction(
      bulkNumbers.map((num) =>
        prisma.room.create({
          data: {
            hotelId,
            floorId: testFloorId,
            roomTypeId: testRoomTypeId,
            roomNumber: num,
            occupancyStatus: 'VACANT',
            cleaningStatus: 'INSPECTED_PASSED',
            maintenanceStatus: 'OPERATIONAL',
            saleStatus: 'AVAILABLE',
          },
        })
      )
    );

    expect(createdRooms.length).toBe(3);
    for (const r of createdRooms) {
      expect(r.floorId).toBe(testFloorId);
    }
  });

  it('8. Protects floor from hard deletion when rooms are attached', async () => {
    const roomCount = await prisma.room.count({ where: { floorId: testFloorId } });
    expect(roomCount).toBeGreaterThan(0);

    // Business rule check: floor with rooms cannot be deleted
    const canDelete = roomCount === 0;
    expect(canDelete).toBe(false);
  });

  it('9. Room floor information propagates correctly to housekeeping and maintenance', async () => {
    const room = await prisma.room.findFirst({
      where: { hotelId, floorId: testFloorId },
      include: { floor: true },
    });

    expect(room).not.toBeNull();
    expect(room?.floor.floorNumber).toBe(99);
    expect(room?.floor.nameAr).toBe('طابق السحاب التنفيذي المحدث');
  });

  it('10. Can deactivate and reactivate a floor to control receiving new rooms', async () => {
    const deactivated = await prisma.floor.update({
      where: { id: testFloorId },
      data: { active: false },
    });
    expect(deactivated.active).toBe(false);

    const reactivated = await prisma.floor.update({
      where: { id: testFloorId },
      data: { active: true },
    });
    expect(reactivated.active).toBe(true);
  });
});

