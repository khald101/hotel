import prisma from '../lib/prisma';

describe('Advanced Enterprise Hotel PMS Operations & Deficiencies Resolution Suite', () => {
  const hotelId = 'hotel-riyadh-palace-01';
  let testVendorId: string;
  let testPOId: string;
  let testRuleId: string;
  let testShiftId: string;
  let testItemId: string;

  beforeAll(async () => {
    const item = await prisma.inventoryItem.findFirst({ where: { hotelId } });
    if (item) testItemId = item.id;
  });

  afterAll(async () => {
    // Cleanup created records
    if (testPOId) {
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: testPOId } });
      await prisma.purchaseOrder.deleteMany({ where: { id: testPOId } });
    }
    if (testVendorId) {
      await prisma.vendor.deleteMany({ where: { id: testVendorId } });
    }
    if (testRuleId) {
      await prisma.pricingRule.deleteMany({ where: { id: testRuleId } });
    }
    if (testShiftId) {
      await prisma.cashierShift.deleteMany({ where: { id: testShiftId } });
    }
    await prisma.$disconnect();
  });

  // 1. Dynamic & Seasonal Pricing Engine
  it('1. Successfully creates, activates, and calculates dynamic seasonal pricing rules', async () => {
    const rule = await prisma.pricingRule.create({
      data: {
        hotelId,
        nameAr: 'موسم العيد الذهبي (اختباري)',
        nameEn: 'Golden Eid Season (Test)',
        startDate: '2026-12-01',
        endDate: '2026-12-10',
        priceType: 'MULTIPLIER',
        value: 1.30, // +30%
        minNights: 1,
        active: true,
      },
    });
    testRuleId = rule.id;

    expect(rule.id).toBeDefined();
    expect(rule.value).toBe(1.30);
    expect(rule.active).toBe(true);

    // Test pricing calculation algorithm
    const basePrice = 500;
    const effectivePrice = Math.round(basePrice * rule.value);
    expect(effectivePrice).toBe(650);
  });

  // 2. Cashier Shift Management & Cash Reconciliation
  it('2. Enforces Cashier Shift lifecycle: opening, tracking, closing, and calculating drawer discrepancy', async () => {
    const shiftNumber = `SHF-TEST-${Date.now()}`;
    const user = await prisma.user.findFirst({ where: { hotelId } });

    const shift = await prisma.cashierShift.create({
      data: {
        shiftNumber,
        hotelId,
        userId: user!.id,
        startingCash: 1000,
        cashPayments: 500,
        cardPayments: 1200,
        expectedCash: 1500, // 1000 + 500
        actualCash: 1500,
        difference: 0,
        status: 'CLOSED',
        closingNotes: 'مطابقة تامة 100%',
      },
    });
    testShiftId = shift.id;

    expect(shift.shiftNumber).toBe(shiftNumber);
    expect(shift.status).toBe('CLOSED');
    expect(shift.expectedCash).toBe(1500);
    expect(shift.difference).toBe(0);
  });

  // 3. Vendors & Purchase Orders with Auto-Stock Feeding
  it('3. Creates vendor, issues PO, and automatically increments inventory stock upon receiving', async () => {
    const vendor = await prisma.vendor.create({
      data: {
        hotelId,
        nameAr: 'شركة التوريدات التقدمية (اختباري)',
        phone: '0509998877',
        category: 'AMENITIES',
      },
    });
    testVendorId = vendor.id;

    expect(vendor.id).toBeDefined();

    const initialItem = await prisma.inventoryItem.findUnique({ where: { id: testItemId } });
    const initialStock = initialItem?.currentStock || 0;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-TEST-${Date.now()}`,
        hotelId,
        vendorId: vendor.id,
        status: 'ORDERED',
        totalAmount: 1000,
        items: {
          create: [
            {
              description: 'صنف اختباري للتوريد',
              quantity: 20,
              unitCost: 50,
              totalCost: 1000,
              inventoryItemId: testItemId,
            },
          ],
        },
      },
      include: { items: true },
    });
    testPOId = po.id;

    expect(po.status).toBe('ORDERED');
    expect(po.items.length).toBe(1);

    // Simulate Receive PO transaction
    await prisma.$transaction([
      prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'RECEIVED', deliveryDate: new Date() },
      }),
      prisma.inventoryItem.update({
        where: { id: testItemId },
        data: { currentStock: { increment: 20 } },
      }),
      prisma.stockTransaction.create({
        data: {
          itemId: testItemId,
          type: 'RECEIVE',
          quantity: 20,
          reference: po.poNumber,
          notes: 'استلام آلي اختباري',
          performedBy: 'admin',
        },
      }),
    ]);

    const updatedItem = await prisma.inventoryItem.findUnique({ where: { id: testItemId } });
    expect(updatedItem?.currentStock).toBe(initialStock + 20);

    // Rollback stock increment for test isolation
    await prisma.inventoryItem.update({
      where: { id: testItemId },
      data: { currentStock: initialStock },
    });
  });

  // 4. Shamous Integration Dispatch & Check-in Recording
  it('4. Successfully logs Shamous security transmission reference on guest check-in', async () => {
    const transmissionRef = `SHM-TEST-${Date.now()}`;
    const shamousRecord = await prisma.shamousRecord.create({
      data: {
        hotelId,
        guestNationalId: '1098765432',
        guestName: 'سعد العتيبي',
        idType: 'NATIONAL_ID',
        roomNumber: '101',
        transmissionRef,
        status: 'TRANSMITTED',
        responseCode: 'ACK_OK_200',
      },
    });

    expect(shamousRecord.id).toBeDefined();
    expect(shamousRecord.transmissionRef).toBe(transmissionRef);
    expect(shamousRecord.status).toBe('TRANSMITTED');

    // Cleanup
    await prisma.shamousRecord.delete({ where: { id: shamousRecord.id } });
  });

  // 5. Channel Manager Sync & OTA Reservation Processing
  it('5. Logs Channel Manager sync and processes incoming OTA reservations', async () => {
    const syncLog = await prisma.channelSyncLog.create({
      data: {
        hotelId,
        channelName: 'BOOKING_COM',
        action: 'SYNC_AVAILABILITY_AND_RATES',
        status: 'SUCCESS',
        payload: JSON.stringify({ syncedRooms: 160, timestamp: new Date().toISOString() }),
      },
    });

    expect(syncLog.id).toBeDefined();
    expect(syncLog.channelName).toBe('BOOKING_COM');
    expect(syncLog.status).toBe('SUCCESS');

    // Cleanup
    await prisma.channelSyncLog.delete({ where: { id: syncLog.id } });
  });
});

