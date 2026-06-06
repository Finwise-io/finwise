// Individual bonds (Phase B). A bond is held as an AssetAccount with bond fields (face_value,
// coupon_rate, maturity_date); its `balance` is the current value, so it flows into Net Worth and the
// nest egg via the existing balance machinery. These pure helpers compute the bond-specific metrics.
import { round2 } from '../_shared/num';
import type { AssetAccount } from '../assets';

export interface BondInfo { face: number; couponRate: number; maturity: string; value: number; }

/** An AssetAccount is a bond if it carries a maturity date. */
export function isBond(a: AssetAccount): boolean {
  return !!a.maturity_date;
}
export function bondInfo(a: AssetAccount): BondInfo {
  return { face: a.face_value || 0, couponRate: a.coupon_rate || 0, maturity: a.maturity_date || '', value: a.balance || 0 };
}

/** Annual coupon income = face value × coupon rate (paid as cash). */
export function annualCoupon(b: BondInfo): number {
  return round2(b.face * b.couponRate);
}
export function yearsToMaturity(maturity: string, now: Date = new Date()): number {
  if (!maturity) return 0;
  return Math.max(0, (new Date(maturity).getTime() - now.getTime()) / (365.25 * 86400000));
}
/** Current yield = annual coupon ÷ current price/value. */
export function currentYield(b: BondInfo): number | null {
  return b.value > 0 ? Math.round((annualCoupon(b) / b.value) * 1e4) / 1e4 : null;
}
/** Approximate yield to maturity (standard approximation), decimal. null if matured / no value. */
export function approxYTM(b: BondInfo, now: Date = new Date()): number | null {
  const n = yearsToMaturity(b.maturity, now);
  if (n <= 0 || b.value <= 0) return null;
  const c = annualCoupon(b);
  const ytm = (c + (b.face - b.value) / n) / ((b.face + b.value) / 2);
  return Math.round(ytm * 1e4) / 1e4;
}

export interface BondSummary { count: number; totalValue: number; totalFace: number; annualCoupon: number; avgYield: number | null; nextMaturity: string | null; }
export function bondSummary(bonds: BondInfo[], now: Date = new Date()): BondSummary {
  const list = bonds ?? [];
  const totalValue = round2(list.reduce((t, b) => t + b.value, 0));
  const totalFace = round2(list.reduce((t, b) => t + b.face, 0));
  const coupon = round2(list.reduce((t, b) => t + annualCoupon(b), 0));
  const avgYield = totalValue > 0 ? Math.round((coupon / totalValue) * 1e4) / 1e4 : null;
  const future = list.map((b) => b.maturity).filter(Boolean).filter((m) => new Date(m).getTime() >= now.getTime()).sort();
  return { count: list.length, totalValue, totalFace, annualCoupon: coupon, avgYield, nextMaturity: future[0] ?? null };
}
/** Total annual coupon income across the user's bond accounts (feeds the Income module). */
export function couponIncomeAnnual(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).filter(isBond).reduce((t, a) => t + annualCoupon(bondInfo(a)), 0));
}
