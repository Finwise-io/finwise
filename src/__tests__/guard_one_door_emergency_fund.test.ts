/** ONE DOOR FOR "how long would my cash cover my essentials" — MK-NW-O-004 theEmergencyFund
 *  (Q-NW-5, ruled by the founder 2026-09-27: "Yes.").
 *
 *  Three screens ask this one question under three names: the emergency fund on Net worth, Job
 *  safety, and Stress test. Each took its own cash figure and its own essentials figure, so the same
 *  person could read three different runways in one sitting — and one of them did:
 *
 *  THE DEFECT THIS CLOSED (measured 2026-09-27). Job safety read the LOGGED average only, while the
 *  other two read his ONE essentials figure — the logged average with the typed plan as the fallback
 *  (ruling G21, 2026-09-08). For a person who had logged nothing but typed $4,000 a month, Job
 *  safety showed essentials of $0, so the emergency-fund target it set was $0 and the gap was $0: it
 *  told them they needed nothing. The other two screens showed $4,000 that same day.
 */
import * as fs from 'fs';
import * as path from 'path';
import { theEmergencyFund } from '../../MoneyKeel/functions/networth-and-performance/emergency-fund';

const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
// Net worth joined on 2026-09-28, when he settled the number change I had stopped on: "give both
// numbers". It shows the runway on essentials AND the runway at the life you plan to live, so
// nothing is hidden behind one divisor. All three are behind the door now.
const ASKERS = [
  'src/screens/NetWorthScreen.tsx',
  'src/screens/JobSafetyScreen.tsx',
  'src/screens/StressTestScreen.tsx',
];

test('all three screens ask the door', () => {
  for (const rel of ASKERS) expect(read(rel)).toMatch(/theEmergencyFund\(/);
});

test('none of them takes its own essentials figure any more', () => {
  const offences: string[] = [];
  for (const rel of ASKERS) {
    const src = read(rel);
    for (const part of ['essentialsFromLoggedSpending(', 'emergencyTest(']) {
      if (src.includes(part)) offences.push(`${rel} calls ${part} — ask MK-NW-O-004 theEmergencyFund instead`);
    }
  }
  expect(offences).toEqual([]);
});

test('THE DEFECT ITSELF: a person who logged nothing gets the typed plan, not zero', () => {
  const c = theEmergencyFund({ accounts: [], expenses: [], profile: { monthlySpending: 4000, monthlyEssentials: 4000 } });
  expect(c.essentialsMonthly).toBe(4000);        // Job safety used to show 0 here
  expect(c.targetFor(6)!.target).toBe(24000);     // and a target of $0, so the gap read $0
});

test('WHAT YOU CANNOT STOP PAYING is in both figures (founder, 2026-09-28)', () => {
  const budget = {
    monthlySpending: '4500',
    spendCats: [{ id: 'rent', tier: 'critical', bucket: 'fixed', unit: 'dollar', amount: 2000 },
                { id: 'dining', tier: 'flex', bucket: 'flexible', unit: 'dollar', amount: 900 }],
  } as any;
  const debts = [
    { debt_id: 'd1', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, minimum_monthly_payment: 250 },
    { debt_id: 'd2', label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3200, minimum_monthly_payment: 120 },
    { debt_id: 'd3', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 40000, minimum_monthly_payment: 200 },
    { debt_id: 'd4', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, minimum_monthly_payment: 2000 },
  ] as any;
  const a = theEmergencyFund({ accounts: [], expenses: [], profile: budget, debts });
  // the car loan, the card and the HELOC count; the mortgage does not, because the Rent / Mortgage
  // category already carries it — otherwise it would be counted twice
  expect(a.debtMinimums).toBe(570);
  expect(a.essentialsMonthly).toBeGreaterThan(0);
  expect(a.plannedSpendMonthly).toBe(4500 + 570);
});
