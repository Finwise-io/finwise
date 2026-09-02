// ENGINE — exact money arithmetic. Track 0 of the founder's 2026-08-20 brief: done FIRST, because
// every reconciliation assertion built after it must be exact, not "within a tolerance".
//
// WHY BINARY FLOATING POINT HAD TO GO (brief B8, audit item 21): with floats,
// `holdings + cash = the broker's stated total` can never be checked exactly, so a tolerance gets
// set — and then a small real mismatch is indistinguishable from rounding noise. That is how the
// money-market double-count hid. 0.1 + 0.2 !== 0.3 is not a curiosity; it is a reconciliation
// assertion that can never fire.
//
// DESIGN: fixed-point over BigInt, eight decimal places — enough for bond prices quoted to five
// places and crypto quantities to eight ("a float pipeline destroys satoshi-level balances").
// Values parse EXACTLY from the strings institutions write, arithmetic is exact, and rounding
// happens ONCE, at the display edge (standing rule R6: precision and display are separate layers —
// round last, never round twice). Serialises as a STRING, so a database column or JSON payload
// round-trips without passing through a float.
const SCALE = 8;
const UNIT = 10n ** BigInt(SCALE);

export class Dec {
  /** value × 10^8, exact. */
  private readonly v: bigint;
  private constructor(v: bigint) { this.v = v; }

  static ZERO = new Dec(0n);

  /** Parse the strings institutions actually write: "1,234.56", "$8,502.00 ", "(0.53)" meaning
   *  negative, "99.78125", "-7.73%", "  42 ". Unreadable input returns NULL, never a partial guess
   *  and never zero — zero is an amount, not an absence (standing rule R2). */
  static parse(raw: unknown): Dec | null {
    if (raw instanceof Dec) return raw;
    if (typeof raw === "bigint") return new Dec(raw * UNIT);
    if (typeof raw === "number") {
      if (!Number.isFinite(raw)) return null;
      // numbers still arrive from old call sites; convert via their shortest decimal string so the
      // value a person SAW is the value we keep. New code should hand us strings.
      return Dec.parse(String(raw));
    }
    if (typeof raw !== "string") return null;
    let t = raw.trim();
    if (!t || t === "--" || t === "-" || /^n\/?a$/i.test(t)) return null;
    const paren = /^\(.*\)$/.test(t);
    if (paren) t = t.slice(1, -1);
    t = t.replace(/[$,\s]/g, "").replace(/%$/, "");
    const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(t);
    if (!m) return null;
    const [, sign, whole, fracRaw = ""] = m;
    if (fracRaw.length > SCALE && /[^0]/.test(fracRaw.slice(SCALE))) return null; // beyond exactness — refuse, don't truncate silently
    const frac = (fracRaw + "0".repeat(SCALE)).slice(0, SCALE);
    const v = BigInt(whole) * UNIT + BigInt(frac);
    return new Dec(sign === "-" || paren ? -v : v);
  }

  /** Parse-or-throw, for literals in code and tests where failure is a bug. */
  static of(raw: string | number | bigint): Dec {
    const d = Dec.parse(raw);
    if (d == null) throw new Error(`not a decimal: ${String(raw)}`);
    return d;
  }

  add(o: Dec): Dec { return new Dec(this.v + o.v); }
  sub(o: Dec): Dec { return new Dec(this.v - o.v); }
  neg(): Dec { return new Dec(-this.v); }
  abs(): Dec { return this.v < 0n ? this.neg() : this; }

  /** Exact product, half-even at the 8th place only when the true product needs more places. */
  mul(o: Dec): Dec { return new Dec(divRounded(this.v * o.v, UNIT)); }

  /** Division cannot always be exact; it rounds half-even AT THE 8TH PLACE and says so in its name. */
  divRound(o: Dec): Dec {
    if (o.v === 0n) throw new Error("division by zero");
    return new Dec(divRounded(this.v * UNIT, o.v));
  }

  cmp(o: Dec): -1 | 0 | 1 { return this.v < o.v ? -1 : this.v > o.v ? 1 : 0; }
  eq(o: Dec): boolean { return this.v === o.v; }
  isZero(): boolean { return this.v === 0n; }
  isNeg(): boolean { return this.v < 0n; }

  /** THE ONE ROUNDING STEP — the display edge. Half-even ("banker's"), the accounting default,
   *  so .5 cases do not drift upward across thousands of rows. */
  round(places = 2): Dec {
    const f = 10n ** BigInt(SCALE - places);
    return new Dec(divRounded(this.v, f) * f);
  }

  /** Exact string, trailing zeros trimmed — "1193.32", "-0.53", "99.78125". This is the
   *  serialisation: JSON and database columns carry THIS, never a float. */
  toString(): string {
    const neg = this.v < 0n; const a = neg ? -this.v : this.v;
    const whole = a / UNIT; let frac = (a % UNIT).toString().padStart(SCALE, "0").replace(/0+$/, "");
    return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
  }
  toJSON(): string { return this.toString(); }

  /** The display edge for old call sites that need a number. Round FIRST (R6), then convert. */
  toNumber(places = 2): number { return Number(this.round(places).toString()); }

  static sum(items: Iterable<Dec>): Dec {
    let acc = 0n; for (const d of items) acc += d.v; return new Dec(acc);
  }
}

/** Round-half-even division on bigints. */
/* ─ MK-ST-F-057 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * divRounded
 *
 * Answers ..... Round-half-even division on bigints.
 *
 * Formula .....
 *     negative = (num < 0n) ! = (den < 0n)
 *     n = -num   if num < 0n
 *     -den   if num, d = den < 0n
 *     den   otherwise   otherwise
 *     q = n ÷ d, r = (n % d) × 2n
 *     out = q
 *     the answer:
 *     -out   if negative
 *     out   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-057
 * Changed ..... not in git yet (—)
 */
function divRounded(num: bigint, den: bigint): bigint {
  const negative = (num < 0n) !== (den < 0n);
  const n = num < 0n ? -num : num, d = den < 0n ? -den : den;
  const q = n / d, r = (n % d) * 2n;
  let out = q;
  if (r > d || (r === d && q % 2n === 1n)) out = q + 1n;
  return negative ? -out : out;
}
