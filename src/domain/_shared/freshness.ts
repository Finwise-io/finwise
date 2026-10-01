/** HOW OLD IS A NUMBER, AND IS THAT OLD ENOUGH TO SAY SO — one rule, one threshold.
 *
 *  His ruling, DEC-0301: *"source always, date only when stale."* Every figure says where it came
 *  from; a date appears ONLY when the figure has gone old — so a date on screen always means
 *  something needs attention, rather than being decoration a person learns to skip.
 *
 *  Before this, "stale" existed in exactly one place (`priceFreshness`, for the price cache, at four
 *  days) and the account source chip had no notion of it at all: it printed `Linked · 2026-10-01`
 *  every time, fresh or not, in raw ISO. His approved design says otherwise on its own face — change
 *  row 12 of the Net worth mock reads *"The source chip reads 🔗 Linked; a date appears only when the
 *  numbers are stale"* — and that mock was approved on 2026-09-14.
 *
 *  Two definitions of "old" would be two answers to one question, so the threshold lives here and
 *  `priceFreshness` reads it too. Four days covers a long weekend and a holiday, which is the
 *  shortest gap that is genuinely a market's silence rather than a problem.
 */

/** Old enough that the app says so. A long weekend plus a holiday is three days; four is the first
 *  gap that cannot be explained by the market simply being shut. */
export const STALE_AFTER_DAYS = 4;

/** Whole days between a recorded moment and now, or null when the moment cannot be read. A moment in
 *  the future is unreadable rather than negative: a clock that disagrees is not freshness. */
/* ─ MK-XS-F-170 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysSince
 *
 * Answers ..... Whole days between a recorded moment and now, or null when the moment cannot be read.
 *
 * Formula .....
 *     nothing   when when = nothing (or when = '' when missing or zero)
 *     ms = now − (typeof when = 'number' ? when : date.parse(string(when)))
 *     nothing   when !number.is finite(ms) (or ms < 0 when missing or zero)
 *     the answer = round down(ms ÷ 86400000)
 *
 * Called by ... MK-ST-F-075 agoLabel · MK-ST-F-076 ageLabel
 *               MK-ST-F-077 isStale · MK-XS-F-002 dataGaps
 *               MK-XS-F-100 connectionFreshness
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-ST-F-076 ageLabel · MK-ST-F-075 agoLabel
 *               MK-XS-F-100 connectionFreshness · MK-XS-F-002 dataGaps
 *               MK-ST-F-077 isStale · MK-XS-F-082 priceFreshness
 *               MK-NW-F-045 sourceWording
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-170
 * Changed ..... not in git yet (—)
 */
export function daysSince(when: string | number | null | undefined, now: number): number | null {
  if (when == null || when === '') return null;
  const ms = now - (typeof when === 'number' ? when : Date.parse(String(when)));
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

/** How long ago, in words a person reads — never a raw date. Null when it cannot be read, so the
 *  caller says what it does not know rather than printing a dash. */
/* ─ MK-ST-F-075 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * agoLabel
 *
 * Answers ..... How long ago, in words a person reads — never a raw date.
 *
 * Formula .....
 *     days = days since(when, now)
 *     nothing   when days = nothing
 *     `${days} day${days > 1 ? 's' : ''} ago`   when days ≥ 1
 *     hours = round down((now − (typeof when = 'number' ? when : date.parse(string(when)))) ÷ 3600000)
 *     the answer:
 *     `${hours}h ago`   if hours ≥ 1
 *     'just now'   otherwise
 *
 * Called by ... MK-XS-F-082 priceFreshness
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-082 priceFreshness
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-075
 * Changed ..... not in git yet (—)
 */
export function agoLabel(when: string | number | null | undefined, now: number): string | null {
  const days = daysSince(when, now);
  if (days == null) return null;
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ago`;
  const hours = Math.floor((now - (typeof when === 'number' ? when : Date.parse(String(when)))) / 3_600_000);
  return hours >= 1 ? `${hours}h ago` : 'just now';
}

/** HOW OLD, IN DAYS, IN THE WORDS HE APPROVED — 'today', 'yesterday', '3 days old'.
 *
 *  The label carries the TIME only, never the verb: it used to say "updated today" while every caller
 *  also wrote "updated", printing "updated updated today" on each connected account row (2026-08-10).
 *
 *  Two grains, because they answer about different things and one word per concept means one word per
 *  concept, not one word for two: a PRICE cache is refreshed inside the day, so `agoLabel` counts in
 *  hours; a CONNECTION or an account syncs at most daily, so this one counts in days. Both read the
 *  same threshold, so nothing can call the same age fresh in one place and stale in another.
 */
/* ─ MK-ST-F-076 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * ageLabel
 *
 * Answers ..... HOW OLD, IN DAYS, IN THE WORDS HE APPROVED — 'today', 'yesterday', '3 days old'.
 *
 * Formula .....
 *     days = days since(when, now)
 *     nothing   when days = nothing
 *     'today'   when days = 0
 *     'yesterday'   when days = 1
 *     the answer = `${days} days old`
 *
 * Called by ... MK-NW-F-045 sourceWording · MK-XS-F-100 connectionFreshness
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-100 connectionFreshness · MK-NW-F-045 sourceWording
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-076
 * Changed ..... not in git yet (—)
 */
export function ageLabel(when: string | number | null | undefined, now: number): string | null {
  const days = daysSince(when, now);
  if (days == null) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days old`;
}

/** Stale, by the one threshold. Something never recorded, or recorded unreadably, counts as stale:
 *  an unknown age is not a fresh one. */
/* ─ MK-ST-F-077 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isStale
 *
 * Answers ..... Stale, by the one threshold.
 *
 * Formula .....
 *     days = days since(when, now)
 *     the answer = days = nothing (or days ≥ STALE_AFTER_DAYS when missing or zero)
 *
 * Called by ... MK-NW-F-045 sourceWording · MK-XS-F-082 priceFreshness
 *               MK-XS-F-100 connectionFreshness
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-100 connectionFreshness · MK-XS-F-082 priceFreshness
 *               MK-NW-F-045 sourceWording
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-077
 * Changed ..... not in git yet (—)
 */
export function isStale(when: string | number | null | undefined, now: number): boolean {
  const days = daysSince(when, now);
  return days == null || days >= STALE_AFTER_DAYS;
}
