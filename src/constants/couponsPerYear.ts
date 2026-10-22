// HOW OFTEN A BOND PAYS ITS INTEREST (2026-10-20, decided under DEC-3390; the account's coupons_per_year, MK-XS-I-069).
// The yield to maturity adds an estimate of the interest earned since the last payment (DEC-3390). That estimate assumed one
// payment a year, and most US bonds pay twice, so it could be up to double. The person says which; nothing is chosen for
// them, and not answered is not entered (the estimate then keeps its once-a-year assumption).
//
// THE ONE WORDING, asked by both forms that add or edit a bond held as its own account — Add an account and the Bonds
// editor — and only for a bond, never a CD (a CD's yield is its rate, or is priced like a bond from the broker's statement).
export const COUPONS_PER_YEAR_QUESTION = 'Pays interest';
export const COUPONS_PER_YEAR_CHOICES = [
  { value: 1, label: 'Once a year', spoken: 'Pays interest once a year' },
  { value: 2, label: 'Twice a year', spoken: 'Pays interest twice a year' },
] as const;
export type CouponsPerYear = typeof COUPONS_PER_YEAR_CHOICES[number]['value'];
