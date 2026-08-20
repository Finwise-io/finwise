// THE IMPORT KEY — Track 1 step 2 (founder brief 2026-08-20 §F): importing the same window twice
// can never double money, on any road, because identity is the row's own composite — never the
// source's id (SnapTrade ids churn on reprocessing; a downloaded file has no ids at all).
import * as fs from 'fs';
import * as path from 'path';
import { importKey } from '../ledger';

const FILE = path.join(__dirname, '../../../Calculation Module/real-downloads/tes-vk.csv');

describe('one identity per row', () => {
  const base = { account: 'acct', date: '2026-07-01', word: 'Dividend', amount: 55.2, security: 'sym-1' };

  test('the identity is the composite — no source id participates, so id churn cannot double money', () => {
    expect(importKey(base)).toBe('acct|2026-07-01|DIVIDEND|55.2||sym-1||');
  });

  test('two same-day same-amount fills are separated by their description — the one field that differs', () => {
    expect(importKey({ ...base, description: 'fill 1 of 2' }))
      .not.toBe(importKey({ ...base, description: 'fill 2 of 2' }));
  });

  test('account-scoped: the same dividend in two accounts is two rows', () => {
    expect(importKey({ ...base, account: 'other' })).not.toBe(importKey(base));
  });

  test('the word is case-insensitive — "Dividend" and "DIVIDEND" are the same event', () => {
    expect(importKey({ ...base, word: 'DIVIDEND' })).toBe(importKey(base));
  });
});

describe('idempotence on the real Vanguard ledger', () => {
  const lines = fs.readFileSync(FILE, 'utf8').split('\n').map((l) => l.split(','));
  const txStart = lines.findIndex((l) => l[1] === 'Trade Date');
  const txns = lines.slice(txStart + 1).filter((l) => l.length > 11 && l[3]);
  const keyOf = (l: string[]) => importKey({
    account: l[0], date: l[1], word: l[3], amount: l[11],
    units: l[7] || undefined, security: l[6] || undefined, description: l[4],
  });

  test('every row in the file has its own identity — nothing collapses', () => {
    const keys = txns.map(keyOf);
    expect(new Set(keys).size).toBe(txns.length);   // 31 rows, 31 identities
  });

  test('importing the file a second time imports NOTHING', () => {
    const seen = new Set<string>();
    const firstPass = txns.filter((l) => { const k = keyOf(l); if (seen.has(k)) return false; seen.add(k); return true; });
    const secondPass = txns.filter((l) => { const k = keyOf(l); if (seen.has(k)) return false; seen.add(k); return true; });
    expect(firstPass.length).toBe(txns.length);
    expect(secondPass.length).toBe(0);
  });
});
