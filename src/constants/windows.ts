/** THE WINDOW NAMES, ONE WORDING EVERYWHERE (his ruling “all”, 2026-11-06): a window is named in words — 1 month, This year,
 *  1 year, 2 years — on Performance and on an account's page. They read 1M, 1Y and 2Y, which a person has to decode. */
export const WINDOW_LABEL: Readonly<Record<'1M' | 'YTD' | '1Y' | '2Y', string>> = Object.freeze({
  '1M': '1 month', YTD: 'This year', '1Y': '1 year', '2Y': '2 years',
});
/** THE HOLDING PAGE'S SIX WINDOWS, in the same words (the same ruling; it is the same kind of button): it also offers 3 and 6 months. */
export const HOLDING_WINDOW_LABEL: Readonly<Record<'1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y', string>> = Object.freeze({
  ...WINDOW_LABEL, '3M': '3 months', '6M': '6 months',
} as any);
/** The line under the window buttons when the 2-year figure is a yearly rate. */
export const TWO_YEARS_PER_YEAR_LINE = 'The 2-year return is shown per year, so you can compare it with the 1-year return.';
