/** A DRAWING, READ WITH HIS RULINGS MADE AFTER IT WAS DRAWN (2026-11-06).
 *
 *  His ruling "all" of 2026-11-06 (the design review's list of eight words, decision log DEC-10067; see the row of that date on
 *  each drawing's READ THIS FIRST block) changed words the approved drawings draw. The phones are not redrawn: a ruling on top of an
 *  approved drawing is a dated row at the top of it (his standing order of 2026-10-04). So every reader of a drawing applies the
 *  rows here, and the screen is then held to the drawing AS RULED, word for word, as before.
 *
 *  Each change names the drawings it applies to; a drawing outside that list is read as drawn. Nothing here is a guess at
 *  what the screen prints — each pair is the drawn words and the words he chose.
 */
const NW = /networth-and-performance\/|home-screen\//;

/** the eight words he changed, as drawn → as ruled; [drawn, ruled, which drawings] */
const WORDS: [RegExp, string, RegExp][] = [
  [/Link it \(read-only\)/g, 'Connect your bank', NW],
  [/>(\s*)AVG YIELD(\s*)</g, '>$1AVERAGE YIELD$2<', NW],
  [/>(\s*)COUPON \/year(\s*)</g, '>$1INTEREST A YEAR$2<', NW],
  // the 2-year line names the buttons, so it changes with them (before the buttons, which it contains)
  [/2Y is shown per year, so it sits fairly beside 1Y/g, 'The 2-year return is shown per year, so you can compare it with the 1-year return.', NW],
  [/>(\s*)1M(\s*)</g, '>$11 month$2<', NW],
  [/>(\s*)1Y(\s*)</g, '>$11 year$2<', NW],
  [/>(\s*)2Y(\s*)</g, '>$12 years$2<', NW],
  [/>(\s*)3M(\s*)</g, '>$13 months$2<', NW],
  [/>(\s*)6M(\s*)</g, '>$16 months$2<', NW],
  [/>(\s*)YTD(\s*)</g, '>$1This year$2<', NW],   // the Holding page's chip; Performance has drawn "This year" since v14
  [/Figures for 1M, 1Y and longer/g, 'Figures for 1 month, 1 year and longer', NW],
  [/Every line fills in as days pass (—|&mdash;) the structure never changes\./g, 'These lines fill in as days pass.', NW],
  [/Fee \(opt\)/g, 'Fee (optional)', NW],
];
/** the section emoji on Net worth: dropped beside a section's name; in an institution's mix line ("💵 $8,000") the class is named */
const CLASS_OF: Record<string, string> = { '💵': 'Cash', '📈': 'Stocks / Funds', '📜': 'Bonds & CDs', '🪙': 'Alternatives', '🏠': 'Real estate', '🚗': 'Personal property', '🧩': 'Unclassified', '🏛️': 'Retirement' };
const NW_DRAWING = /moneykeel_pres_mock_net-worth-quiet-instrument_v\d+\.html$/;

export function ruledHtml(file: string, html: string): string {
  let s = html;
  for (const [drawn, ruled, where] of WORDS) if (where.test(file)) s = s.replace(drawn, ruled);
  // THE WORDS HE REJECTED, OUT OF THE SENTENCES THAT STILL USED THEM (design review, 2026-11-07, under DEC-5425 of 2026-10-14:
  // “your value is real” and “daily record” meant nothing to him). Performance names “these accounts”, an account's page “this account”.
  if (NW.test(file)) {
    const whose = /performance_v\d+\.html$/.test(file) ? 'these accounts' : 'this account';
    s = s.replace(/Day one: your value is real, your return starts measuring from today\. We never back-fill/g,
      'You added your accounts today. Your return starts measuring from today. We never back-fill');
    s = s.replace(/Your daily record does not reach back to ([^<]*?) yet, so the beginning is worked back from today(’|&#8217;|')s values and each holding(’|&#8217;|')s price history\./g,
      (_m, d, q1, q2) => `The app started tracking ${whose} after ${d}, so the starting value comes from today${q1}s values and each holding${q2}s past prices.`);
    s = s.replace(/Your daily record begins ([^<]*?), so the days before it are worked back from each holding(’|&#8217;|')s price history\./g,
      (_m, d, q) => `The app has tracked ${whose} since ${d}; the days before that come from each holding${q}s past prices.`);
    s = s.replace(/Wealth generated and Return start once the daily record reaches back far enough to say what this account was worth at the start\. It builds from your first recorded day\./g,
      'Wealth generated and Return start once the app has tracked this account long enough to know what it was worth at the start. They build from the first day it was tracked.');
    s = s.replace(/when the daily record begins:/g, 'when the app started tracking:');
    // HIS "change words to recommended" (design review, 2026-11-07, DEC-10152): Performance and the account page, in plain words.
    // One name for the account's value at the end of the window, on the summary, the account page and the walk alike:
    s = s.replace(/>(\s*)(Ending value|Market value)(\s*)</g, '>$1Ending market value$3<');
    s = s.replace(/(money|time)-weighted, so money you added never counts as return/g, 'Money you added or took out is not counted as gain');
    s = s.replace(/ — a yearly rate, so it sits fairly beside a one-year window/g, ' — a rate per year, so you can compare it with one year');
    s = s.replace(/Return is for the window you picked \(([^)]*)\) — not a yearly rate/g, 'Return is for these dates ($1) — not a rate per year');
    s = s.replace(/(not a rate per year|compare it with one year) · time-weighted/g, '$1 · Money you added or took out is not counted as gain');
    s = s.replace(/Earned = dividends \+ interest received in this window/g, 'Earned = dividends and interest paid to you between these dates');
    s = s.replace(/open this account(&#39;|’|&#8217;|')s portfolio/g, 'open this account$1s page');
  }
  if (NW_DRAWING.test(file)) {
    s = s.replace(/(💵|📈|📜|🪙|🏠|🚗|🧩|🏛️)\s?(?=(?:<[^>]*>)*\s*[−-]?\$)/gu, (_m, e: string) => `${CLASS_OF[e]} `);
    s = s.replace(/(💵|📈|📜|🪙|🏠|🚗|🧩|🏛️)\s?/gu, '');
  }
  return s;
}

/** THE FIRST-DAY RETIREMENT CARD GOES (the same ruling, 2026-11-06): on Net worth with no account, no "YOUR RETIREMENT PLAN" card —
 *  v08's state C draws it with the sample odds and "3 answers make it yours". Read as lines, the three are taken out of that state
 *  only; a card drawn with accounts behind it stays. */
export function ruledLines(file: string, lines: string[]): string[] {
  if (!NW_DRAWING.test(file)) return lines;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^YOUR RETIREMENT PLAN$/i.test(lines[i]) && /^Sample: \d+% odds/.test(lines[i + 1] ?? '') && /3 answers make it yours/.test(lines[i + 2] ?? '')) { i += 2; continue; }
    out.push(lines[i]);
  }
  return out;
}

/** LINES HIS RULING ADDED THAT NO DRAWING DRAWS (2026-11-07, DEC-10152, "Change words to recommended"): the line saying how the
 *  Return was calculated, with the window's own pieces, and the Refresh prices button beside the out-of-date prices line. A
 *  drawing cannot draw a line whose figures are the window's own, so the readers that hold a screen to a drawing leave these out
 *  of the screen's side; src/screens/__tests__/performance_plain_words_2026_11_07.test.tsx holds what they say, on the screen. */
export const ADDED_SINCE_DRAWN: RegExp[] = [/^How it is calculated: /, /^Refresh prices$/];
export const addedSinceDrawn = (line: string): boolean => ADDED_SINCE_DRAWN.some((r) => r.test(line));
