// THE one place financial terms are defined in plain English (UI §3.3). Screens attach <InfoDot term=…/>
// next to a term and it shows the matching definition — so "nest egg" / "RMD" / "surplus" mean the same
// thing everywhere and are never left bare on one screen and explained on another. Seeded from the
// captions in docs/finwise-taxonomy-spec.md. Keep definitions short, jargon-free, and consistent with
// the canonical selectors (take-home = after tax + 401k; surplus = after debt; etc.).
export type GlossaryTerm =
  | 'rmd' | 'surplus' | 'nestEgg' | 'unclassified' | 'earmarked'
  | 'takeHome' | 'investable' | 'emergencyFund' | 'savingsRate' | 'netWorth'
  // asset classes (what your money is invested in) + income — added so the same plain-English meaning
  // shows wherever these appear (Net Worth classes, holdings, Income).
  | 'cash' | 'stocks' | 'bonds' | 'alternatives' | 'realEstate' | 'personalProperty'
  | 'grossIncome' | 'contributionRoom' | 'capitalGains'
  | 'safeDraw' | 'guaranteedIncome' | 'rateSensitivity' | 'provenance' | 'estimate' | 'moneyWeighted';

export const GLOSSARY: Record<GlossaryTerm, { title: string; body: string }> = {
  takeHome:     { title: 'Take-home', body: 'What actually lands in your account each month — after income tax and your 401(k) contribution.' },
  surplus:      { title: 'Surplus', body: 'Your take-home minus spending minus debt payments — the money left to save or invest each month.' },
  netWorth:     { title: 'Net worth', body: 'Everything you own minus everything you owe. Assets − debts.' },
  nestEgg:      { title: 'Retirement nest egg', body: 'The invested money your retirement draws on. Excludes your home, emergency cash, and rentals — those provide income or shelter instead of being spent down.' },
  investable:   { title: 'Investable assets', body: 'Cash plus investments plus retirement accounts. Excludes your home and personal property (cars, valuables).' },
  earmarked:    { title: 'Earmarked', body: 'The share of an account you’ve set aside for retirement. Cash and property default to 0%; investment accounts to 100%.' },
  unclassified: { title: 'Unclassified', body: 'An account whose holdings we don’t know yet — counted in your total, but not shown as stocks/bonds until you set the mix.' },
  rmd:          { title: 'RMD', body: 'Required Minimum Distribution — the amount the IRS requires you to withdraw from pre-tax retirement accounts each year starting at age 73.' },
  emergencyFund:{ title: 'Emergency fund', body: 'Cash set aside for the unexpected — a common target is 3–6 months of your essential spending.' },
  savingsRate:  { title: 'Savings rate', body: 'The share of your take-home pay you set aside each month. Around 20% is a healthy benchmark.' },
  cash:         { title: 'Cash', body: 'Money in checking, savings, or money-market accounts. Safe and available any time, but earns little.' },
  stocks:       { title: 'Stocks & ETFs', body: 'Shares of companies, or funds (ETFs) that bundle many stocks together. Higher long-term growth, with more ups and downs along the way.' },
  bonds:        { title: 'Bonds', body: 'Loans to a government or company that pay you interest (a coupon) and return the face value at maturity. Steadier than stocks; you can also sell them before maturity.' },
  alternatives: { title: 'Alternatives', body: 'Investments outside plain stocks and bonds — crypto, private equity, commodities, options. Often higher risk and harder to value.' },
  realEstate:   { title: 'Real estate', body: 'Property you own — your home, rentals, or land. Counts toward net worth; your primary home is left out of the retirement nest egg.' },
  personalProperty: { title: 'Personal property', body: 'Valuable things you own — vehicles, jewelry, collectibles. Counted in net worth, but not in investable assets.' },
  grossIncome:  { title: 'Gross income', body: 'Your total pay before any taxes or deductions. Take-home is what’s left after tax and your 401(k).' },
  contributionRoom: { title: 'Contribution room', body: 'How much more you can still add to a tax-advantaged account (401(k), IRA, HSA) this year before hitting the IRS limit.' },
  capitalGains: { title: 'Capital gains tax', body: 'Tax on profit when you sell. Held over a year: the lower long-term rate (often 15%). Held under a year: taxed like regular income. The app shows an estimate — your real rate depends on your full tax picture.' },
  safeDraw: { title: 'Safe draw', body: 'The steady monthly amount the math says your savings can support without running out before your plan-to age. Re-checked against your live balances — an estimate, not a guarantee.' },
  guaranteedIncome: { title: 'Guaranteed income', body: 'Money that arrives no matter what markets do — Social Security, a pension, an annuity. The foundation of a retirement paycheck.' },
  rateSensitivity: { title: 'Rate sensitivity', body: 'How much a bond’s market value moves if interest rates move. Rates up, existing bonds down — but held to maturity, a bond still returns its face value.' },
  provenance: { title: 'Where this number came from', body: 'Every figure shows its source — connected from your bank, imported from a file, or entered by you — and how fresh it is. You can always trace a number.' },
  moneyWeighted: { title: 'Your money-weighted return', body: 'The yearly rate your OWN dollars actually earned, counting when you put money in and took it out. Different from a fund’s posted return — timing matters. Computed from your recorded activity; an estimate.' },
  estimate: { title: 'Estimate', body: 'A figure computed from your numbers and stated assumptions — not a promise or a prediction. Change the inputs and it changes. You decide what to do with it.' },
};
