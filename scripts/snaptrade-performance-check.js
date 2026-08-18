#!/usr/bin/env node
// SnapTrade performance cross-check (founder-run — the org keys stay in YOUR hands, same as the
// purge tool). Calls their EXPERIMENTAL /performance/custom for the Vanguard account and prints
// what THEY say the contributions, withdrawals, income, fees and rate of return are — so we can
// verify whether their figures are usable as an automatic cross-check against ours.
//
// Run (3 pastes, ~2 minutes):
//   1) npx firebase functions:secrets:access SNAPTRADE_CLIENT_ID   --project finwise-app-jj
//   2) npx firebase functions:secrets:access SNAPTRADE_CONSUMER_KEY --project finwise-app-jj
//   3) userSecret: Firebase Console → Firestore → snaptrade_users → your uid → userSecret
//   then:
//   SNAPTRADE_CLIENT_ID=<1> SNAPTRADE_CONSUMER_KEY=<2> ST_USER_ID=<mk-uid> ST_USER_SECRET=<3> \
//     node scripts/snaptrade-performance-check.js
//
// Prints to the terminal ONLY. Writes nothing to disk (standing order 2026-08-17: nothing from
// these accounts leaves this machine).
const { sign } = require('../functions/signing.js');

const clientId = process.env.SNAPTRADE_CLIENT_ID;
const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
const userId = process.env.ST_USER_ID;
const userSecret = process.env.ST_USER_SECRET;
if (!clientId || !consumerKey || !userId || !userSecret) {
  console.error('Need SNAPTRADE_CLIENT_ID, SNAPTRADE_CONSUMER_KEY, ST_USER_ID, ST_USER_SECRET (see header).');
  process.exit(1);
}

async function call(path, extraQuery = {}) {
  const q = { ...extraQuery, clientId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const queryString = Object.keys(q).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(q[k])}`).join('&');
  const sig = sign(consumerKey, { content: null, path, query: queryString });
  const res = await fetch(`https://api.snaptrade.com${path}?${queryString}`, { headers: { Signature: sig } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const money = (n) => (n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);

(async () => {
  const uq = { userId, userSecret };
  const accts = await call('/api/v1/accounts', uq);
  if (accts.status !== 200) { console.error('accounts failed:', accts.status, JSON.stringify(accts.body).slice(0, 300)); process.exit(1); }
  console.log(`${accts.body.length} account(s):`);
  for (const a of accts.body) console.log(`  - ${a.institution_name ?? '?'} · ${a.name ?? ''} · ${a.number ?? ''} · id ${a.id}`);

  const vanguard = accts.body.find((a) => /vanguard/i.test(a.institution_name ?? '')) ?? accts.body[0];
  console.log(`\nAsking /performance/custom for: ${vanguard.institution_name} (${vanguard.number ?? vanguard.id})`);
  console.log('Window: 2026-01-01 → 2026-08-17\n');

  const perf = await call('/api/v1/performance/custom', {
    ...uq, startDate: '2026-01-01', endDate: '2026-08-17', accounts: vanguard.id, detailed: 'true',
  });
  if (perf.status !== 200) {
    console.error(`performance/custom returned ${perf.status}:`);
    console.error(JSON.stringify(perf.body, null, 2).slice(0, 800));
    console.error('\nIf this is a 403/404, the experimental endpoint is not enabled on our plan —');
    console.error('that ANSWERS the question too: the cross-check needs a SnapTrade plan/enablement ask.');
    process.exit(1);
  }
  const p = perf.body;
  const eq = p.totalEquityTimeframe ?? [];
  console.log('WHAT SNAPTRADE SAYS (their classification, their maths):');
  console.log(`  Starting value (first equity point) : ${money(eq[0]?.value)} on ${eq[0]?.date ?? '—'}`);
  console.log(`  Ending value (last equity point)    : ${money(eq[eq.length - 1]?.value)} on ${eq[eq.length - 1]?.date ?? '—'}`);
  console.log(`  Net contributions                   : ${money(p.contributions?.contributions ?? p.contributions)}`);
  console.log(`  Withdrawal points                   : ${(p.withdrawalTimeframe ?? []).length} entries, sum ${money((p.withdrawalTimeframe ?? []).reduce((t, x) => t + (x.value || 0), 0))}`);
  console.log(`  Dividend income                     : ${money(p.dividendIncome)}`);
  console.log(`  Fees / commissions / forex          : ${money(p.fees)} / ${money(p.commissions)} / ${money(p.forexFees)}`);
  console.log(`  Rate of return                      : ${p.rateOfReturn != null ? (p.rateOfReturn * 100).toFixed(2) + '%' : '—'}`);
  console.log(`  Tickers they flag as unreliable     : ${(p.badTickers ?? []).join(', ') || 'none'}`);
  console.log('\nCompare by hand against the statement: beginning, $0 in/out, dividends $1,193.32-ish,');
  console.log('interest, ending. Where THEIR number is also wrong, the cross-check idea dies here —');
  console.log('and that is worth knowing before anything is built on it.');
})();
