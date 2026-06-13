/**
 * Screen-level insight checks — the input-construction in useInsights (thresholds, gates, sources)
 * is where the cross-module consistency bugs live, so they're tested through the rendered screen.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import InsightsScreen from '../InsightsScreen';
import { useStore } from '../../store/useStore';

beforeEach(() => {
  useStore.getState().resetAll();
});

// BUG-LEDGER: B-51 — "toxic / high-interest debt" uses the same 7% threshold everywhere; an 8% debt
// that the debt module + Net Worth flag must also fire the Home/Insights "high-interest debt" card.
describe('B-51 toxic-debt threshold', () => {
  test('an 8% debt fires the high-interest-debt insight (was silent at the old 10% cutoff)', () => {
    useStore.setState({
      liabilities: [{ debt_id: 'd1', label: 'Store card', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 }],
    });
    render(<InsightsScreen />);
    expect(screen.getByText('Tackle high-interest debt first')).toBeOnTheScreen();
    expect(screen.getByText(/8% APR/)).toBeOnTheScreen();
  });

  test('a 5% debt does not fire it', () => {
    useStore.setState({
      liabilities: [{ debt_id: 'd1', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.05, minimum_monthly_payment: 420 }],
    });
    render(<InsightsScreen />);
    expect(screen.queryByText('Tackle high-interest debt first')).toBeNull();
  });
});
