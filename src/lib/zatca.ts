/**
 * ZATCA (Saudi Zakat, Tax and Customs Authority) Phase 1 & 2 TLV QR Encoder
 * Compliant with Fatoora Electronic Invoicing specifications
 */

export function encodeZatcaTlv(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalInclusive: number,
  vatAmount: number
): string {
  function getTlvTag(tagNum: number, valStr: string): Buffer {
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

export function decodeZatcaTlv(base64Str: string): Record<number, string> {
  const buf = Buffer.from(base64Str, 'base64');
  let idx = 0;
  const tags: Record<number, string> = {};

  while (idx < buf.length) {
    const tagNum = buf[idx];
    const length = buf[idx + 1];
    const value = buf.subarray(idx + 2, idx + 2 + length).toString('utf8');
    tags[tagNum] = value;
    idx += 2 + length;
  }

  return tags;
}

