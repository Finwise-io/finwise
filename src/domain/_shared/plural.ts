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
  // the units a quantity is counted in (MK-PF-F-033 quantityWithUnit, 2026-10-21): coin, ounce and unit were made
  // singular by dropping the final s, outside this list (outside re-run OpenAI part 3)
  coin: 'coins',
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
  ounce: 'ounces',
  // a debt's monthly payment that was never entered: "Car loan · payment not entered" (2026-10-21, DEC-3523 tenet 3)
  payment: 'payments',
  property: 'properties',
  purchase: 'purchases',
  record: 'records',
  row: 'rows',
  // 'sale' left the list on 2026-10-12: the only count of sales in words ("1 sale had no recorded purchase") became one
  // line per sale (DEC-4643), so nothing counts sales in words any more. Back on 2026-10-22: the left-out line names a
  // holding whose sale in the window has no amount on record — a sale, or sales for several (MK-NW-F-130)
  sale: 'sales',
  share: 'shares',
  source: 'sources',
  Treasury: 'Treasuries',
  unit: 'units',
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
 *               MK-NW-F-028 classPortionLabel · MK-NW-F-046 historyCoverage
 *               MK-NW-F-052 buildItemizedAccounts · MK-NW-F-070 accruedInterestCaveat
 *               MK-NW-F-130 notIncludedSentence · MK-NW-F-154 accountInvestments
 *               MK-PF-F-033 quantityWithUnit · MK-PF-F-045 priceHistoryShortSentence
 *               MK-PL-F-028 sampleAskLine · MK-PL-F-063 fraLabel
 *               MK-ST-F-075 agoLabel · MK-XS-F-002 dataGaps
 *               MK-XS-F-003 gapsHeadline · MK-XS-F-183 writeFigure
 *
 * Reaches ..... 316 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 298 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
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

/** THE ARTICLE IN FRONT OF A WORD — ONE RULE, BESIDE THE ONE LIST OF PLURALS (2026-10-21, Performance audit row 30).
 *
 *  A spoken label read "Record a interest for Brokerage": "a" was typed in front of whatever word came next. Every "a" or
 *  "an" put in front of a word the code does not know in advance comes from here. The rule is the sound, not the letter:
 *    · a word that is never counted takes none — "Record interest", never "Record an interest" (NO_ARTICLE_WORDS);
 *    · a word spelled with a vowel but said with a consonant takes "a" — a unit, a one-time cost, a user (SAID_WITH_A);
 *    · a word spelled with a consonant but said with a vowel takes "an" — an hour, an honest figure (SAID_WITH_AN);
 *    · a short word in capitals is said letter by letter — an HSA, an IRA, a CD, a 401(k);
 *    · a number by how it is said — an 8% rate, an 11-month CD, an 18,000 limit; a 1,800 limit;
 *    · otherwise a vowel letter takes "an", any other letter "a". */
export const NO_ARTICLE_WORDS = ['cash', 'income', 'interest'] as const;
export const SAID_WITH_A = ['euro', 'once', 'one', 'unique', 'unit', 'units', 'universal', 'usage', 'use', 'used', 'user', 'usual', 'utility'] as const;
export const SAID_WITH_AN = ['heir', 'honest', 'honor', 'honour', 'hour', 'hours'] as const;
/** The capital letters whose names start with a vowel sound: "an F", "an HSA", "an MLP", "an SEP IRA". */
const LETTER_SAID_WITH_AN = 'AEFHILMNORSX';

/** A phrase with its article in front: withArticle('deposit') → "a deposit", withArticle('HSA account') → "an HSA account",
 *  withArticle('interest') → "interest". */
/* ─ MK-ST-F-094 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * withArticle
 *
 * Answers ..... A phrase with its article in front: withArticle('deposit') → "a deposit", withArticle('HSA account') → "an HSA account", withArticle('interest') → "interest".
 *
 * Formula .....
 *     text = phrase.trim()
 *     lower = text.to lower case()
 *     text   when (NO_ARTICLE_WORDS as readonly string[]).includes(lower)
 *     first = text.split( ÷ [^A − za − z0 − 9] ÷ ).find((w) => length > 0) (or '' when missing)
 *     word = first.to lower case()
 *     lead = the first of text.match( ÷ ^\d+ ÷ ) (or [''] when missing)
 *     the answer = `${an ? 'an' : 'a'} ${text}`
 *
 * Called by ... MK-NW-F-067 plural
 *
 * Reaches ..... 317 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 299 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-094
 * Changed ..... not in git yet (—)
 */
export function withArticle(phrase: string): string {
  const text = phrase.trim();
  const lower = text.toLowerCase();
  if ((NO_ARTICLE_WORDS as readonly string[]).includes(lower)) return text;   // the whole phrase is a word never counted
  const first = text.split(/[^A-Za-z0-9]/).find((w) => w.length > 0) ?? '';
  const word = first.toLowerCase();
  let an: boolean;
  if (/^\d/.test(first)) {
    // said as a number: 8, 80, 800 and 8,000 begin "eight"; 11 and 18 (and 11,000) begin "eleven" and "eighteen"
    const lead = (text.match(/^\d+/) ?? [''])[0];
    an = lead.startsWith('8') || lead === '11' || lead === '18';
  } else if ((SAID_WITH_A as readonly string[]).includes(word)) an = false;
  else if ((SAID_WITH_AN as readonly string[]).includes(word)) an = true;
  else if (first.length >= 2 && first.length <= 5 && first === first.toUpperCase() && /^[A-Z]+$/.test(first)) an = LETTER_SAID_WITH_AN.includes(first[0]);
  else an = /^[aeiou]/.test(word);
  return `${an ? 'an' : 'a'} ${text}`;
}
