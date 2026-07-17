// F10 end-to-end: a connected money-out transaction → store review → flag → Home slot-1 card →
// detail resolution (two buttons, known-payee memory). Pins the design's hard rules: manual rows
// are never questioned; an open card always takes What-needs-you slot 1; resolutions are explicit.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import WorthALookScreen from '../screens/WorthALookScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }) }));

const CHECKING = { asset_id: 'chk', label: 'checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 20000, cash_balance: 20000 };

const seedHistory = () => {
  // 5 connected withdrawals under every threshold (median $210, all < $250 payee floor) so the
  // account is warm without the seeding itself tripping a rule.
  [180, 200, 210, 220, 230].forEach((amount, i) => useStore.getState().recordTransaction({
    type: 'WITHDRAWAL', account_id: 'chk' as any, amount, note: 'groceries',
    date: `2026-07-0${i + 1}`, source: 'connected',
  } as any));
};

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [CHECKING] } as any);
});

describe('store wiring', () => {
  test('a connected unusually-large withdrawal creates ONE open flag with the typical stored', () => {
    seedHistory();
    useStore.getState().recordTransaction({
      type: 'WITHDRAWAL', account_id: 'chk' as any, amount: 2400, note: 'APEX SOLUTIONS',
      date: '2026-07-10', source: 'connected',
    } as any);
    const flags = useStore.getState().txnFlags;
    expect(flags).toHaveLength(1);
    expect(flags[0].status).toBe('open');
    expect(flags[0].reason).toBe('unusually_large');
    expect(flags[0].comparison).toBe(210);
  });

  test('a hand-typed withdrawal of any size NEVER creates a flag', () => {
    seedHistory();
    useStore.getState().recordTransaction({
      type: 'WITHDRAWAL', account_id: 'chk' as any, amount: 50000, note: 'BRAND NEW PAYEE',
      date: '2026-07-10',   // no source → manual
    } as any);
    expect(useStore.getState().txnFlags).toHaveLength(0);
  });

  test('"Yes, this was me" on a first-time-payee flag remembers the payee — it is never asked again', () => {
    seedHistory();
    const record = () => useStore.getState().recordTransaction({
      type: 'WITHDRAWAL', account_id: 'chk' as any, amount: 400, note: 'APEX SOLUTIONS',
      date: '2026-07-10', source: 'connected',
    } as any);
    record();
    const flag = useStore.getState().txnFlags[0];
    expect(flag.reason).toBe('first_time_payee');
    useStore.getState().resolveTxnFlag(flag.flag_id, 'was_me');
    expect(useStore.getState().knownPayees['chk']).toContain('apex solutions');
    record();   // same payee again
    expect(useStore.getState().txnFlags.filter((f) => f.status === 'open')).toHaveLength(0);
  });
});

describe('the detail screen', () => {
  const openFlag = () => {
    seedHistory();
    useStore.getState().recordTransaction({
      type: 'WITHDRAWAL', account_id: 'chk' as any, amount: 2400, note: 'apex solutions',
      date: '2026-06-30', source: 'connected',
    } as any);
  };

  test('shows the facts and the stored comparison (8 times the usual $310)', () => {
    openFlag();
    render(<WorthALookScreen />);
    expect(screen.getByText(/\$2,400 left Chase checking/)).toBeOnTheScreen();
    expect(screen.getByText(/Paid to: Apex Solutions/)).toBeOnTheScreen();   // title-cased, never SHOUTED (audit WL-5)
    expect(screen.getByText(/about \$210/)).toBeOnTheScreen();
    expect(screen.getByText(/11 times/)).toBeOnTheScreen();
    expect(screen.getByText(/never move or block money/)).toBeOnTheScreen();
  });

  test('"Yes, this was me" resolves the flag', () => {
    openFlag();
    render(<WorthALookScreen />);
    fireEvent.press(screen.getByLabelText('Yes, this was me'));
    expect(useStore.getState().txnFlags[0].status).toBe('was_me');
  });

  test('"Something\'s off" expands the checklist in place and keeps a follow-up until settled', () => {
    openFlag();
    render(<WorthALookScreen />);
    fireEvent.press(screen.getByLabelText("Something's off — show me what to do"));
    expect(screen.getByText(/Call the number on the back of your bank card/)).toBeOnTheScreen();
    expect(useStore.getState().txnFlags[0].status).toBe('flagged');
    fireEvent.press(screen.getByLabelText('Mark settled'));
    expect(useStore.getState().txnFlags[0].status).toBe('was_me');
  });

  test('v1 copy ban: the words scam, fraud and alert never render', () => {
    openFlag();
    render(<WorthALookScreen />);
    expect(screen.queryByText(/scam/i)).toBeNull();
    expect(screen.queryByText(/fraud/i)).toBeNull();
    expect(screen.queryByText(/alert/i)).toBeNull();
  });

  test('no flags → the honest quiet note (feature exists, nothing to look at)', () => {
    render(<WorthALookScreen />);
    expect(screen.getByText('Nothing to look at')).toBeOnTheScreen();
    expect(screen.getByText(/hand-typed entries are yours/)).toBeOnTheScreen();
  });
});

describe('insights slot 1 (the sameness pin: Home card = Insights top item)', () => {
  test('an open flag takes slot 1 ahead of every other rule', () => {
    const { buildInsights } = require('../domain/insights');
    const out = buildInsights({
      cashMonths: 0,                                       // would fire priority-1 runway
      toxicDebt: { label: 'Card', apr: 0.24 },             // would fire priority-1 toxic-debt
      k401Remaining: 5000, hasEarnedIncome: true, retireChance: 40,
      cashDragPct: 50, topAccountPct: 80, planPct: 50, beatBy: -0.1, investRate: 0.01,
      worthALook: { amount: 2400, account: 'Chase checking', more: 1, followUp: false },
    });
    expect(out[0].id).toBe('worth-a-look');
    expect(out[0].body).toContain('$2,400');
    expect(out[0].body).toContain('and 1 more');
    expect(out[0].route).toBe('/worth-a-look');
  });

  test('rmd-due / ss-window / goals-gap fire with quantified copy', () => {
    const { buildInsights } = require('../domain/insights');
    const base = { cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: false, retireChance: 90, cashDragPct: 0, topAccountPct: 0, planPct: 100, beatBy: null, investRate: null };
    const rmd = buildInsights({ ...base, rmdDue: { amount: 12300 } });
    expect(rmd[0].id).toBe('rmd-due');
    expect(rmd[0].body).toContain('$12,300');
    const ss = buildInsights({ ...base, ssWindow: true });
    expect(ss[0].id).toBe('ss-window');
    const gap = buildInsights({ ...base, goalsGap: 450 });
    expect(gap[0].id).toBe('goals-gap');
    expect(gap[0].body).toContain('$450');
  });
});
