import { decryptSecret, encryptSecret, randomToken, safeEqual, sha256Hex } from './crypto';

describe('crypto utilities', () => {
  const key = 'unit-test-key-material-0123456789';

  it('round-trips AES-256-GCM encryption', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const enc = encryptSecret(secret, key);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc, key)).toBe(secret);
  });

  it('produces a distinct ciphertext per call (random nonce)', () => {
    expect(encryptSecret('same', key)).not.toBe(encryptSecret('same', key));
  });

  it('fails on tampered ciphertext', () => {
    const enc = encryptSecret('secret', key);
    const parts = enc.split('.');
    parts[3] = Buffer.from('tampered!').toString('base64');
    expect(() => decryptSecret(parts.join('.'), key)).toThrow();
  });

  it('fails with the wrong key', () => {
    const enc = encryptSecret('secret', key);
    expect(() => decryptSecret(enc, 'another-key-material-9876543210')).toThrow();
  });

  it('sha256Hex is stable and hex-shaped', () => {
    expect(sha256Hex('shieldwise')).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex('shieldwise')).toBe(sha256Hex('shieldwise'));
  });

  it('randomToken is URL-safe and unique', () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(randomToken());
  });

  it('safeEqual compares in constant time semantics', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
