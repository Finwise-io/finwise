/**
 * Smoke renders for every screen × {rich persona state, empty state}.
 * A screen that throws on render is a launch blocker (launch plan P0 area 7) — every failure
 * here gets a row in docs/finwise-bug-ledger.md.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { employedPartner, retiree75 } from '../../testing/personas';

import AnalyticsScreen from '../AnalyticsScreen';
import BillCalendarScreen from '../BillCalendarScreen';
import BondsScreen from '../BondsScreen';
import BudgetScreen from '../BudgetScreen';
import CreditScreen from '../CreditScreen';
import EducationScreen from '../EducationScreen';
import EstateScreen from '../EstateScreen';
import ExpenseScreen from '../ExpenseScreen';
import GoalsScreen from '../GoalsScreen';
import HomeScreen from '../HomeScreen';
import IncomeDetailScreen from '../IncomeDetailScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import IncomeScreen from '../IncomeScreen';
import InsightsScreen from '../InsightsScreen';
import InsuranceScreen from '../InsuranceScreen';
import JobSafetyScreen from '../JobSafetyScreen';
import NetWorthScreen from '../NetWorthScreen';
import OtherInvestmentsScreen from '../OtherInvestmentsScreen';
import PerformanceScreen from '../PerformanceScreen';
import RetirementCockpit from '../RetirementCockpit';
import RewardsScreen from '../RewardsScreen';
import RothScreen from '../RothScreen';
import SettingsScreen from '../SettingsScreen';
import SharpenPlanScreen from '../SharpenPlanScreen';
import StressTestScreen from '../StressTestScreen';
import TaxOrganizerScreen from '../TaxOrganizerScreen';
import TipsScreen from '../TipsScreen';

// AuthScreen and OnboardingScreen are exercised separately (auth needs deeper firebase
// scaffolding; onboarding has its own flow_audit + engine coverage).
const SCREENS: [string, React.ComponentType<any>][] = [
  ['MonthlyIncomeScreen', require('../MonthlyIncomeScreen').default],
  ['PlanHubScreen', require('../PlanHubScreen').default],
  ['WorthALookScreen', require('../WorthALookScreen').default],
  ['IdleCashScreen', require('../IdleCashScreen').default],
  ['PaycheckMonthsScreen', require('../PaycheckMonthsScreen').default],
  ['AnalyticsScreen', AnalyticsScreen],
  ['BillCalendarScreen', BillCalendarScreen],
  ['BondsScreen', BondsScreen],
  ['BudgetScreen', BudgetScreen],
  ['CreditScreen', CreditScreen],
  ['EducationScreen', EducationScreen],
  ['EstateScreen', EstateScreen],
  ['ExpenseScreen', ExpenseScreen],
  ['GoalsScreen', GoalsScreen],
  ['HomeScreen', HomeScreen],
  ['IncomeDetailScreen', IncomeDetailScreen],
  ['IncomeManagerScreen', IncomeManagerScreen],
  ['IncomeScreen', IncomeScreen],
  ['InsightsScreen', InsightsScreen],
  ['InsuranceScreen', InsuranceScreen],
  ['JobSafetyScreen', JobSafetyScreen],
  ['NetWorthScreen', NetWorthScreen],
  ['OtherInvestmentsScreen', OtherInvestmentsScreen],
  ['PerformanceScreen', PerformanceScreen],
  ['RetirementCockpit', RetirementCockpit],
  ['RewardsScreen', RewardsScreen],
  ['RothScreen', RothScreen],
  ['SettingsScreen', SettingsScreen],
  ['SharpenPlanScreen', SharpenPlanScreen],
  ['StressTestScreen', StressTestScreen],
  ['TaxOrganizerScreen', TaxOrganizerScreen],
  ['TipsScreen', TipsScreen],
];

function seedRichState() {
  const s = useStore.getState();
  s.setOnboardingProfile(employedPartner as any);
  s.setOnboardingComplete(true);
  s.seedNetWorth(employedPartner as any);
  s.addExpense({ amount: 120, category: 'Groceries', store: 'Costco', date: '2026-06-05' });
  s.addExpense({ amount: 60, category: 'Dining', store: 'Thai place', date: '2026-06-08' });
}

describe.each(SCREENS)('%s', (_name, Screen) => {
  test('renders with a rich persona without throwing', () => {
    useStore.getState().resetAll();
    seedRichState();
    const { unmount } = render(<Screen />);
    unmount();
  });

  test('renders with a fresh empty store without throwing', () => {
    useStore.getState().resetAll();
    const { unmount } = render(<Screen />);
    unmount();
  });
});

describe('retired persona', () => {
  test.each([['HomeScreen', HomeScreen], ['RetirementCockpit', RetirementCockpit]] as [string, React.ComponentType<any>][])(
    '%s renders for the decumulation flow without throwing',
    (_name, Screen) => {
      useStore.getState().resetAll();
      const s = useStore.getState();
      s.setOnboardingProfile(retiree75 as any);
      s.setOnboardingComplete(true);
      s.seedNetWorth(retiree75 as any);
      const { unmount } = render(<Screen />);
      unmount();
    },
  );
});
