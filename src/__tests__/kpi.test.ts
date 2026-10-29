describe('Hospitality Financial & Operational KPI Unit Tests', () => {
  it('should accurately calculate Occupancy Rate, ADR, and RevPAR', () => {
    const totalRooms = 160;
    const occupiedRooms = 120;
    const totalRoomRevenue = 96000; // SAR

    // Occupancy %
    const occupancyRate = (occupiedRooms / totalRooms) * 100;
    expect(occupancyRate).toBe(75.0);

    // ADR = Room Revenue / Occupied Rooms
    const adr = totalRoomRevenue / occupiedRooms;
    expect(adr).toBe(800); // 800 SAR / occupied room

    // RevPAR = Total Room Revenue / Total Available Rooms
    const revpar = totalRoomRevenue / totalRooms;
    expect(revpar).toBe(600); // 600 SAR / available room

    // Mathematical verification: RevPAR == ADR * (OccupancyRate / 100)
    expect(revpar).toBe(adr * (occupancyRate / 100));
  });
});

