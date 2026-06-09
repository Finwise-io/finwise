// Generates docs/finwise-feature-list.{csv,xlsx} from one source of truth.
// Columns: #, Main Feature, Sub-Feature, Details Captured, Description, Status
// XLSX visually merges the #, Main Feature, and Sub-Feature cells across their rows.
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const L = 'Live', N = 'Native build', S = 'Coming soon';

// Each module: { main, rows: [ [subFeature, details, description, status] ] }
// A blank subFeature means "same as the row above" (it gets merged in xlsx).
const MODULES = [
  { main: 'Onboarding & Profile', rows: [
    ['Life stage', 'Employed / partially employed / student / retired', 'Tailors the whole setup flow', L],
    ['Goals picker', 'Stage-ordered, grouped, multi-select', '"What brings you to FinWise"', L],
    ['Income-source picker', 'Pick only the sources that apply', 'Shows only the relevant screens', L],
    ['Household', 'Partner + dependents', 'Used by planning tools', L],
    ['Mascot + progress', 'Centi warms neutral → happy as you advance', 'Engagement', L],
  ]},
  { main: 'Income', rows: [
    ['Employment Income', 'Base + Tips (Tips for hourly only)', 'Hourly / weekly / bi-weekly / monthly; same each month OR set by month ($0 for gap months)', L],
    ['', 'Bonus', 'Annual amount + which month it lands', L],
    ['', 'Signing Bonus', 'One-time', L],
    ['', 'RSUs / stock options', 'Vesting schedule (shares × price); options use strike + market', L],
    ['', '401(k) contribution + employer match', '% or $ match; ongoing jobs only', L],
    ['Rental Income', 'Rent/month + operating expenses', 'Short-term or long-term; multiple properties', L],
    ['Investment Income', 'Dividends + interest', 'Estimate; uses actual from holdings when available', L],
    ['Benefits', 'SNAP, TANF, disability, unemployment, housing', 'Select all that apply; total per month (non-taxable)', L],
    ['Self-Employed / Side Gig', 'Freelance / consulting / small-business', 'Monthly or yearly (taxable)', L],
    ['Child Support or Alimony', 'Monthly amount', 'Non-taxable', L],
    ['Student Loans', 'Amount, disbursement month(s) + optional day/year, APR + term', 'Multi-entry; cash-in + repayment-after-graduation estimate', L],
    ['Scholarships / Grants', 'Amount, monthly/yearly, which months + optional day/year', 'Multi-entry; non-taxable', L],
    ['Retirement Income', 'Social Security, pension, 401(k)/IRA withdrawals, RMDs, annuities', 'For retired / near-retired', L],
    ['Something Else', 'Gifts, one-off payment, anything else', 'Monthly / annual / one-time', L],
    ['Tax', 'System estimate (IRS brackets) or manual effective rate', 'Drives net / take-home everywhere', L],
    ['Income recap & detail', 'Totals, effective tax rate, month-by-month cash-flow grid', 'Insight: typical month + lean/windfall stretches', L],
  ]},
  { main: 'Spending Plan', rows: [
    ['Average Monthly Spend', 'Single monthly estimate', 'Quick start before itemizing', L],
    ['Budget by Category', 'Critical / Important / Nice-to-have tiers; $ or % of take-home', 'Custom categories supported', L],
    ['Category timing', 'Monthly vs yearly, due month(s) + due day', 'Yearly items (e.g. insurance premium) land in their month', L],
    ['Save-by-month', 'Available to save each month', 'Income − spending, placed in actual months', L],
  ]},
  { main: 'Bill Calendar & Cash Flow', rows: [
    ['Rolling 12-month running balance', 'Money-in vs bills-out by month', 'Flags tight/short months; rolls forward from this month', L],
    ['Day-level "ask by date" planner', 'Due date, need-by buffer, ask-by date, shortfall, who covers the gap', 'e.g. "ask family for $X by [date]" for tuition', L],
    ['Prioritize bills', 'Critical bills first when short', 'CFPB-style', L],
  ]},
  { main: 'Net Worth', rows: [
    ['Cash', 'Checking / savings balances', '', L],
    ['Investments', 'Stocks, ETFs, brokerage', 'Per-account + positions/lots', L],
    ['Retirement', '401(k), IRA, HSA', '', L],
    ['Property & belongings', 'Home, car, valuables', 'Manually valued', L],
    ['Debts / Liabilities', 'Balance, APR, minimum payment, due day', 'Shared with the Budget Debts tab', L],
    ['Net worth + runway', 'Assets − debts; cash ÷ monthly spend', 'Donut + emergency-fund runway', L],
    ['Net worth over time', 'Monthly snapshots', 'Trend chart on Home', L],
    ['Bank linking (Plaid)', 'Auto-import accounts & balances', 'Planned integration', S],
  ]},
  { main: 'Investing & Performance', rows: [
    ['Portfolio vs benchmark', 'Per-holding return vs matching index (1M–3Y)', 'Like-for-like same-period comparison', L],
    ['Ticker autocomplete', 'Common tickers + name + type', 'Sets the right benchmark', L],
    ['Capital gains', 'Long-term vs short-term gain + estimated tax', '"If you sold everything now"', L],
    ['Allocation / attribution / trend', 'Mix, top contributors, value over time', '', L],
    ['Bonds', 'Coupon income, maturity, yield', '', L],
    ['Other Investments', 'Crypto, private equity, hedge funds, commodities, annuities', 'Manually valued; expected return', L],
    ['Market prices', 'End-of-day quotes (free dev source)', 'Provider upgrade planned for production', L],
  ]},
  { main: 'Goals & Debt', rows: [
    ['Goals', 'Target amount + target date (MM/YYYY)', 'Back-calculates the monthly amount', L],
    ['Sinking fund', 'Non-monthly costs spread monthly', '', L],
    ['Debt payoff plan', 'Avalanche / snowball + extra-payment savings', '', L],
    ['Debt-to-income', 'Monthly debt ÷ gross income', 'Renter / homeowner guideline', L],
    ['Student-loan outlook', 'Total borrowed, est. monthly after graduation, total interest', '', L],
    ['Build credit', 'Utilization (balance ÷ limit), score band, habits', '', L],
  ]},
  { main: 'Retirement', rows: [
    ['Where you stand', 'Nest egg + chance of success', '', L],
    ['Will it last', '~400 Monte-Carlo market simulations', 'Through your plan-to age', L],
    ['Decumulation', 'Withdrawal rate vs 4%, withdrawal order, depletion age, RMDs', 'For retirees', L],
    ['Scenario sandbox', 'Retire age, monthly saving, return, inflation, pay raises', 'Save as your plan', L],
    ['Retirement spend', 'Base + travel + medical + "spending change later" trajectory', '', L],
  ]},
  { main: 'Planning & Tax Tools', rows: [
    ['College planner (529)', 'Cost, inflation, current savings → monthly to fund', 'Save as a goal', L],
    ['Life insurance check', 'Income, debts, goals, savings, existing coverage → gap', 'DIME method; prefilled', L],
    ['Estate & legacy', 'Will, beneficiaries, POA, healthcare directive, guardian, documents', 'Saved checklist + progress %', L],
    ['Roth conversion', 'Pre-tax balance, other income, target bracket → amount + tax', 'Fill-a-bracket strategy', L],
    ['Tax organizer', 'Income by source, contributions, accounts, document checklist', 'In-app review live; PDF export needs the native build', N],
    ['Emergency stress test', 'Cash + surprise expense → can-cover, job-loss runway, fund target', 'Presets: medical / car / job-loss', L],
  ]},
  { main: 'Guidance & Engagement', rows: [
    ['Insights', 'Ranked to-dos (emergency fund, 401k room, concentration, savings rate)', '', L],
    ['Sharpen your plan', 'Checklist of skipped setup steps', 'Completeness %', L],
    ['Rewards', 'XP, badges, daily streak', '', L],
    ['Tips', 'Educational content + AI expense tips', '', L],
    ['Job safety check', 'Income-stability questions → safety plan', '', L],
  ]},
  { main: 'Settings & System', rows: [
    ['Currency', 'USD / EUR / GBP / INR / CAD / AUD …', 'Reformats every amount app-wide', L],
    ['Text size', 'Default / Large / Larger', 'App-wide text scaling', L],
    ['Display mode', 'Simple vs Advisor', 'Hide or show technical detail', L],
    ['Frequency', 'Budget + pay frequency', '', L],
    ['Data & security', 'Encrypted on-device storage, cloud sync, email recovery', '', L],
    ['Receipt OCR scan', 'Snap a receipt → expense', 'Runs in the installed app build', N],
    ['Push notifications', 'Bill / check-in reminders', 'Runs in the installed app build', N],
  ]},
];

const HEADER = ['#', 'Main Feature or Service or Module', 'Sub-Feature', 'Details Captured', 'Description', 'Status'];

// Flatten to AOA with blanks for merged cells, and record merge ranges.
const aoa = [HEADER];
const merges = [];
let r = 1; // current data row index (0 = header)
MODULES.forEach((mod, i) => {
  const start = r;
  mod.rows.forEach((row, j) => {
    const num = j === 0 ? String(i + 1) : '';
    const main = j === 0 ? mod.main : '';
    aoa.push([num, main, row[0], row[1], row[2], row[3]]);
    r++;
  });
  const end = r - 1;
  if (end > start) {
    merges.push({ s: { r: start, c: 0 }, e: { r: end, c: 0 } }); // #
    merges.push({ s: { r: start, c: 1 }, e: { r: end, c: 1 } }); // Main Feature
  }
  // Sub-Feature merges: any run of blank sub-feature cells joins the one above (e.g. Employment Income)
  let runStart = null;
  for (let k = start; k <= end + 1; k++) {
    const sub = k <= end ? aoa[k][2] : '__STOP__';
    if (sub === '') { if (runStart === null) runStart = k - 1; }
    else { if (runStart !== null && k - 1 > runStart) merges.push({ s: { r: runStart, c: 2 }, e: { r: k - 1, c: 2 } }); runStart = null; }
  }
});

// ---- CSV ----
const csvEsc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = aoa.map((row) => row.map(csvEsc).join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'finwise-feature-list.csv'), csv);

// ---- XLSX ----
const ws = XLSX.utils.aoa_to_sheet(aoa);
ws['!merges'] = merges;
ws['!cols'] = [{ wch: 4 }, { wch: 26 }, { wch: 30 }, { wch: 56 }, { wch: 50 }, { wch: 16 }];
// vertically center the merged cells + bold the header
const range = XLSX.utils.decode_range(ws['!ref']);
for (let R = range.s.r; R <= range.e.r; R++) {
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
    if (!cell) continue;
    cell.s = cell.s || {};
    cell.s.alignment = { vertical: 'top', wrapText: true };
    if (R === 0) cell.s.font = { bold: true };
  }
}
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Features');
XLSX.writeFile(wb, path.join(__dirname, '..', 'docs', 'finwise-feature-list.xlsx'));

console.log(`Wrote ${aoa.length - 1} rows across ${MODULES.length} modules; ${merges.length} merges.`);
