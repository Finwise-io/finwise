/** EVERY WORD THE APP COUNTS IN WORDS, WITH ITS PLURAL — ONE LIST (DEC-4082, 2026-10-10).
 *
 *  His words: "15 - why not go ahead and make a list of words and plurals." Before this, the plural was
 *  made in about thirty places by adding an "s" by hand, and the one shared helper did the same unless a
 *  caller remembered to pass the right plural — so "2 property" was one forgotten argument away, and a
 *  hand-made "> 1 ? 's' : ''" wrote "0 bond". Now every count written in words takes its plural from
 *  this list, and a word not on it stops the tests (src/domain/assets/plural_words.test.ts scans every
 *  call). Lives in _shared so the lowest helpers (how long ago a price is) can use it too; the assets
 *  module re-exports it, so `plural` is still imported from where it always was. */
export const PLURAL_WORDS = {
  account: 'accounts',
  answer: 'answers',
  bond: 'bonds',
  CD: 'CDs',
  contract: 'contracts',
  day: 'days',
  debt: 'debts',
  goal: 'goals',
  // a verb agrees with its count too: "Treasury has", "Apple and Gold have" (MK-NW-F-130, 2026-10-13)
  has: 'have',
  holding: 'holdings',
  item: 'items',
  // a possessive agrees with its count: "so its gains", "so their gains" (MK-NW-F-130, DEC-6076, 2026-10-19)
  its: 'their',
  month: 'months',
  number: 'numbers',
  option: 'options',
  property: 'properties',
  purchase: 'purchases',
  record: 'records',
  row: 'rows',
  // 'sale' left the list on 2026-10-12: the only count of sales in words ("1 sale had no recorded purchase") became one
  // line per sale (DEC-4643), so nothing counts sales in words any more
  share: 'shares',
  source: 'sources',
  Treasury: 'Treasuries',
  year: 'years',
} as const;

/** A word the app may count in words — one that is on the list. */
export type CountedWord = keyof typeof PLURAL_WORDS;

/** Writes a count with its noun, singular for one and plural otherwise: 1 CD, 3 CDs. */
/* ─ MK-NW-F-067 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * plural
 *
 * Answers ..... Writes a count with its noun, singular for one and plural otherwise: 1 CD, 3 CDs.
 *
 * Formula .....
 *     the answer = n + ' ' + (one   when n = 1;   many   otherwise)
 *
 * Called by ... MK-CF-O-019 theIncomeManager · MK-HM-F-006 money0
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-028 classPortionLabel
 *               MK-NW-F-046 historyCoverage · MK-NW-F-052 buildItemizedAccounts
 *               MK-NW-F-070 accruedInterestCaveat · MK-NW-F-130 notIncludedSentence
 *               MK-PF-F-045 priceHistoryShortSentence · MK-PL-F-028 sampleAskLine
 *               MK-PL-F-063 fraLabel · MK-ST-F-075 agoLabel
 *               MK-XS-F-002 dataGaps · MK-XS-F-003 gapsHeadline
 *               MK-XS-F-183 writeFigure
 *
 * Reaches ..... 149 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               … and 131 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-067
 * Changed ..... not in git yet (—)
 */
export function plural(n: number, word: CountedWord, shown: string | number = n): string {
  // THE PLURAL COMES FROM THE ONE LIST (DEC-4082, 2026-10-10). The third argument used to be the plural, passed by
  // the caller ("Treasuries"); every caller now relies on the list, so it is the count as written instead — a
  // formatted figure or a number word — and the noun beside it is still the list's.
  const many = (PLURAL_WORDS as Record<string, string>)[word];
  if (many == null) {
    // a word not on the list is a mistake in the code, never a guessed "s" (DEC-4082, 2026-10-10)
    if (process.env.NODE_ENV !== 'production') throw new Error(`plural: "${word}" is not on PLURAL_WORDS — add it with its plural`);
    return `${shown} ${word}`;
  }
  return `${shown} ${n === 1 ? word : many}`;
}
