// B-71: the surplus → goal funding pipeline — the store action + the screen wiring that makes a goal's
// progress come from REAL money (the surplus you assign), not a self-reported tally.
import { useStore } from '../store/useStore';
import * as fs from 'fs';
import * as path from 'path';

beforeEach(() => useStore.setState({ goals: [], allocatedByMonth: {} } as any));

test('fundGoals bumps each goal saved from surplus and records it in allocatedByMonth', () => {
  useStore.getState().addGoal({ label: 'Travel', icon: '🏖️', target: 6000, saved: 2400, color: '#000' } as any);
  useStore.getState().addGoal({ label: 'Car', icon: '🚗', target: 30000, saved: 9000, color: '#000' } as any);
  const goals = useStore.getState().goals;
  useStore.getState().fundGoals('2026-06', [
    { goalId: goals[0].id, amount: 300 },
    { goalId: goals[1].id, amount: 200 },
  ]);
  const after = useStore.getState();
  expect(after.goals.find((g) => g.label === 'Travel')!.saved).toBe(2700);
  expect(after.goals.find((g) => g.label === 'Car')!.saved).toBe(9200);
  expect(after.allocatedByMonth['2026-06']).toBe(500);   // surplus counted as assigned
});

const screen = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'screens', f), 'utf8');

test('the surplus sheet funds goals (GOALS section + fundGoals call) and Home still mounts it', () => {
  // FCC: the sheet moved to the shared MoneySheets component (one implementation, Home + Cash flow).
  const sheets = fs.readFileSync(path.join(__dirname, '..', 'components', 'MoneySheets.tsx'), 'utf8');
  expect(sheets).toMatch(/fundGoals/);
  expect(sheets).toMatch(/allocSectionHdr/);
  expect(screen('HomeScreen.tsx')).toMatch(/<AllocateSavings/);   // the month-end prompt still fires from Home
});

test('Rewards goal cards show required-monthly / on-track status from the domain', () => {
  const s = screen('RewardsScreen.tsx');
  expect(s).toMatch(/requiredMonthly\(/);
  expect(s).toMatch(/goalStatus\(/);
});
