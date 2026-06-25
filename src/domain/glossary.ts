// THE one place financial terms are defined in plain English (UI §3.3). Screens attach <InfoDot term=…/>
// next to a term and it shows the matching definition — so "nest egg" / "RMD" / "surplus" mean the same
// thing everywhere and are never left bare on one screen and explained on another. Seeded from the
// captions in docs/finwise-taxonomy-spec.md. Keep definitions short, jargon-free, and consistent with
// the canonical selectors (take-home = after tax + 401k; surplus = after debt; etc.).
export type GlossaryTerm =
  | 'rmd' | 'surplus' | 'nestEgg' | 'unclassified' | 'earmarked'
  | 'takeHome' | 'investable' | 'emergencyFund' | 'savingsRate' | 'netWorth';

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
};
