/** DEC-0301 — "source always, date only when stale" (2026-08-20), with DEC-0470 and DEC-0478 (every account says
 *  where its number comes from). ONE source wording, from ONE function: the source chip now prints MK-NW-F-045
 *  sourceWording's words. Until 2026-10-20 the chip wrote its own and printed an import's date every time — a file
 *  imported this morning read "Imported · Oct 20, 2026" on the chip and "Imported" on the account's own line. */
import React from 'react';
import { render } from '@testing-library/react-native';
import { SourceChip, sourceWords } from '../../components/SourceChip';
import { sourceWording } from '../../domain/assets';

const acct = (o: any) => ({ asset_id: 'a', label: 'Fidelity', tax_bucket: 'TAXABLE', balance: 1000, ...o }) as any;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

test('DEC-0301 — a fresh import shows its source and no date', () => {
  const a = acct({ source: 'imported', last_synced: daysAgo(0) });
  const r = render(<SourceChip account={a} />);
  expect(r.getByText('📄 Imported')).toBeTruthy();            // the old chip printed "📄 Imported · <today's date>"
  expect(r.queryByText(/Imported ·/)).toBeNull();
});

test('DEC-0301 — a stale import shows how old it is', () => {
  const a = acct({ source: 'imported', last_synced: daysAgo(9) });
  const r = render(<SourceChip account={a} />);
  expect(r.getByText('📄 Imported · 9 days old')).toBeTruthy();
});

test('DEC-0470 — the chip and the account line can never word one source two ways', () => {
  for (const o of [{ source: 'imported', last_synced: daysAgo(1) }, { source: 'imported', last_synced: daysAgo(30) }, { source: 'imported' },
    { source: 'connected', last_synced: daysAgo(0) }, { source: 'connected', last_synced: daysAgo(12) }, { source: 'connected' }, {}, { source: 'manual' }]) {
    const a = acct(o);
    expect(sourceWords(a).text).toBe(sourceWording(a));
  }
  // a paused link is a state of the link, not a source — it keeps its own words
  expect(sourceWords(acct({ source: 'connected', last_synced: daysAgo(0) }), true).text).toBe('Link paused · link again ›');
});
