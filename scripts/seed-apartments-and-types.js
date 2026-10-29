const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hotel = await prisma.hotel.findFirst();
  if (!hotel) {
    console.error('No hotel found');
    return;
  }

  console.log('Hotel ID:', hotel.id);

  // 1. Define standard room & apartment types with requested prices
  const typesToEnsure = [
    {
      code: 'SGL',
      nameAr: 'غرفة مفردة',
      nameEn: 'Single Room',
      basePrice: 150,
      maxOccupancy: 1,
      bedType: 'سرير مفرد مريح',
      description: 'غرفة مفردة مجهزة بالكامل لراحة النزيل، تشمل مكتب عمل وواي فاي مجاني.',
    },
    {
      code: 'DBL',
      nameAr: 'غرفة مزدوجة',
      nameEn: 'Double Room',
      basePrice: 250,
      maxOccupancy: 2,
      bedType: 'سرير كينج مزدوج',
      description: 'غرفة مزدوجة واسعة لشخصين مع إطلالة وشاشة ذكية وحمام خاص.',
    },
    {
      code: 'FAM',
      nameAr: 'غرفة عائلية',
      nameEn: 'Family Room',
      basePrice: 350,
      maxOccupancy: 4,
      bedType: '1 سرير كينج + 2 سرير مفرد',
      description: 'غرفة عائلية رحبة تناسب العائلات مع منطقة جلوس وتجهيزات متكاملة.',
    },
    {
      code: 'ROYAL',
      nameAr: 'جناح ملكي',
      nameEn: 'Royal Suite',
      basePrice: 800,
      maxOccupancy: 4,
      bedType: 'سرير سوبر كينج إيطالي',
      description: 'جناح ملكي فاخر بأعلى درجات الرفاهية، صالة استقبال خاصة وخدمات VIP.',
    },
    {
      code: 'APT_1BD',
      nameAr: 'شقة غرفة وصالة',
      nameEn: 'One-Bedroom Apartment',
      basePrice: 400,
      maxOccupancy: 3,
      bedType: 'سرير كينج + صوفا بد',
      description: 'شقة فندقية متكاملة تتكون من غرفة نوم رئيسية، صالة جلوس، ومطبخ تحضيري مجهز.',
    },
    {
      code: 'APT_2BD',
      nameAr: 'شقة غرفتين وصالة',
      nameEn: 'Two-Bedroom Apartment',
      basePrice: 600,
      maxOccupancy: 5,
      bedType: '2 سرير كينج + صالون عائلي',
      description: 'شقة فندقية فسيحة للعائلات تتكون من غرفتي نوم وصالة معيشة كبيرة ومطبخ كامل.',
    },
  ];

  const createdTypes = {};

  for (const t of typesToEnsure) {
    const upserted = await prisma.roomType.upsert({
      where: {
        hotelId_code: {
          hotelId: hotel.id,
          code: t.code,
        },
      },
      update: {
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        basePrice: t.basePrice,
        maxOccupancy: t.maxOccupancy,
        bedType: t.bedType,
        description: t.description,
        active: true,
      },
      create: {
        hotelId: hotel.id,
        code: t.code,
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        basePrice: t.basePrice,
        maxOccupancy: t.maxOccupancy,
        bedType: t.bedType,
        description: t.description,
        active: true,
      },
    });
    createdTypes[t.code] = upserted;
    console.log(`✓ Saved Room/Apartment Type: ${t.nameAr} - ${t.basePrice} SAR (${t.code})`);
  }

  // 2. Assign some actual rooms on Floor 2 and 3 to be Apartments
  // Rooms 221 to 230 -> شقة غرفة وصالة (APT_1BD)
  // Rooms 321 to 330 -> شقة غرفتين وصالة (APT_2BD)
  const apt1Rooms = await prisma.room.findMany({
    where: {
      hotelId: hotel.id,
      roomNumber: { in: ['221', '222', '223', '224', '225', '226', '227', '228', '229', '230'] },
    },
  });

  for (const rm of apt1Rooms) {
    await prisma.room.update({
      where: { id: rm.id },
      data: {
        roomTypeId: createdTypes['APT_1BD'].id,
        occupancyStatus: 'VACANT',
        cleaningStatus: 'INSPECTED_PASSED',
        maintenanceStatus: 'OPERATIONAL',
        saleStatus: 'AVAILABLE',
        features: 'شقة غرفة وصالة فندقية، مطبخ مجهز، إطلالة مدينة',
      },
    });
  }
  console.log(`✓ Configured 10 units as 'شقة غرفة وصالة' (Rooms 221-230)`);

  const apt2Rooms = await prisma.room.findMany({
    where: {
      hotelId: hotel.id,
      roomNumber: { in: ['321', '322', '323', '324', '325', '326', '327', '328', '329', '330'] },
    },
  });

  for (const rm of apt2Rooms) {
    await prisma.room.update({
      where: { id: rm.id },
      data: {
        roomTypeId: createdTypes['APT_2BD'].id,
        occupancyStatus: 'VACANT',
        cleaningStatus: 'INSPECTED_PASSED',
        maintenanceStatus: 'OPERATIONAL',
        saleStatus: 'AVAILABLE',
        features: 'شقة غرفتين وصالة فندقية فخمة، مطبخ متكامل، غسالة ملابس',
      },
    });
  }
  console.log(`✓ Configured 10 units as 'شقة غرفتين وصالة' (Rooms 321-330)`);

  // 3. Create a Guest and Confirmed Arrival for an Apartment
  let guestArrival = await prisma.guest.findFirst({
    where: { nationalId: '1088776655' },
  });
  if (!guestArrival) {
    guestArrival = await prisma.guest.create({
      data: {
        nationalId: '1088776655',
        idType: 'NATIONAL_ID',
        fullNameAr: 'سلطان بن عبدالعزيز القحطاني',
        phone: '0567890123',
        email: 'sultan.q@example.sa',
        nationality: 'SA',
      },
    });
  }

  const room221 = await prisma.room.findFirst({
    where: { hotelId: hotel.id, roomNumber: '221' },
  });

  if (room221) {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    const arrivalRes = await prisma.reservation.upsert({
      where: { confirmationNo: 'RES-APT-2026-001' },
      update: {
        assignedRoomId: room221.id,
        roomTypeId: createdTypes['APT_1BD'].id,
        status: 'CONFIRMED',
      },
      create: {
        confirmationNo: 'RES-APT-2026-001',
        hotelId: hotel.id,
        guestId: guestArrival.id,
        roomTypeId: createdTypes['APT_1BD'].id,
        assignedRoomId: room221.id, // Booked room locked in
        checkInDate: todayStr,
        checkOutDate: tomorrowStr,
        nightsCount: 2,
        nightlyRate: 400,
        subtotal: 800,
        taxAmount: 120,
        totalAmount: 920,
        status: 'CONFIRMED',
        source: 'DIRECT',
        specialRequests: 'تسجيل دخول سريع، النزيل قادم من المطار',
      },
    });
    console.log(`✓ Created Confirmed Arrival for Apartment: #${room221.roomNumber} for Sultan Al-Qahtani`);
  }

  // Another arrival for Two-Bedroom Apartment
  const room321 = await prisma.room.findFirst({
    where: { hotelId: hotel.id, roomNumber: '321' },
  });

  if (room321) {
    let guest2 = await prisma.guest.findFirst({
      where: { nationalId: '1077665544' },
    });
    if (!guest2) {
      guest2 = await prisma.guest.create({
        data: {
          nationalId: '1077665544',
          idType: 'NATIONAL_ID',
          fullNameAr: 'عبدالله بن فهد الدوسري',
          phone: '0551239876',
          nationality: 'SA',
        },
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkoutStr = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

    await prisma.reservation.upsert({
      where: { confirmationNo: 'RES-APT-2026-002' },
      update: {
        assignedRoomId: room321.id,
        roomTypeId: createdTypes['APT_2BD'].id,
        status: 'CONFIRMED',
      },
      create: {
        confirmationNo: 'RES-APT-2026-002',
        hotelId: hotel.id,
        guestId: guest2.id,
        roomTypeId: createdTypes['APT_2BD'].id,
        assignedRoomId: room321.id, // Booked room locked in
        checkInDate: todayStr,
        checkOutDate: checkoutStr,
        nightsCount: 3,
        nightlyRate: 600,
        subtotal: 1800,
        taxAmount: 270,
        totalAmount: 2070,
        status: 'CONFIRMED',
        source: 'DIRECT',
        specialRequests: 'شقة غرفتين وصالة - عائلة مع أطفال',
      },
    });
    console.log(`✓ Created Confirmed Arrival for 2-BD Apartment: #${room321.roomNumber} for Abdullah Al-Dosari`);
  }

  console.log('Seeding finished successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
