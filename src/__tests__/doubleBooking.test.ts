describe('Double Booking Prevention Algorithm Tests', () => {
  function hasDateConflict(
    existingBooking: { checkInDate: string; checkOutDate: string },
    newBooking: { checkInDate: string; checkOutDate: string }
  ): boolean {
    const existingStart = new Date(existingBooking.checkInDate).getTime();
    const existingEnd = new Date(existingBooking.checkOutDate).getTime();
    const newStart = new Date(newBooking.checkInDate).getTime();
    const newEnd = new Date(newBooking.checkOutDate).getTime();

    // Standard interval overlap: (newStart < existingEnd) && (newEnd > existingStart)
    return newStart < existingEnd && newEnd > existingStart;
  }

  it('should detect overlapping date conflicts accurately', () => {
    const existing = { checkInDate: '2026-11-01', checkOutDate: '2026-11-05' };

    // Case 1: Exact same dates -> Conflict
    expect(hasDateConflict(existing, { checkInDate: '2026-11-01', checkOutDate: '2026-11-05' })).toBe(true);

    // Case 2: Overlapping in the middle -> Conflict
    expect(hasDateConflict(existing, { checkInDate: '2026-11-02', checkOutDate: '2026-11-04' })).toBe(true);

    // Case 3: Overlapping start -> Conflict
    expect(hasDateConflict(existing, { checkInDate: '2026-10-30', checkOutDate: '2026-11-02' })).toBe(true);

    // Case 4: Sequential booking: Checkin on same day previous checkout -> NO Conflict (Same room turnaround)
    expect(hasDateConflict(existing, { checkInDate: '2026-11-05', checkOutDate: '2026-11-08' })).toBe(false);

    // Case 5: Completely before -> NO Conflict
    expect(hasDateConflict(existing, { checkInDate: '2026-10-20', checkOutDate: '2026-10-25' })).toBe(false);
  });
});

