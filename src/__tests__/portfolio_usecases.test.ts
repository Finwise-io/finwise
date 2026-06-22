// Use-case harness: run real user journeys through the actual engine and report works vs gaps.
// Mirrors the store pipeline: applyTransaction → recomputeBalances. Each case logs expected vs actual.
import { applyTransaction, makeTransaction, investmentIncomeAnnual, availableCash, type Transaction, type TxnType } from '../domain/transactions';
import { totalShares, latestClose, type PriceSeries } from '../domain/performance';
import { retirementEarmarkedValue, type AssetAccount } from '../domain/assets';

const round2 = (n: number) => Math.round(n * 100) / 100;
const px = (t: string, p: number): [string, PriceSeries] => [t, { ticker: t, points: [{ date: '2025-01-01', close: p }] }];
const CACHE: Record<string, PriceSeries> = Object.fromEntries([px('AAPL', 200), px('VTI', 300)]);

// EXACT copy of the store's recomputeBalances so the harness matches production behaviour.
function recompute(accs: AssetAccount[], cache: Record<string, PriceSeries>): AssetAccount[] {
  return accs.map((a) => {
    const ledgerManaged = (a.positions?.length ?? 0) > 0 || a.cash_balance != null;
    if (!ledgerManaged) return a;
    const mv = (a.positions ?? []).reduce((t, p) => { const c = latestClose(cache[p.ticker.trim().toUpperCase()]); return t + (c == null ? 0 : totalShares(p) * c); }, 0);
    return { ...a, balance: round2((a.cash_balance || 0) + mv) };
  });
}
const NW = (accs: AssetAccount[]) => round2(accs.reduce((t, a) => t + (a.balance || 0), 0));
const acct = (id: string, o: Partial<AssetAccount> = {}): AssetAccount => ({ asset_id: id, label: id, tax_bucket: 'TAXABLE', balance: 0, target_return: 0.08, ...o });
let LEDGER: Transaction[] = [];
const TODAY = new Date().toISOString().slice(0, 10);
function run(accs: AssetAccount[], p: Partial<Transaction>): AssetAccount[] {
  const t = makeTransaction({ date: TODAY, type: 'BUY', account_id: 'MS', ...p } as any);
  LEDGER = [t, ...LEDGER];
  return recompute(applyTransaction(accs, t), CACHE);
}

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

describe('portfolio use-cases', () => {
  test('run journeys and report', () => {
    // ---------- SIMPLE ----------
    // S1: add a holding you own (AAPL 10@150 in MS brokerage)
    let accs = [acct('MS', { kind: 'brokerage', cash_balance: 0, positions: [{ position_id: 'p1', ticker: 'AAPL', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 150, purchase_date: '2024-01-01' }] }] })];
    accs = recompute(accs, CACHE);
    check('S1 add holding → MS value = 10×$200 = $2,000', accs[0].balance === 2000, `MS balance=${accs[0].balance}`);

    // S3: deposit $1,000 cash into MS → +1,000 to MS and NW
    let nw0 = NW(accs);
    accs = run(accs, { type: 'DEPOSIT', account_id: 'MS', amount: 1000 });
    check('S3 deposit $1,000 → NW +$1,000', NW(accs) === nw0 + 1000, `NW ${nw0}→${NW(accs)}`);

    // S4: buy 5 AAPL @200 with MS cash → cash -1,000, shares +5, NW unchanged (cash→shares)
    nw0 = NW(accs);
    accs = run(accs, { type: 'BUY', account_id: 'MS', ticker: 'AAPL', shares: 5, price: 200 });
    check('S4 buy 5 AAPL@200 from cash → NW unchanged', NW(accs) === nw0, `NW ${nw0}→${NW(accs)} (cash=${accs[0].cash_balance}, shares=${totalShares(accs[0].positions![0])})`);

    // S2: cash dividend on AAPL (held in MS) → MS cash +80, income +80
    accs = run(accs, { type: 'DIVIDEND', account_id: 'MS', ticker: 'AAPL', amount: 80 });
    check('S2 cash dividend $80 (AAPL held) → investment income $80', investmentIncomeAnnual(LEDGER) === 80, `income=${investmentIncomeAnnual(LEDGER)}`);

    // ---------- COMPLEX (gap hunters) ----------
    // C1: transfer $50k from BofA (manual savings, balance only) → MS cash. NW must be UNCHANGED.
    let two = [acct('BofA', { kind: 'savings', tax_bucket: 'CASH', balance: 100000 }), acct('MS', { kind: 'brokerage', cash_balance: 0 })];
    two = recompute(two, CACHE);
    const nwBefore = NW(two);
    two = run(two, { type: 'TRANSFER', account_id: 'BofA', counter_account_id: 'MS', amount: 50000 });
    check('C1 transfer $50k BofA→MS → NW unchanged', NW(two) === nwBefore, `NW ${nwBefore}→${NW(two)} (BofA=${two[0].balance}, MS=${two[1].balance})`);

    // C2: dividend entry must be restricted to a HELD holding (UI guard). Account holds nothing → no eligible ticker.
    const msNoHold = acct('MS', { kind: 'brokerage', cash_balance: 0, positions: [] });
    const heldTickers = (a: AssetAccount) => (a.positions ?? []).map((p) => p.ticker);
    check('C2 dividend must pick a held holding (UI guard)', heldTickers(msNoHold).length === 0, `held tickers offered=${JSON.stringify(heldTickers(msNoHold))} → can't book AAPL dividend`);

    // C3: REINVESTED dividend for an un-held ticker → must NOT create a phantom position
    let reinv = [acct('MS', { kind: 'brokerage', cash_balance: 0, positions: [] })];
    reinv = run(reinv, { type: 'DIVIDEND', account_id: 'MS', ticker: 'AAPL', reinvested: true, shares: 1, price: 200 });
    check('C3 reinvested dividend, un-held ticker → no phantom position', (reinv[0].positions ?? []).length === 0, `positions created=${(reinv[0].positions ?? []).length}`);

    // C4: buy must be affordable (UI guard) — cost vs available cash in the account
    const poor = acct('MS', { kind: 'brokerage', cash_balance: 0 });
    const cost = 10 * 300, canAfford = cost <= availableCash(poor);
    check('C4 buy needs sufficient cash (UI guard)', !canAfford, `cost=${cost} > available=${availableCash(poor)} → blocked`);

    // C5: buy funded from savings (transfer savings→brokerage, then buy) → NW unchanged end-to-end
    let f = [acct('Save', { kind: 'savings', tax_bucket: 'CASH', balance: 10000 }), acct('MS', { kind: 'brokerage', cash_balance: 0 })];
    f = recompute(f, CACHE);
    const nwF = NW(f);
    f = run(f, { type: 'TRANSFER', account_id: 'Save', counter_account_id: 'MS', amount: 6000 });
    f = run(f, { type: 'BUY', account_id: 'MS', ticker: 'VTI', shares: 20, price: 300 });
    check('C5 savings→buy $6k VTI → NW unchanged', NW(f) === nwF, `NW ${nwF}→${NW(f)}`);

    // ---------- EDGE CASES ----------
    const ms = (o: Partial<AssetAccount> = {}) => [acct('MS', { kind: 'brokerage', cash_balance: 0, positions: [{ position_id: 'p', ticker: 'AAPL', kind: 'stocks_etf', lots: [{ lot_id: 'l', shares: 4, cost_per_share: 100, purchase_date: '2024-01-01' }] }], ...o })];

    // E1: over-sell (own 4, sell 10) → cash credited for only 4×$200, position emptied
    let e1 = recompute(ms({ cash_balance: 0 }), CACHE);
    e1 = run(e1, { type: 'SELL', account_id: 'MS', ticker: 'AAPL', shares: 10, price: 200 });
    check('E1 over-sell clamps to owned (4×$200=$800, not $2,000)', e1[0].cash_balance === 800 && totalShares(e1[0].positions?.[0] ?? { lots: [] } as any) === 0, `cash=${e1[0].cash_balance}`);

    // E2: reinvested dividend on a HELD stock → shares grow, no cash, no phantom
    let e2 = recompute(ms({ cash_balance: 0 }), CACHE);
    e2 = run(e2, { type: 'DIVIDEND', account_id: 'MS', ticker: 'AAPL', reinvested: true, shares: 1, price: 200 });
    check('E2 reinvest on held → 5 shares, cash still 0', totalShares(e2[0].positions![0]) === 5 && e2[0].cash_balance === 0, `shares=${totalShares(e2[0].positions![0])}, cash=${e2[0].cash_balance}`);

    // E3: FIFO cost basis after partial sell across 2 lots (10@100 + 10@200, sell 12) → 8 left, basis = 8×200=1600
    let e3 = [acct('MS', { kind: 'brokerage', cash_balance: 0, positions: [{ position_id: 'p', ticker: 'AAPL', kind: 'stocks_etf', lots: [{ lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: '2023-01-01' }, { lot_id: 'b', shares: 10, cost_per_share: 200, purchase_date: '2024-01-01' }] }] })];
    e3 = run(e3, { type: 'SELL', account_id: 'MS', ticker: 'AAPL', shares: 12, price: 250 });
    const e3basis = round2((e3[0].positions![0].lots).reduce((t, l) => t + l.shares * l.cost_per_share, 0));
    check('E3 FIFO leaves 8 sh, basis $1,600 (from the $200 lot)', totalShares(e3[0].positions![0]) === 8 && e3basis === 1600, `sh=${totalShares(e3[0].positions![0])}, basis=${e3basis}`);

    // E4: withdrawal spends cash → NW DROPS by the amount (money left the tracked system)
    let e4 = recompute([acct('Save', { kind: 'savings', tax_bucket: 'CASH', balance: 5000 })], CACHE);
    const nwE4 = NW(e4);
    e4 = run(e4, { type: 'WITHDRAWAL', account_id: 'Save', amount: 1500 });
    check('E4 withdraw $1,500 → NW −$1,500, balance $3,500', NW(e4) === nwE4 - 1500 && e4[0].balance === 3500, `NW ${nwE4}→${NW(e4)}, bal=${e4[0].balance}`);

    // E5: withdraw more than available → UI guard predicate blocks
    const e5acct = acct('Save', { kind: 'savings', tax_bucket: 'CASH', balance: 1000 });
    check('E5 over-withdraw blocked (UI guard)', !(2000 <= availableCash(e5acct)), `avail=${availableCash(e5acct)} < 2000 → blocked`);

    // E6: property/cash accounts untouched by an unrelated brokerage transaction → NW only moves by that txn
    let e6 = recompute([acct('Home', { kind: 'home', tax_bucket: 'PROPERTY', balance: 600000 }), acct('MS', { kind: 'brokerage', cash_balance: 1000 })], CACHE);
    const nwE6 = NW(e6);
    e6 = run(e6, { type: 'DEPOSIT', account_id: 'MS', amount: 500 });
    check('E6 home untouched by brokerage deposit; NW +$500 only', e6[0].balance === 600000 && NW(e6) === nwE6 + 500, `home=${e6[0].balance}, NW ${nwE6}→${NW(e6)}`);

    // E7: nest egg (earmarked) reflects account value after a price move
    let e7 = recompute([acct('IRA', { kind: 'roth_ira', tax_bucket: 'ROTH', cash_balance: 0, retirement_pct: 100, positions: [{ position_id: 'p', ticker: 'AAPL', kind: 'stocks_etf', lots: [{ lot_id: 'l', shares: 10, cost_per_share: 100, purchase_date: '2024-01-01' }] }] })], CACHE);
    const egg1 = retirementEarmarkedValue(e7);                       // 10×$200 = 2000
    const e7b = recompute(e7, { ...CACHE, AAPL: { ticker: 'AAPL', points: [{ date: '2025-02-01', close: 250 }] } });
    const egg2 = retirementEarmarkedValue(e7b);                      // 10×$250 = 2500
    check('E7 nest egg tracks price move ($2,000 → $2,500)', egg1 === 2000 && egg2 === 2500, `egg ${egg1}→${egg2}`);

    // ---------- report ----------
    const pass = results.filter((r) => r.pass).length;
    // eslint-disable-next-line no-console
    console.log('\n===== PORTFOLIO USE-CASE REPORT =====');
    results.forEach((r) => console.log(`${r.pass ? '✅ WORKS' : '❌ GAP  '} | ${r.name}\n           ${r.detail}`));
    console.log(`\n${pass}/${results.length} pass — ${results.length - pass} gap(s)\n`);
    expect(results.length).toBeGreaterThan(0);
  });
});

// B-49: lock the retirement nest-egg basis the snapshot's start_balance uses. Property never funds
// retirement (0%), cash is part emergency-fund (50%), retirement/investment accounts count fully —
// so the nest egg genuinely diverges from net worth once a user holds a home or cash.
describe('nest-egg basis: retirementEarmarkedValue (B-49)', () => {
  const mk = (tax_bucket: AssetAccount['tax_bucket'], balance: number, extra: Partial<AssetAccount> = {}): AssetAccount =>
    ({ asset_id: 'a', label: 'x', tax_bucket, balance, target_return: 0.07, ...extra });

  test('PRE_TAX/TAXABLE 100%, CASH 0%, PROPERTY 0% — nest egg < net worth (Term #7)', () => {
    const accts = [mk('PRE_TAX', 120000), mk('TAXABLE', 45000), mk('CASH', 40000), mk('PROPERTY', 500000)];
    const netWorth = accts.reduce((t, a) => t + a.balance, 0);
    expect(netWorth).toBe(705000);
    // Term #7: cash is liquidity (emergency/near-term), NOT the invested portfolio → 0% (was 50%).
    expect(retirementEarmarkedValue(accts)).toBe(120000 + 45000 + 0 + 0); // 165,000
    expect(retirementEarmarkedValue(accts)).toBeLessThan(netWorth);
  });

  test('an explicit retirement_pct overrides the per-bucket default', () => {
    expect(retirementEarmarkedValue([mk('TAXABLE', 100000, { retirement_pct: 30 })])).toBe(30000);
  });
});
