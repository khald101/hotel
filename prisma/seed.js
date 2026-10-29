const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper for ZATCA Phase 1 / 2 TLV QR Code generation
function generateZatcaTlvBase64(sellerName, vatNumber, timestamp, totalInclusive, vatAmount) {
  function getTlvTag(tagNum, valStr) {
    const valBuf = Buffer.from(valStr, 'utf8');
    const tagBuf = Buffer.from([tagNum]);
    const lenBuf = Buffer.from([valBuf.length]);
    return Buffer.concat([tagBuf, lenBuf, valBuf]);
  }

  const tag1 = getTlvTag(1, sellerName);
  const tag2 = getTlvTag(2, vatNumber);
  const tag3 = getTlvTag(3, timestamp);
  const tag4 = getTlvTag(4, totalInclusive.toFixed(2));
  const tag5 = getTlvTag(5, vatAmount.toFixed(2));

  return Buffer.concat([tag1, tag2, tag3, tag4, tag5]).toString('base64');
}

async function main() {
  console.log('Seeding enterprise hotel PMS database...');

  // 1. Hotel definition
  const hotel = await prisma.hotel.upsert({
    where: { code: 'RUH-PALACE-01' },
    update: {},
    create: {
      id: 'hotel-riyadh-palace-01',
      code: 'RUH-PALACE-01',
      nameAr: 'فندق قصر الرياض الدولي',
      nameEn: 'Riyadh International Palace Hotel',
      commercialReg: '1010987654',
      vatNumber: '310987654300003', // 15 digits ZATCA VAT
      phone: '+966 11 456 7890',
      email: 'info@riyadhpalace-hotel.sa',
      city: 'الرياض',
      address: 'طريق الملك فهد، حي الصحافة، الرياض، المملكة العربية السعودية',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      taxRate: 0.15,
      checkInTime: '14:00',
      checkOutTime: '12:00',
      active: true,
    },
  });

  // 2. Floors (Single Hotel Structure: Hotel -> Floors -> Rooms)
  const floorConfigs = [
    { number: 1, nameAr: 'الطابق الأول', nameEn: 'Floor 1', desc: 'أجنحة ديلوكس وغرف رجال أعمال' },
    { number: 2, nameAr: 'الطابق الثاني', nameEn: 'Floor 2', desc: 'غرف وأجنحة فسيحة بإطلالة بانورامية' },
    { number: 3, nameAr: 'الطابق الثالث', nameEn: 'Floor 3', desc: 'أجنحة عائلية فاخرة وخدمات مميزة' },
    { number: 4, nameAr: 'الطابق الرابع', nameEn: 'Floor 4', desc: 'أجنحة ملكية وتنفيذية لكبار الشخصيات' },
    { number: 5, nameAr: 'الطابق الخامس', nameEn: 'Floor 5', desc: 'الصالة العلوية والأجنحة البانورامية الملكية' },
  ];

  const floors = [];
  for (const fc of floorConfigs) {
    const floor = await prisma.floor.upsert({
      where: {
        hotelId_floorNumber: {
          hotelId: hotel.id,
          floorNumber: fc.number,
        },
      },
      update: {
        nameAr: fc.nameAr,
        nameEn: fc.nameEn,
        description: fc.desc,
      },
      create: {
        hotelId: hotel.id,
        floorNumber: fc.number,
        nameAr: fc.nameAr,
        nameEn: fc.nameEn,
        description: fc.desc,
        active: true,
      },
    });
    floors.push(floor);
  }

  // 4. Room Types
  const typeSingle = await prisma.roomType.upsert({
    where: { hotelId_code: { hotelId: hotel.id, code: 'SGL' } },
    update: {},
    create: {
      hotelId: hotel.id,
      code: 'SGL',
      nameAr: 'غرفة مفردة ديلوكس',
      nameEn: 'Deluxe Single Room',
      basePrice: 450,
      maxOccupancy: 1,
      bedType: 'سرير مفرد كبير (Queen)',
      amenities: JSON.stringify(['واي فاي عالي السرعة', 'شاشة ذكية 55 بوصة', 'آلة إسبريسو', 'مكتب عمل مريح']),
      description: 'غرفة أنيقة مصممة لراحة رجال الأعمال والمفردين بأعلى معايير الرفاهية.',
    },
  });

  const typeDouble = await prisma.roomType.upsert({
    where: { hotelId_code: { hotelId: hotel.id, code: 'DBL' } },
    update: {},
    create: {
      hotelId: hotel.id,
      code: 'DBL',
      nameAr: 'غرفة مزدوجة بريميوم',
      nameEn: 'Premium Double Room',
      basePrice: 650,
      maxOccupancy: 2,
      bedType: 'سرير كينج ملكي (King)',
      amenities: JSON.stringify(['إطلالة بانورامية', 'شاشة ذكية 65 بوصة', 'حمّام رخامي فاخر', 'ميني بار']),
      description: 'غرفة فسيحة بإطلالة خلابة وتجهيزات ضيافة متطورة.',
    },
  });

  const typeFamily = await prisma.roomType.upsert({
    where: { hotelId_code: { hotelId: hotel.id, code: 'FAM' } },
    update: {},
    create: {
      hotelId: hotel.id,
      code: 'FAM',
      nameAr: 'جناح عائلي واسع',
      nameEn: 'Spacious Family Suite',
      basePrice: 1100,
      maxOccupancy: 4,
      bedType: '1 كينج + 2 سرير مفرد',
      amenities: JSON.stringify(['صالة معيشة مستقلة', 'ركن تحضير قهوة', 'منطقة ألعاب أطفال', 'خدمة غرف مميزة']),
      description: 'جناح مثالي للعائلات مع خصوصية تامة وصالة معيشة راقية.',
    },
  });

  const typeSuite = await prisma.roomType.upsert({
    where: { hotelId_code: { hotelId: hotel.id, code: 'STE' } },
    update: {},
    create: {
      hotelId: hotel.id,
      code: 'STE',
      nameAr: 'الجناح الملكي التنفيذي',
      nameEn: 'Royal Executive Suite',
      basePrice: 2200,
      maxOccupancy: 3,
      bedType: 'سرير سوبر كينج إيطالي',
      amenities: JSON.stringify(['مدخل خاص', 'جاكوزي خاص', 'إفطار مجاني في الصالة الملكية', 'خادم شخصي']),
      description: 'قمة الفخامة والخصوصية لكبار الشخصيات ورجال الأعمال.',
    },
  });

  const roomTypes = [typeSingle, typeDouble, typeFamily, typeSuite];

  // 5. Seed 160 Real Rooms
  console.log('Generating 160 hotel rooms across 5 floors...');
  const roomsCreated = [];
  let totalRoomCounter = 1;

  for (let f = 1; f <= 5; f++) {
    const floor = floors[f - 1];
    const roomCountOnFloor = (f <= 3) ? 30 : 35; // 30*3 + 35*2 = 160 rooms

    for (let r = 1; r <= roomCountOnFloor; r++) {
      const roomNumStr = `${f}${r.toString().padStart(2, '0')}`; // e.g. 101, 102 ... 535
      const selectedType = (r <= 12) ? typeSingle : (r <= 24) ? typeDouble : (r <= 28) ? typeFamily : typeSuite;

      // Realistic initial status variations
      let occupancy = 'VACANT';
      let cleaning = 'INSPECTED_PASSED';
      let maintenance = 'OPERATIONAL';
      let sale = 'AVAILABLE';

      if (r === 1 || r === 2) {
        occupancy = 'OCCUPIED';
        cleaning = 'CLEANED';
      } else if (r === 3) {
        occupancy = 'VACANT';
        cleaning = 'PENDING_CLEANING';
      } else if (r === 4) {
        occupancy = 'VACANT';
        cleaning = 'CLEANING_IN_PROGRESS';
      } else if (r === 5) {
        occupancy = 'VACANT';
        cleaning = 'PENDING_INSPECTION';
      } else if (r === 6) {
        occupancy = 'VACANT';
        cleaning = 'NEEDS_RECLEAN';
      } else if (r === 7) {
        maintenance = 'UNDER_MAINTENANCE';
        sale = 'OUT_OF_ORDER';
      }

      const room = await prisma.room.upsert({
        where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: roomNumStr } },
        update: {},
        create: {
          hotelId: hotel.id,
          floorId: floor.id,
          roomTypeId: selectedType.id,
          roomNumber: roomNumStr,
          occupancyStatus: occupancy,
          cleaningStatus: cleaning,
          maintenanceStatus: maintenance,
          saleStatus: sale,
          features: r % 2 === 0 ? 'إطلالة مدينة, غير مدخنين' : 'إطلالة حديقة, غير مدخنين',
          active: true,
        },
      });
      roomsCreated.push(room);
      totalRoomCounter++;
    }
  }
  console.log(`Successfully generated ${roomsCreated.length} rooms.`);

  // 6. Users and Roles (Required: المنظف + مدير الكوشن + Standard PMS roles)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const usersData = [
    {
      username: 'admin',
      fullName: 'عبدالله السديري',
      email: 'admin@riyadhpalace-hotel.sa',
      phone: '0501112233',
      role: 'ADMIN',
      jobTitle: 'مسؤول النظام العام',
      department: 'الإدارة والتقنية',
      permissions: JSON.stringify(['ALL']),
    },
    {
      username: 'gm',
      fullName: 'سلطان القحطاني',
      email: 'gm@riyadhpalace-hotel.sa',
      phone: '0502223344',
      role: 'GENERAL_MANAGER',
      jobTitle: 'المدير العام للفندق',
      department: 'الإدارة التنفيذية',
      permissions: JSON.stringify(['REPORTS', 'RESERVATIONS', 'FRONTDESK', 'HOUSEKEEPING', 'FINANCE', 'AUDIT']),
    },
    {
      username: 'reception',
      fullName: 'فهد العتيبي',
      email: 'reception@riyadhpalace-hotel.sa',
      phone: '0503334455',
      role: 'RECEPTIONIST',
      jobTitle: 'مسؤول الاستقبال والتسكين',
      department: 'الاستقبال وخدمات النزلاء',
      permissions: JSON.stringify(['FRONTDESK', 'RESERVATIONS', 'GUESTS', 'BILLING_VIEW']),
    },
    {
      username: 'supervisor',
      fullName: 'سارة الدوسري',
      email: 'hk_supervisor@riyadhpalace-hotel.sa',
      phone: '0504445566',
      role: 'HOUSEKEEPING_SUPERVISOR',
      jobTitle: 'مشرفة التدبير الفندقي والتفتيش',
      department: 'التدبير الفندقي',
      permissions: JSON.stringify(['HOUSEKEEPING_SUPERVISE', 'INSPECT_ROOM', 'ASSIGN_TASK']),
    },
    {
      username: 'cleaner1',
      fullName: 'كومار راجو (عامل نظافة 1)',
      email: 'cleaner1@riyadhpalace-hotel.sa',
      phone: '0505556677',
      role: 'CLEANER',
      jobTitle: 'المنظف',
      department: 'التدبير الفندقي',
      permissions: JSON.stringify(['CLEANER_PORTAL']),
    },
    {
      username: 'cleaner2',
      fullName: 'محمد نور (عامل نظافة 2)',
      email: 'cleaner2@riyadhpalace-hotel.sa',
      phone: '0506667788',
      role: 'CLEANER',
      jobTitle: 'المنظف',
      department: 'التدبير الفندقي',
      permissions: JSON.stringify(['CLEANER_PORTAL']),
    },
    {
      username: 'cushion_manager',
      fullName: 'طارق الزهراني',
      email: 'cushion@riyadhpalace-hotel.sa',
      phone: '0507778899',
      role: 'CUSHION_MANAGER',
      jobTitle: 'مدير الكوشن',
      department: 'إدارة العمليات الخاصة والمخملية (الكوشن)',
      permissions: JSON.stringify(['CUSHION_OPERATIONS', 'VIP_SERVICES', 'ROOMS_CUSTOM_VIEW', 'INVENTORY_VIEW']),
    },
    {
      username: 'maintenance',
      fullName: 'خالد المطيري',
      email: 'maint@riyadhpalace-hotel.sa',
      phone: '0508889900',
      role: 'MAINTENANCE_TECH',
      jobTitle: 'فني الصيانة العامة',
      department: 'الهندسة والصيانة',
      permissions: JSON.stringify(['MAINTENANCE']),
    },
    {
      username: 'accountant',
      fullName: 'منيرة الشمري',
      email: 'finance@riyadhpalace-hotel.sa',
      phone: '0509990011',
      role: 'ACCOUNTANT',
      jobTitle: 'المحاسب المالي ومدير الفوترة',
      department: 'الشؤون المالية والمحاسبة',
      permissions: JSON.stringify(['FINANCE', 'INVOICES', 'PAYMENTS', 'ZATCA', 'REPORTS_FINANCIAL']),
    },
    {
      username: 'chef_pos',
      fullName: 'عمر المصري',
      email: 'pos@riyadhpalace-hotel.sa',
      phone: '0501234567',
      role: 'RESTAURANT_STAFF',
      jobTitle: 'مسؤول خدمات المطاعم والطلبات',
      department: 'الأغذية والمشروبات POS',
      permissions: JSON.stringify(['POS_ORDERS', 'MENU_VIEW', 'ROOM_CHARGE']),
    },
  ];

  const createdUsers = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        hotelId: hotel.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        passwordHash: passwordHash,
        role: u.role,
        jobTitle: u.jobTitle,
        department: u.department,
        permissions: u.permissions,
        active: true,
      },
    });
    createdUsers[u.username] = user;
  }

  // 7. Guests
  const guest1 = await prisma.guest.upsert({
    where: { idType_nationalId: { idType: 'NATIONAL_ID', nationalId: '1098765432' } },
    update: {},
    create: {
      nationalId: '1098765432',
      idType: 'NATIONAL_ID',
      fullNameAr: 'محمد بن عبدالعزيز الراجحي',
      fullNameEn: 'Mohammed Abdulaziz Al-Rajhi',
      phone: '0555123456',
      email: 'm.rajhi@example.sa',
      nationality: 'SA',
      isVip: true,
      vipLevel: 'PLATINUM',
      preferences: 'طابق علوي، وسائد إضافية، قهوة عربية عند الوصول',
      totalStays: 4,
    },
  });

  const guest2 = await prisma.guest.upsert({
    where: { idType_nationalId: { idType: 'IQAMA', nationalId: '2345678901' } },
    update: {},
    create: {
      nationalId: '2345678901',
      idType: 'IQAMA',
      fullNameAr: 'أحمد محمود رضوان',
      fullNameEn: 'Ahmed Mahmoud Radwan',
      phone: '0544987654',
      email: 'ahmed.radwan@example.com',
      nationality: 'EG',
      isVip: false,
      totalStays: 1,
    },
  });

  const guest3 = await prisma.guest.upsert({
    where: { idType_nationalId: { idType: 'PASSPORT', nationalId: 'A89765412' } },
    update: {},
    create: {
      nationalId: 'A89765412',
      idType: 'PASSPORT',
      fullNameAr: 'جون أندرسون',
      fullNameEn: 'John Anderson',
      phone: '+447911123456',
      email: 'john.anderson@example.uk',
      nationality: 'GB',
      isVip: true,
      vipLevel: 'GOLD',
      totalStays: 2,
    },
  });

  // 8. Active Reservation & Check-in Stay for Room 101
  const room101 = await prisma.room.findUnique({
    where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: '101' } },
  });

  if (room101) {
    const res1 = await prisma.reservation.upsert({
      where: { confirmationNo: 'RES-2026-0001' },
      update: {},
      create: {
        confirmationNo: 'RES-2026-0001',
        hotelId: hotel.id,
        guestId: guest1.id,
        roomTypeId: typeSuite.id,
        assignedRoomId: room101.id,
        checkInDate: '2026-10-28',
        checkOutDate: '2026-10-31',
        nightsCount: 3,
        adultsCount: 2,
        childrenCount: 0,
        nightlyRate: 2200,
        subtotal: 6600,
        taxAmount: 990,
        totalAmount: 7590,
        status: 'CHECKED_IN',
        source: 'DIRECT',
        specialRequests: 'إجراءات تسجيل دخول سريعة في الصالة التنفيذية',
      },
    });

    await prisma.stayRecord.upsert({
      where: { reservationId: res1.id },
      update: {},
      create: {
        reservationId: res1.id,
        guestId: guest1.id,
        roomId: room101.id,
        checkedInBy: 'reception',
        status: 'ACTIVE',
        roomKeyCardNo: 'KEY-CARD-101-A',
      },
    });

    // Create Folio
    const folio1 = await prisma.folio.upsert({
      where: { folioNumber: 'FOL-2026-0001' },
      update: {},
      create: {
        folioNumber: 'FOL-2026-0001',
        hotelId: hotel.id,
        guestId: guest1.id,
        reservationId: res1.id,
        status: 'OPEN',
        totalCharges: 7590,
        totalPayments: 7590,
        balance: 0,
      },
    });

    await prisma.folioItem.createMany({
      data: [
        {
          folioId: folio1.id,
          category: 'ROOM_CHARGE',
          description: 'رسوم إقامة الجناح الملكي التنفيذي (3 ليالٍ)',
          quantity: 3,
          unitPrice: 2200,
          taxAmount: 990,
          totalAmount: 7590,
          postedBy: 'reception',
        },
      ],
    });

    // Payment recorded
    await prisma.payment.upsert({
      where: { paymentNumber: 'PAY-2026-0001' },
      update: {},
      create: {
        folioId: folio1.id,
        paymentNumber: 'PAY-2026-0001',
        amount: 7590,
        method: 'MADA',
        transactionRef: 'MADA-AUTH-998821',
        idempotencyKey: 'IDEMP-PAY-0001',
        status: 'COMPLETED',
        notes: 'تم الدفع بالكامل عبر بطاقة مدى',
        receivedBy: 'reception',
      },
    });

    // ZATCA Simplified Tax Invoice with compliant TLV QR
    const nowIso = new Date().toISOString();
    const zatcaQr = generateZatcaTlvBase64(
      hotel.nameAr,
      hotel.vatNumber,
      nowIso,
      7590,
      990
    );

    await prisma.invoice.upsert({
      where: { invoiceNumber: 'INV-2026-00001' },
      update: {},
      create: {
        invoiceNumber: 'INV-2026-00001',
        hotelId: hotel.id,
        folioId: folio1.id,
        uuid: 'd8c558c4-1188-4e89-a2e6-764fba1a0911',
        sellerName: hotel.nameAr,
        sellerVat: hotel.vatNumber,
        buyerName: guest1.fullNameAr,
        subtotal: 6600,
        taxAmount: 990,
        totalInclusive: 7590,
        zatcaQrCode: zatcaQr,
        zatcaStatus: 'REPORTED',
        invoiceType: 'SIMPLIFIED_TAX_INVOICE',
      },
    });
  }

  // 9. Housekeeping Tasks (Cleaners assigned)
  const room103 = await prisma.room.findUnique({
    where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: '103' } },
  });
  if (room103) {
    await prisma.housekeepingTask.upsert({
      where: { taskNumber: 'HSK-2026-0001' },
      update: {},
      create: {
        taskNumber: 'HSK-2026-0001',
        roomId: room103.id,
        assignedToId: createdUsers['cleaner1'].id,
        priority: 'HIGH',
        status: 'PENDING',
        cleanerNotes: 'النزيل غادر صباحاً والمغادرة مؤكدة',
      },
    });
  }

  const room104 = await prisma.room.findUnique({
    where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: '104' } },
  });
  if (room104) {
    await prisma.housekeepingTask.upsert({
      where: { taskNumber: 'HSK-2026-0002' },
      update: {},
      create: {
        taskNumber: 'HSK-2026-0002',
        roomId: room104.id,
        assignedToId: createdUsers['cleaner1'].id,
        priority: 'NORMAL',
        status: 'IN_PROGRESS',
        cleanerNotes: 'بدأ التنظيف الساعة 09:30',
        startedAt: new Date(),
      },
    });
  }

  const room105 = await prisma.room.findUnique({
    where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: '105' } },
  });
  if (room105) {
    await prisma.housekeepingTask.upsert({
      where: { taskNumber: 'HSK-2026-0003' },
      update: {},
      create: {
        taskNumber: 'HSK-2026-0003',
        roomId: room105.id,
        assignedToId: createdUsers['cleaner2'].id,
        priority: 'URGENT',
        status: 'PENDING_INSPECTION',
        cleanerNotes: 'تم الانتهاء من التنظيف وتغيير الشراشف بالكامل بانتظار تفتيش المشرفة',
        completedAt: new Date(),
      },
    });
  }

  // 10. Maintenance Ticket
  const room107 = await prisma.room.findUnique({
    where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: '107' } },
  });
  if (room107) {
    await prisma.maintenanceTicket.upsert({
      where: { ticketNumber: 'MNT-2026-0001' },
      update: {},
      create: {
        ticketNumber: 'MNT-2026-0001',
        roomId: room107.id,
        issueType: 'HVAC',
        priority: 'HIGH',
        status: 'UNDER_MAINTENANCE',
        reportedById: createdUsers['supervisor'].id,
        assignedToId: createdUsers['maintenance'].id,
        description: 'مكيف الغرفة لا يبرد بالشكل المطلوب ويصدر صوتاً خفيفاً',
        blocksRoomSale: true,
      },
    });
  }

  // 11. Restaurant Outlet & Menu
  const restaurant = await prisma.restaurantOutlet.upsert({
    where: { id: 'outlet-al-nakheel' },
    update: {},
    create: {
      id: 'outlet-al-nakheel',
      hotelId: hotel.id,
      code: 'NAKHEEL-01',
      nameAr: 'مطعم قصر النخيل الفاخر',
      nameEn: 'Al Nakheel Fine Dining',
      active: true,
    },
  });

  const catBreakfast = await prisma.menuCategory.create({
    data: {
      outletId: restaurant.id,
      nameAr: 'الفطور الملكي',
      nameEn: 'Royal Breakfast',
      sortOrder: 1,
    },
  });

  const catMains = await prisma.menuCategory.create({
    data: {
      outletId: restaurant.id,
      nameAr: 'الأطباق الرئيسية السعودية والعالمية',
      nameEn: 'Main Courses',
      sortOrder: 2,
    },
  });

  if ((await prisma.menuItem.count()) === 0) {
    await prisma.menuItem.createMany({
      data: [
        {
          categoryId: catBreakfast.id,
          nameAr: 'بوفيه الفطور السعودي الفاخر',
          nameEn: 'Saudi Royal Breakfast Buffet',
          price: 120,
          taxIncluded: true,
        },
        {
          categoryId: catMains.id,
          nameAr: 'مفطح حري ملكي خاص',
          nameEn: 'Royal Harri Lamb Feast',
          price: 280,
          taxIncluded: true,
        },
        {
          categoryId: catMains.id,
          nameAr: 'كبسة حاشي فاخرة بالزعفران',
          nameEn: 'Premium Saffron Camel Kabsa',
          price: 160,
          taxIncluded: true,
        },
      ],
    });
  }

  // 12. Inventory items
  if ((await prisma.inventoryItem.count()) === 0) {
    await prisma.inventoryItem.createMany({
      data: [
      {
        hotelId: hotel.id,
        sku: 'AMN-SOAP-01',
        nameAr: 'صابون ضيافة فاخر بزيت الزيتون',
        nameEn: 'Luxury Olive Hospitality Soap',
        category: 'AMENITIES',
        unit: 'PCS',
        minStock: 200,
        currentStock: 1450,
        unitCost: 2.5,
      },
      {
        hotelId: hotel.id,
        sku: 'LIN-TOWEL-01',
        nameAr: 'مناشف قطن مصري 100% 700gsm',
        nameEn: 'Egyptian Cotton Towel 700gsm',
        category: 'HOUSEKEEPING',
        unit: 'PCS',
        minStock: 100,
        currentStock: 520,
        unitCost: 45,
      },
      {
        hotelId: hotel.id,
        sku: 'MNT-FLTR-01',
        nameAr: 'فلاتر تكييف مركزي HEPA',
        nameEn: 'HVAC HEPA Filters',
        category: 'MAINTENANCE',
        unit: 'BOX',
        minStock: 15,
        currentStock: 48,
        unitCost: 120,
      },
    ],
  });
  }

  // 13. Audit Log Initial Entry
  await prisma.auditLog.create({
    data: {
      hotelId: hotel.id,
      userId: createdUsers['admin'].id,
      username: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'Hotel',
      entityId: hotel.id,
      details: 'تم تأسيس النظام الأولي لفندق قصر الرياض الدولي وإنشاء 160 غرفة وكافة الحسابات الإدارية والتشغيلية بنجاح.',
    },
  });

  // 14. Dynamic & Seasonal Pricing Rules
  if ((await prisma.pricingRule.count()) === 0) {
    await prisma.pricingRule.createMany({
      data: [
        {
          hotelId: hotel.id,
          nameAr: 'موسم الرياض والفعاليات الكبرى',
          nameEn: 'Riyadh Season & High Demand',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          priceType: 'MULTIPLIER',
          value: 1.20, // +20%
          minNights: 1,
          active: true,
        },
        {
          hotelId: hotel.id,
          nameAr: 'عرض الصيف المخملي (خصم ترويجي)',
          nameEn: 'Velvet Summer Promotion',
          startDate: '2026-06-01',
          endDate: '2026-08-31',
          priceType: 'MULTIPLIER',
          value: 0.90, // -10% discount
          minNights: 2,
          active: true,
        },
      ],
    });
  }

  // 15. Vendors and Procurement
  if ((await prisma.vendor.count()) === 0) {
    const v1 = await prisma.vendor.create({
      data: {
        hotelId: hotel.id,
        nameAr: 'شركة أفق الضيافة للمفروشات والمستلزمات',
        contactPerson: 'عبدالعزيز الشمري',
        phone: '0501234567',
        email: 'sales@ofooq-hospitality.sa',
        taxNumber: '310987654300001',
        category: 'HOUSEKEEPING',
        active: true,
      },
    });

    const v2 = await prisma.vendor.create({
      data: {
        hotelId: hotel.id,
        nameAr: 'مؤسسة التموين والأغذية الفاخرة',
        contactPerson: 'فهد العتيبي',
        phone: '0559876543',
        email: 'orders@luxury-catering.sa',
        taxNumber: '310987654300002',
        category: 'FOOD_BEVERAGE',
        active: true,
      },
    });

    const sampleItem = await prisma.inventoryItem.findFirst({ where: { hotelId: hotel.id } });

    await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-2026-0001',
        hotelId: hotel.id,
        vendorId: v1.id,
        status: 'RECEIVED',
        totalAmount: 4500,
        notes: 'توريد مناشف وأرواب قطنية ديلوكس لأجنحة الفندق',
        items: {
          create: [
            {
              description: 'أرواب استحمام قطن مصري فاخر',
              quantity: 50,
              unitCost: 90,
              totalCost: 4500,
              inventoryItemId: sampleItem ? sampleItem.id : null,
            },
          ],
        },
      },
    });
  }

  // 16. Cashier Shift Management Initial Record
  if ((await prisma.cashierShift.count()) === 0) {
    await prisma.cashierShift.create({
      data: {
        shiftNumber: 'SHF-2026-0001',
        hotelId: hotel.id,
        userId: createdUsers['reception'].id,
        startingCash: 1000,
        cashPayments: 1500,
        cardPayments: 4800,
        expectedCash: 2500,
        actualCash: 2500,
        difference: 0,
        status: 'CLOSED',
        closingNotes: 'تم تسليم الوردية الصباحية ومطابقة الصندوق والعهد النقدية بدقة 100%.',
      },
    });

    // Active Open shift
    await prisma.cashierShift.create({
      data: {
        shiftNumber: 'SHF-2026-0002',
        hotelId: hotel.id,
        userId: createdUsers['reception'].id,
        startingCash: 1000,
        cashPayments: 450,
        cardPayments: 1800,
        expectedCash: 1450,
        status: 'OPEN',
      },
    });
  }

  // 17. Channel Manager Sync Log Initial Record
  if ((await prisma.channelSyncLog.count()) === 0) {
    await prisma.channelSyncLog.createMany({
      data: [
        {
          hotelId: hotel.id,
          channelName: 'BOOKING_COM',
          action: 'SYNC_AVAILABILITY',
          status: 'SUCCESS',
          payload: JSON.stringify({ syncedRooms: 160, status: 'OK' }),
        },
        {
          hotelId: hotel.id,
          channelName: 'EXPEDIA',
          action: 'SYNC_RATES',
          status: 'SUCCESS',
          payload: JSON.stringify({ ratePlans: ['SGL', 'DBL', 'FAM', 'STE', 'EXC'], status: 'OK' }),
        },
      ],
    });
  }

  console.log('Seeding completed successfully with 160 rooms, multi-roles, and realistic workflow data!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

