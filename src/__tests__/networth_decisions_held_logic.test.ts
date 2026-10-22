/** NET WORTH DECISIONS, HELD BY A TEST — the ones that need no screen (2026-10-20). Each test opens with the decision
 *  it holds. Found by the check of his Net worth decisions against the code: built, but held by nothing (DEC-0019,
 *  DEC-0452), or not yet true in the code (DEC-0312, DEC-0449, DEC-0045 — changed the same day, and these fail on the
 *  code before that change). */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ingestSync, stAssetId, type AccountSyncPayload } from '../services/sync/ingest';
import { GLOSSARY } from '../domain/glossary';
import { ASSET_CLASS_LABEL, ASSET_KINDS } from '../domain/assets';
import { ALT_KINDS, ALT_KINDS_CAPTURE } from '../domain/alternatives';

const NOW = '2026-10-20T12:00:00.000Z';
const linked = (total: { amount: number | null; currency?: string } | null, over: Partial<AccountSyncPayload> = {}): AccountSyncPayload => ({
  account: { id: 'acc-eu', brokerage_authorization: 'c1', name: 'Depot', number: '55554444', institution_name: 'Trade Republic', raw_type: 'Individual',
    balance: { total } } as any,
  balancesCash: 1200,
  positions: [
    { symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 100, price: 250, average_purchase_price: 200 },
    { symbol: { id: 'u-spaxx', raw_symbol: 'SPAXX', type: { code: 'oef' } } as any, units: 200, price: 1, cash_equivalent: true },
  ],
  ...over,
});
const recordOf = (p: AccountSyncPayload, prior: any[] = []) => ingestSync(prior, {}, [p], NOW).accounts.find((a) => a.asset_id === stAssetId('acc-eu'))!;

describe('DEC-0019 — the derive-from-holdings fallback is for US dollars only', () => {
  test('DEC-0019 — "balance authority rule gains the derive-from-holdings fallback … USD-only (currency guard)": a euro account with no total is not added up into dollars', () => {
    // in dollars, a missing total is derived from what the account holds: 100 × $250 + 200 × $1 + $1,000 of cash = $26,200
    expect(recordOf(linked(null)).balance).toBeCloseTo(26200, 6);
    expect(recordOf(linked({ amount: 0, currency: 'USD' })).balance).toBeCloseTo(26200, 6);
    // in euros, the same holdings are euro marks — adding them up would print euros as dollars, so nothing is derived
    expect(recordOf(linked({ amount: null, currency: 'EUR' })).balance).toBe(0);
    expect(recordOf(linked({ amount: 0, currency: 'EUR' })).balance).toBe(0);
    // an account the app already held keeps the balance it had
    const prior = [{ asset_id: stAssetId('acc-eu'), snaptrade_account_id: 'acc-eu', label: 'Depot', tax_bucket: 'TAXABLE', balance: 31000, target_return: 0.08, source: 'connected' }];
    expect(recordOf(linked({ amount: 0, currency: 'EUR' }), prior).balance).toBe(31000);
  });
});

describe('DEC-0312 — "non-USD holdings deferred, not dropped — store the currency field now"', () => {
  test('DEC-0312 — a linked euro account keeps its currency, EUR, on the account record', () => {
    const r = recordOf(linked({ amount: 50000, currency: 'EUR' }));
    expect(r.currency).toBe('EUR');                             // the field did not exist before 2026-10-20
    expect(recordOf(linked({ amount: 50000, currency: 'USD' })).currency).toBe('USD');
    expect(recordOf(linked(null)).currency).toBeUndefined();     // a broker that states none: unset, read as dollars
  });

  test('DEC-0312 — storing the currency changes no figure: conversion stays deferred', () => {
    const eur = recordOf(linked({ amount: 50000, currency: 'EUR' }));
    // the figures, by hand: a euro total is never taken as dollars (no prior → 0); cash $1,200 less the $200 fund; the mark
    expect(eur.balance).toBe(0);
    expect(eur.cash_balance).toBe(1000);
    expect(eur.positions!.map((p) => p.last_price)).toEqual([250, 1]);
    // and the record with the field kept equals, field for field, the record the app writes when the code is not one it
    // keeps (a lower-case "eur" is not an ISO code, so nothing is stored) — the currency is the only difference
    const notKept = recordOf(linked({ amount: 50000, currency: 'eur' }));
    expect(notKept.currency).toBeUndefined();
    const strip = (a: any) => { const { currency, positions, ...rest } = a; return { ...rest, positions: (positions ?? []).map(({ position_id, lots, ...p }: any) => ({ ...p, lots: lots.map(({ lot_id, ...l }: any) => l) })) }; };
    expect(strip(eur)).toEqual(strip(notKept));
  });
});

describe('DEC-0452 — "why is value any versus float?"', () => {
  test('DEC-0452 — the account record\'s balance fields are numbers, never any', () => {
    const file = path.join(__dirname, '..', 'domain', 'assets', 'index.ts');
    const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const decl = sf.statements.find((s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'AssetAccount');
    expect(decl).toBeTruthy();
    const members = new Map<string, ts.TypeNode | undefined>();
    for (const m of decl!.members) if (ts.isPropertySignature(m)) members.set(m.name.getText(sf), m.type);
    expect(members.size).toBeGreaterThanOrEqual(30);              // the guard read the whole record (41 fields on 2026-10-20)
    // nothing on the account record may be typed any — a value that could be anything cannot be checked
    const anys: string[] = [];
    (function look(n: ts.Node) { if (n.kind === ts.SyntaxKind.AnyKeyword) anys.push(n.parent.getText(sf)); ts.forEachChild(n, look); })(decl!);
    expect(anys).toEqual([]);
    // and every money field on it is a number (optional, or null where "not on record" is a value)
    const numeric = (t: ts.TypeNode | undefined) => !!t && (t.kind === ts.SyntaxKind.NumberKeyword
      || (ts.isUnionTypeNode(t) && t.types.some((x) => x.kind === ts.SyntaxKind.NumberKeyword)
        && t.types.every((x) => x.kind === ts.SyntaxKind.NumberKeyword || (ts.isLiteralTypeNode(x) && x.literal.kind === ts.SyntaxKind.NullKeyword))));
    for (const f of ['balance', 'cash_balance', 'face_value', 'accrued_interest', 'change_amount', 'target_return']) {
      expect([f, numeric(members.get(f))]).toEqual([f, true]);
    }
  });
});

describe('DEC-0449 and DEC-0045 — the glossary a person reads', () => {
  test('DEC-0449 — "Which kind T-bills will be?": the class is named as everywhere else, and says a Treasury bill counts there', () => {
    expect(GLOSSARY.bonds.title).toBe(ASSET_CLASS_LABEL.bonds);    // 'Bonds & CDs' — it read 'Bonds'
    expect(GLOSSARY.bonds.body).toMatch(/Treasury bills and CDs \(certificates of deposit\) count here/);
    expect(GLOSSARY.bonds.body).not.toMatch(/T-bill/);              // spelled out, never the abbreviation he asked about
  });

  test('DEC-0045 — "Private equity + Hedge funds OUT of phase 1": the Alternatives definition names only what the app captures', () => {
    const trimmed = ALT_KINDS.filter((k) => !(ALT_KINDS_CAPTURE as readonly string[]).includes(k));
    expect(trimmed.length).toBeGreaterThanOrEqual(2);               // read from the code: private equity and hedge funds
    const labelOf = (id: string) => ASSET_KINDS.find((k) => k.id === id)!.label;
    const body = GLOSSARY.alternatives.body.toLowerCase();
    for (const k of trimmed) expect([labelOf(k), body.includes(labelOf(k).toLowerCase())]).toEqual([labelOf(k), false]);
    for (const word of ['crypto', 'commodities', 'annuities', 'options']) expect([word, body.includes(word)]).toEqual([word, true]);
  });
});
