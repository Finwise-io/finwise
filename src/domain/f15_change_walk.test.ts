// F15 (founder walk, 2026-08-14): "NW shows change $0 even after I changed the home price by $2,000.
// The change-driver screen shows Beginning 939,089, Ending 939,089, contributions $500, change in
// investment value −$500. Performance and Net Worth do not match, and none of it matches the
// actual account."
import { buildChangeWalk } from './history';

test("THE FOUNDER'S EXACT NUMBERS reproduce — the −$500 is manufactured, not measured", () => {
  const w = buildChangeWalk({
    beginning: 939_089, ending: 939_089,       // nothing moved
    contributions: 500,                         // one deposit in the ledger
    fromLabel: 'Aug 1', toLabel: 'Aug 14',
  });
  expect(w.contributions).toBe(500);
  expect(w.marketChange).toBe(-500);            // exactly what he saw
  // …and no market loss occurred. The line is a RESIDUAL: whatever the ledger cannot explain.
  // It is labelled "change in investment value", which is a measurement it never makes.
});

test('the residual absorbs anything unexplained, so a mislabelled row is guaranteed', () => {
  // a deposit the balance has not caught up with yet invents a loss…
  expect(buildChangeWalk({ beginning: 100_000, ending: 100_000, contributions: 2_000, fromLabel: 'a', toLabel: 'b' }).marketChange).toBe(-2_000);
  // …and a withdrawal the balance has not caught up with invents a gain
  expect(buildChangeWalk({ beginning: 100_000, ending: 100_000, withdrawals: 2_000, fromLabel: 'a', toLabel: 'b' }).marketChange).toBe(2_000);
  // the walk always sums, which is the design goal — but "sums" is not "true"
  const w = buildChangeWalk({ beginning: 100_000, ending: 100_000, contributions: 2_000, fromLabel: 'a', toLabel: 'b' });
  expect(w.beginning + w.contributions - w.withdrawals + w.wealthGenerated + w.debtPrincipal).toBe(w.ending);
});

test('a real market move and a phantom one are indistinguishable in that row', () => {
  const phantom = buildChangeWalk({ beginning: 100_000, ending: 100_000, contributions: 500, fromLabel: 'a', toLabel: 'b' });
  const real    = buildChangeWalk({ beginning: 100_000, ending:  99_500, contributions: 0,   fromLabel: 'a', toLabel: 'b' });
  expect(phantom.marketChange).toBe(real.marketChange);   // both say −$500
  // one lost $500 in the market; the other lost nothing. The screen cannot tell them apart.
});

test('the walk is blind to a home-price edit unless the BASELINE is older than the edit', () => {
  // the change is today's net worth minus a SAVED snapshot. If the snapshot already contains the
  // new home value — because it was written after the edit — the $2,000 never appears.
  const beforeEdit = buildChangeWalk({ beginning: 937_089, ending: 939_089, fromLabel: 'a', toLabel: 'b' });
  const afterEdit  = buildChangeWalk({ beginning: 939_089, ending: 939_089, fromLabel: 'a', toLabel: 'b' });
  expect(beforeEdit.ending - beforeEdit.beginning).toBe(2_000);   // what he expected to see
  expect(afterEdit.ending - afterEdit.beginning).toBe(0);         // what he saw
});
