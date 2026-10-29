import { encodeZatcaTlv, decodeZatcaTlv } from '../lib/zatca';

describe('ZATCA Electronic Invoicing TLV Encoder Unit Tests', () => {
  it('should encode and decode TLV tags compliant with ZATCA Phase 1 & 2 standards', () => {
    const seller = 'فندق قصر الرياض الدولي';
    const vat = '310987654300003';
    const time = '2026-10-28T12:00:00Z';
    const total = 7590.0;
    const vatAmount = 990.0;

    const base64 = encodeZatcaTlv(seller, vat, time, total, vatAmount);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(20);

    const decoded = decodeZatcaTlv(base64);
    expect(decoded[1]).toBe(seller);
    expect(decoded[2]).toBe(vat);
    expect(decoded[3]).toBe(time);
    expect(decoded[4]).toBe('7590.00');
    expect(decoded[5]).toBe('990.00');
  });
});

