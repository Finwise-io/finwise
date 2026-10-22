// WHERE A CD WAS BOUGHT (DEC-3837, 2026-10-10): "Interest rate % is the coupon, and yield to maturity could be different
// from coupon/interest rate % for CD bought in secondary market." A CD bought from the bank yields its interest rate; one
// bought through a broker is priced like a bond. Not answered = from the bank.
//
// THE ONE WORDING, asked by every form that adds or edits a CD — Add an account, the Bonds editor and Net worth's
// step-by-step add (the last of the three never asked until 2026-10-20). One place, so the three cannot drift apart.
export const CD_BOUGHT_QUESTION = 'Bought from the bank, or through a broker?';
export const CD_BOUGHT_CHOICES = [
  { value: 'bank', label: 'From the bank', spoken: 'CD bought from the bank' },
  { value: 'broker', label: 'Through a broker', spoken: 'CD bought through a broker' },
] as const;
export type CdBought = typeof CD_BOUGHT_CHOICES[number]['value'];
