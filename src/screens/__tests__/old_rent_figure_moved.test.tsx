/** THE OLD SINGLE RENT FIGURE, MOVED ONCE INTO THE RENT LIST (inputs-and-use audit, 2026-10-11, Net worth:
 *  MK-NW-O-004 theEmergencyFund read `rentalIncome`, a field nothing writes any more).
 *
 *  A profile saved before rent became a list is moved on its way into the store — set, loaded from the
 *  cloud, or read back from the phone — into one rent entry that names NO property. By DEC-4059d that entry
 *  is not rent until a property is picked: counted nowhere, and the Income screen asks "Which property is
 *  it?" in amber. After the move no old field is left for any function to read.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { useStore } from '../../store/useStore';
import { moveOldRentFigure, hasOldRentFigure } from '../../domain/income/old-rent-migration';
import { theEmergencyFund } from '../../../MoneyKeel/functions/networth-and-performance/emergency-fund';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ open: 'rental' }), router: { push: jest.fn(), back: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));

const OLD = { status: 'employed', incomeSources: ['employment', 'rental'], baseSalary: '9000', salaryFreq: 'monthly', salaryMode: 'gross',
  rentalIncome: '1500', rentalExpenses: '300', rentalType: 'long' as const };
const home = { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'primary', balance: 400000 };
const lake = { asset_id: 'lake', label: 'Lake house', kind: 'home', tax_bucket: 'PROPERTY', balance: 250000 };
const cash = { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 10000 };

describe('the move itself', () => {
  test('the old figure becomes one rent entry, exactly as typed, with no property — and the old fields are gone', () => {
    const moved = moveOldRentFigure(OLD as any) as any;
    expect(moved.rentals).toEqual([{ type: 'long', income: '1500', expenses: '300' }]);
    expect(moved.rentals[0].property_id).toBeUndefined();
    expect(hasOldRentFigure(moved)).toBe(false);
    expect('rentalIncome' in moved || 'rentalExpenses' in moved || 'rentalType' in moved).toBe(false);
    expect(moved.baseSalary).toBe('9000');   // nothing else on the profile is touched
  });
  test('a short let keeps its kind; words typed in the rent are kept as typed, never read as a number', () => {
    expect((moveOldRentFigure({ rentalIncome: 'about 2k', rentalType: 'short' }) as any).rentals).toEqual([{ type: 'short', income: 'about 2k', expenses: '' }]);
  });
  test('a profile that already has rent entries keeps them; the old figure is dropped', () => {
    const entries = [{ type: 'long', income: '2400', expenses: '700', property_id: 'lake' }];
    const moved = moveOldRentFigure({ rentals: entries, rentalIncome: '1500' }) as any;
    expect(moved.rentals).toEqual(entries);
    expect(hasOldRentFigure(moved)).toBe(false);
  });
  test('an old figure left blank adds no entry, and its fields still go', () => {
    const moved = moveOldRentFigure({ rentalIncome: '', rentalExpenses: '  ', rentalType: 'long' }) as any;
    expect(moved.rentals).toBeUndefined();
    expect(hasOldRentFigure(moved)).toBe(false);
  });
  test('a rent list stored in a shape that cannot be read is left exactly as it is', () => {
    const odd = { rentals: { broken: true }, rentalIncome: '1500' };
    expect(moveOldRentFigure(odd)).toBe(odd);
  });
  test('a profile with no old figure is handed back untouched — the same object', () => {
    const p = { rentals: [] as any[], baseSalary: '9000' };
    expect(moveOldRentFigure(p)).toBe(p);
  });
});

describe('every way a profile reaches the store moves it', () => {
  beforeEach(() => { useStore.getState().resetAll(); });
  test('set: setOnboardingProfile', () => {
    useStore.getState().setOnboardingProfile(OLD as any);
    const op = useStore.getState().onboardingProfile as any;
    expect(op.rentals).toEqual([{ type: 'long', income: '1500', expenses: '300' }]);
    expect(hasOldRentFigure(op)).toBe(false);
  });
  test('loaded from the cloud: loadFromCloud', () => {
    useStore.getState().loadFromCloud({ onboardingProfile: OLD } as any);
    const op = useStore.getState().onboardingProfile as any;
    expect(op.rentals).toEqual([{ type: 'long', income: '1500', expenses: '300' }]);
    expect(hasOldRentFigure(op)).toBe(false);
  });
  test('read back from the phone: the saved state is merged through the same move', () => {
    const merge = (useStore as any).persist.getOptions().merge;
    const merged = merge({ onboardingProfile: OLD }, useStore.getState());
    expect(merged.onboardingProfile.rentals).toEqual([{ type: 'long', income: '1500', expenses: '300' }]);
    expect(hasOldRentFigure(merged.onboardingProfile)).toBe(false);
    expect(merge({ onboardingProfile: null }, useStore.getState()).onboardingProfile).toBeNull();
  });
});

describe('what the person sees after the move (DEC-4059d: not rent until a property is picked)', () => {
  test('the emergency fund: the moved rent is not counted, and its line says rent is not included', () => {
    const e = theEmergencyFund({ accounts: [cash, home, lake] as any, expenses: [],
      profile: { spendCats: [{ id: 'g', label: 'Groceries', amount: 2000, bucket: 'flexible', tier: 'need' }], ...moveOldRentFigure(OLD as any) } as any });
    expect(e.rentalIncomeMonthly).toBe(0);
    expect(e.rentNotKnown).toBe(true);
    expect(e.monthsCovered).toBeCloseTo(5, 9);   // $10,000 ÷ $2,000 a month, no rent counted
  });
  test('the Income screen shows the moved entry with its rent, and asks "Which property is it?" in amber', () => {
    useStore.getState().resetAll();
    useStore.setState({ hideBalances: false, onboardingComplete: true, assetAccounts: [home, lake] } as any);
    useStore.getState().setOnboardingProfile(OLD as any);
    render(<IncomeManagerScreen />);
    expect(screen.getByDisplayValue('1500')).toBeOnTheScreen();
    expect(screen.getByText('Which property is it?')).toBeOnTheScreen();
    expect(screen.getByText('Not counted as rent until you pick its property.')).toBeOnTheScreen();
  });
});
