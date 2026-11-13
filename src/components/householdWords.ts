// The household's codes and days, written one way on every screen that shows them (invite-and-join v01, return code v01,
// delete-account-household v01, 2026-11-12). Words only; nothing here calculates a figure.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A day as the drawings write it, "Nov 19, 2026", in the phone's own time zone. */
export function dayWithYear(ms: number): string {
  const d = new Date(ms);
  return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** A 20-letter code in the recovery code's own form, five groups of four: Q7RM-K2XD-8WPA-HN4C-T6VJ. */
export function groupedCode(code: string): string {
  const bare = code.replace(/[\s-]/g, '').toUpperCase();
  return (bare.match(/.{1,4}/g) ?? []).join('-');
}

/** Seven days, the length of the invite (R13) and of the return code (return code v01, mark 4). */
export const HOUSEHOLD_CODE_DAYS = 7;
export const DAY_MS = 86400000;
