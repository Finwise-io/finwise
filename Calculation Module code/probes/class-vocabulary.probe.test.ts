// PROBE — the same idea, spelled three different ways.
//
// Found while writing the Raw inputs tab, not while looking for it. "Asset class" exists at three
// levels of the app and each level uses its OWN set of words. Two of them differ by a single letter,
// which is the kind of mismatch that never announces itself.
import { ASSET_CLASS_LABEL } from '../../src/domain/assets';
import type { AssetClass } from '../../src/domain/assets';
import type { Position } from '../../src/domain/performance';
import type { MappedAssetClass } from '../../src/services/sync/snaptrade';

describe('CLASS_VOCABULARY', () => {
  test('the ACCOUNT level has seven words', () => {
    expect(Object.keys(ASSET_CLASS_LABEL).sort()).toEqual(
      ['alternatives', 'bonds', 'cash', 'mixed', 'personal_property', 'real_estate', 'stocks_etf']);
  });

  test('DEFECT: the HOLDING level uses different words for the same two classes', () => {
    // Position.asset_class is 'stock_etf' | 'bond' | 'other' | 'cash' — SINGULAR where the account
    // level is plural. A holding says 'stock_etf'; its account says 'stocks_etf'.
    const holding: Position['asset_class'] = 'stock_etf';
    const account: AssetClass = 'stocks_etf';
    expect(holding as string).not.toBe(account as string);      // one letter apart, and never equal
    expect(('bond' as string)).not.toBe('bonds' as string);

    // CORRECTED AFTER CHECKING THE CALLERS. This is not a live bug — a translation DOES exist, and
    // it is right. What is wrong is that the same translation is hand-written in FOUR places:
    //   src/services/sync/ingest.ts:73          broker  → holding   (bonds → bond, etc.)
    //   src/domain/assets/index.ts:430          holding → account
    //   src/domain/assets/index.ts:483          holding → account   (again)
    //   src/screens/AccountDetailScreen.tsx:122 holding → account   (a third time)
    // Change one and the others drift, in silence, because 'stock_etf' and 'stocks_etf' differ by a
    // single letter and no compiler or test compares them. It is the same duplication that had the
    // class LABEL living in eight places and drifting into three forms.
    const sameClass = (h: string, a: string) => h === a;
    expect(sameClass('stock_etf', 'stocks_etf')).toBe(false);   // ← reads as "different class"
  });

  test('the BROKER-INGEST level is a third set — right words, but only four of the seven', () => {
    const fromBroker: MappedAssetClass = 'stocks_etf';
    expect(fromBroker as string).toBe('stocks_etf');            // agrees with the account level
    // …but it can never produce real_estate, personal_property or mixed, which is correct for a
    // holding and worth stating: the vocabularies are not just spelled differently, they are
    // different SIZES, so a mapping between them can never be a plain equality check.
  });

  test('the holding level has "other" where the account level has "alternatives" and "mixed"', () => {
    // Two distinct account-level answers collapse into one holding-level word. Going the other way
    // is therefore lossy: 'other' cannot be turned back into either one.
    const other: Position['asset_class'] = 'other';
    expect(['alternatives', 'mixed']).not.toContain(other as string);
  });
});
