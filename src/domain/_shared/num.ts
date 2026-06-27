// Shared numeric helpers used across domain modules.
import { formatMoney, formatMoneyCents } from './money';

export const toNum = (v: any): number => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
// Currency/locale-aware (delegates to the active money format; defaults to USD/en-US).
export const money = (n: number): string => formatMoney(n);
// Same, but keeps cents — for precise amounts (transactions, holdings). Masks under hide-balances.
export const money2 = (n: number): string => formatMoneyCents(n);
export const round2 = (n: number): number => Math.round(n * 100) / 100;
