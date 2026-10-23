/** THE FORMS OF 2026-10-20 — one Held in list, a bond's value rule on its editor, what was paid, how often a bond pays,
 *  a bond's facts on a held bond, and nothing cut to cents before it is saved. Each drawn first, on the drawing it changes
 *  (READ THIS FIRST rows of 2026-10-20 on Add an account v02, Bonds v02, Alternatives v02, Holding detail v02, Net worth v08).
 *
 *  HELD IN (DEC-2441, DEC-2484h): Add an account offered Taxable · 401(k) / IRA · Roth and saved only the tax bucket on a plain
 *  brokerage kind, so a Vanguard 401(k) typed there was named "Vanguard 401(k) / IRA", compared with SPY and classed
 *  Unclassified. Every form that asks how an account is taxed now reads one list of six.
 *  A BOND'S VALUE (DEC-0281): the Bonds editor saved a blank market value as the face value, as if the market said so; the
 *  value box now stays blank and the store's one value rule gives what was paid, else the face, marked as that. */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { accountDisplayName, assetClassOf, ASSET_CLASS_LABEL, HELD_IN_CHOICES } from '../../domain/assets';
import { benchmarkTicker } from '../../domain/performance';
import { holdingBondFacts, theBonds } from '../../../MoneyKeel/functions/networth-and-performance/bonds';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useFocusEffect: () => {},
  useSegments: () => [],
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));

const st = () => useStore.getState() as any;
const SIX = ['Taxable', '401(k)', 'Traditional IRA', 'Roth IRA', 'Roth 401(k)', 'HSA'];
const fresh = (state: any = {}) => {
  mockParams = {};
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'guided', ...state } as any);
};
const AddAccountScreen = require('../AddAccountScreen').default;
const BondsScreen = require('../BondsScreen').default;
const OtherInvestmentsScreen = require('../OtherInvestmentsScreen').default;
const NetWorthScreen = require('../NetWorthScreen').default;
const TREASURY = { asset_id: 'b1', label: 'US Treasury 2027', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24650, face_value: 25000, coupon_rate: 0.0425, maturity_date: '2027-06-30' };

describe('Held in is one list (DEC-2441, DEC-2484h)', () => {
  test('the one list is the six choices, in this order', () => {
    expect(HELD_IN_CHOICES.map((c) => c.label)).toEqual(SIX);
  });

  test('a Vanguard 401(k) typed by hand is named "Vanguard 401(k)", compared with AOR, and classed Stocks / Funds', () => {
    fresh({ assetAccounts: [] });
    render(<AddAccountScreen />);
    fireEvent.press(screen.getAllByText('Stocks / Funds')[0]);
    fireEvent.changeText(screen.getByLabelText('Account name'), 'My 401(k)');
    fireEvent.changeText(screen.getByLabelText('Institution'), 'Vanguard');
    fireEvent.changeText(screen.getByLabelText('Balance'), '50000');
    fireEvent.press(screen.getByLabelText('Held in 401(k)'));
    fireEvent.press(screen.getByLabelText('Save this account'));
    const a = st().assetAccounts.find((x: any) => x.institution === 'Vanguard');
    expect(a).toMatchObject({ kind: '401k', tax_bucket: 'PRE_TAX', asset_class: 'stocks_etf', class_source: 'user' });
    expect(accountDisplayName(a)).toBe('Vanguard 401(k)');
    expect(benchmarkTicker(a.kind)).toBe('AOR');
    expect(ASSET_CLASS_LABEL[assetClassOf(a)]).toBe('Stocks / Funds');
    // BEFORE: the old form saved kind "brokerage" and the bucket alone, and nothing about the class
    const before = { label: 'My 401(k)', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'PRE_TAX', balance: 50000 } as any;
    expect([accountDisplayName(before), benchmarkTicker(before.kind), ASSET_CLASS_LABEL[assetClassOf(before)]])
      .toEqual(['Vanguard 401(k) / IRA', 'SPY', 'Unclassified']);
  });

  test('a Roth 401(k) is saved as a 401(k) in the Roth bucket, and shows as that choice when edited', () => {
    fresh({ assetAccounts: [] });
    const first = render(<AddAccountScreen />);
    fireEvent.press(screen.getAllByText('Stocks / Funds')[0]);
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Roth at work');
    fireEvent.changeText(screen.getByLabelText('Institution'), 'Fidelity');
    fireEvent.changeText(screen.getByLabelText('Balance'), '12000');
    fireEvent.press(screen.getByLabelText('Held in Roth 401(k)'));
    fireEvent.press(screen.getByLabelText('Save this account'));
    const a = st().assetAccounts.find((x: any) => x.institution === 'Fidelity');
    expect(a).toMatchObject({ kind: '401k', tax_bucket: 'ROTH' });
    expect(accountDisplayName(a)).toBe('Fidelity Roth 401(k)');
    first.unmount();
    mockParams = { edit: a.asset_id };
    render(<AddAccountScreen />);
    expect(screen.getByLabelText('Held in Roth 401(k)').props.accessibilityState).toEqual({ selected: true });
  });

  test('a bond and an alternative keep their own kind, take the tax bucket, and keep the choice', () => {
    fresh({ assetAccounts: [] });
    render(<AddAccountScreen />);
    fireEvent.press(screen.getAllByText('Alternatives')[0]);
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Gold in my IRA');
    fireEvent.changeText(screen.getByLabelText('Balance'), '8000');
    fireEvent.press(screen.getByLabelText('Held in Traditional IRA'));
    fireEvent.press(screen.getByLabelText('Save this account'));
    expect(st().assetAccounts[0]).toMatchObject({ kind: 'crypto', tax_bucket: 'PRE_TAX', held_in: 'trad_ira', asset_class: 'alternatives' });
  });

  // FOUR FORMS ASK HOW AN ACCOUNT IS TAXED, AND THE LINK'S WRAPPER QUESTION IS A FIFTH: each offers the same six, Roth 401(k) among them
  test('Roth 401(k) is offered on all four forms — Add an account, the Bonds editor, the Alternatives editor, the Net worth add sheet — and on the link\'s wrapper question', () => {
    const offered: Record<string, string[]> = {};
    const heldIn = () => SIX.filter((w) => screen.queryByLabelText(`Held in ${w}`) || screen.queryByLabelText(w));

    fresh({ assetAccounts: [] });
    let r = render(<AddAccountScreen />);
    fireEvent.press(screen.getAllByText('Stocks / Funds')[0]);
    offered['Add an account'] = heldIn(); r.unmount();

    fresh({ assetAccounts: [TREASURY] });
    r = render(<BondsScreen />);
    fireEvent.press(screen.getByText('US Treasury 2027'));
    offered['Bonds editor'] = heldIn(); r.unmount();

    fresh({ assetAccounts: [] });
    r = render(<OtherInvestmentsScreen />);
    fireEvent.press(screen.getAllByText('＋ Add an investment')[0]);
    offered['Alternatives editor'] = heldIn(); r.unmount();

    fresh({ assetAccounts: [] });
    r = render(<NetWorthScreen />);
    fireEvent.press(screen.getByText('Next →'));                              // the step-by-step add: Cash, then Taxable accounts
    fireEvent.press(screen.getByLabelText('Add to Taxable accounts'));
    fireEvent.press(screen.getByLabelText('Stocks / Funds'));
    expect(screen.getByText('Held in')).toBeOnTheScreen();
    offered['Net worth add sheet'] = SIX.filter((w) => screen.queryAllByLabelText(w).length > 0); r.unmount();

    const SnapTradeConnect = require('../SnapTradeConnect').default;
    fresh({ assetAccounts: [{ asset_id: 'st-a1', label: 'Mystery account', balance: 1000, source: 'connected' }], wrapperConfirmQueue: ['st-a1'] });
    r = render(<SnapTradeConnect />);
    // each said with the one article rule: "is an HSA account" (2026-10-21, Performance audit row 30)
    const { withArticle } = require('../../domain/_shared/plural');
    offered['the link\'s wrapper question'] = SIX.filter((w) => screen.queryByLabelText(`Mystery account is ${withArticle(w)} account`));
    fireEvent.press(screen.getByLabelText('Mystery account is a Roth 401(k) account'));
    expect(st().assetAccounts[0]).toMatchObject({ kind: '401k', tax_bucket: 'ROTH', wrapper_confirmed: true });   // it had no Roth 401(k)
    r.unmount();

    expect(Object.keys(offered)).toHaveLength(5);
    for (const [form, six] of Object.entries(offered)) expect(`${form}: ${six.join(' · ')}`).toBe(`${form}: ${SIX.join(' · ')}`);
  });
});

describe('a bond\'s value, what was paid, and how often it pays (DEC-0281; DEC-3390)', () => {
  test('the Bonds editor leaves a blank market value blank: the value is what was paid, said so — else the face value', () => {
    fresh({ assetAccounts: [{ ...TREASURY }] });
    const r = render(<BondsScreen />);
    fireEvent.press(screen.getByText('US Treasury 2027'));
    fireEvent.changeText(screen.getByPlaceholderText('the value on your statement'), '');
    fireEvent.changeText(screen.getByLabelText('What you paid, optional'), '24100.375');
    fireEvent.press(screen.getByText('Save'));
    let b = st().assetAccounts[0];
    expect([b.balance, b.value_basis, b.amount_paid]).toEqual([24100.375, 'paid', 24100.375]);   // before: the box could not be blank — it read the face, $25,000, as a market value
    expect(screen.getByText('The value shown is what you paid — no market value entered.')).toBeOnTheScreen();
    expect(screen.getAllByText('$24,100')).toHaveLength(2);                 // the bond's value and the total, the same figure
    // opened again, the market value box is blank — the value is not a market value
    fireEvent.press(screen.getByText('US Treasury 2027'));
    expect(screen.getByPlaceholderText('the value on your statement').props.value).toBe('');
    expect(screen.getByLabelText('What you paid, optional').props.value).toBe('24100.375');
    // and with nothing paid either, the face value, said so
    fireEvent.changeText(screen.getByLabelText('What you paid, optional'), '');
    fireEvent.press(screen.getByText('Save'));
    b = st().assetAccounts[0];
    expect([b.balance, b.value_basis, b.amount_paid]).toEqual([25000, 'face', undefined]);
    expect(screen.getByText('The value shown is the face value — no market value entered.')).toBeOnTheScreen();
    r.unmount();
    expect(theBonds({ accounts: st().assetAccounts }).totalValue).toBe(25000);
  });

  test('a market value typed is the value; a typed 0 is $0 — never the face', () => {
    fresh({ assetAccounts: [{ ...TREASURY }] });
    render(<BondsScreen />);
    fireEvent.press(screen.getByText('US Treasury 2027'));
    fireEvent.changeText(screen.getByPlaceholderText('the value on your statement'), '0');
    fireEvent.press(screen.getByText('Save'));
    const b = st().assetAccounts[0];
    expect([b.balance, b.value_basis]).toEqual([0, undefined]);
  });

  test('the editor\'s value box says what blank means, in the one rule\'s order', () => {
    fresh({ assetAccounts: [{ ...TREASURY }] });
    render(<BondsScreen />);
    fireEvent.press(screen.getByText('US Treasury 2027'));
    expect(screen.getByText('Market value, as your statement shows it — without accrued interest (blank = what you paid, else face value)')).toBeOnTheScreen();
  });

  test('the Bonds list heads each bond with its own name, as drawn — not the institution', () => {
    fresh({ assetAccounts: [{ ...TREASURY, label: 'US Treasury 2029', institution: 'Fidelity' }] });
    render(<BondsScreen />);
    expect(screen.getByText('US Treasury 2029')).toBeOnTheScreen();
    expect(screen.queryByText('Fidelity')).toBeNull();                       // it read "Fidelity" where the name stands
    expect(screen.getByLabelText(/^US Treasury 2029, /)).toBeOnTheScreen();
  });

  test('Add an account · what you paid is saved as typed: empty is not entered, 0 is $0', () => {
    for (const [typed, saved] of [['9700.125', 9700.125], ['0', 0], ['', undefined]] as const) {
      fresh({ assetAccounts: [] });
      const r = render(<AddAccountScreen />);
      fireEvent.press(screen.getAllByText('Bonds')[0]);
      fireEvent.changeText(screen.getByLabelText('Account name'), 'US Treasury 2030');
      fireEvent.changeText(screen.getByLabelText('Balance'), '9850');
      fireEvent.changeText(screen.getByLabelText('Face value'), '10000');
      fireEvent.changeText(screen.getByLabelText('What you paid'), typed);
      fireEvent.press(screen.getByLabelText('Save this account'));
      const a = st().assetAccounts[0];
      expect(a.amount_paid).toBe(saved);
      expect([a.balance, a.value_basis]).toEqual([9850, undefined]);         // a balance typed is the market value
      r.unmount();
    }
  });

  test('Pays interest: asked of a bond on both forms, never of a CD; nothing chosen until tapped; saved as 1 or 2', () => {
    fresh({ assetAccounts: [] });
    let r = render(<AddAccountScreen />);
    fireEvent.press(screen.getAllByText('Bonds')[0]);
    fireEvent.changeText(screen.getByLabelText('Account name'), 'US Treasury 2030');
    fireEvent.changeText(screen.getByLabelText('Balance'), '9850');
    expect(screen.getByText('Pays interest')).toBeOnTheScreen();
    for (const l of ['Pays interest once a year', 'Pays interest twice a year']) expect(screen.getByLabelText(l).props.accessibilityState).toEqual({ selected: false });
    fireEvent.press(screen.getByLabelText('Pays interest twice a year'));
    fireEvent.press(screen.getByLabelText('Save this account'));
    expect(st().assetAccounts[0].coupons_per_year).toBe(2);
    r.unmount();
    // not chosen is not entered
    fresh({ assetAccounts: [] });
    r = render(<AddAccountScreen />);
    fireEvent.press(screen.getAllByText('Bonds')[0]);
    fireEvent.changeText(screen.getByLabelText('Account name'), 'US Treasury 2031');
    fireEvent.changeText(screen.getByLabelText('Balance'), '9850');
    fireEvent.press(screen.getByLabelText('Save this account'));
    expect(st().assetAccounts[0].coupons_per_year).toBeUndefined();
    r.unmount();
    // a CD is never asked
    fresh({ assetAccounts: [] });
    r = render(<AddAccountScreen />);
    fireEvent.press(screen.getAllByText('Bonds')[0]);
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Chase 12-month CD');
    expect(screen.queryByText('Pays interest')).toBeNull();
    expect(screen.getByText('Bought from the bank, or through a broker?')).toBeOnTheScreen();
    r.unmount();
    // the Bonds editor: the same question, the saved answer shown when opened again
    fresh({ assetAccounts: [{ ...TREASURY }] });
    render(<BondsScreen />);
    fireEvent.press(screen.getByText('US Treasury 2027'));
    fireEvent.press(screen.getByLabelText('Pays interest once a year'));
    fireEvent.press(screen.getByText('Save'));
    expect(st().assetAccounts[0].coupons_per_year).toBe(1);
    fireEvent.press(screen.getByText('US Treasury 2027'));
    expect(screen.getByLabelText('Pays interest once a year').props.accessibilityState).toEqual({ selected: true });
  });
});

describe('the average yield names what it leaves out, and why, by the one value rule (DEC-0281, 2026-10-21)', () => {
  test('Muni 2031 valued at its face and Corporate 2033 with nothing entered: each named, each with its own reason', () => {
    fresh({ assetAccounts: [] });
    const add = st().addAsset;   // the store's own write, which settles a bond's value by the one rule
    add({ ...TREASURY, asset_id: undefined });
    add({ label: 'Muni 2031', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', face_value: 10000, coupon_rate: 0.03, maturity_date: '2031-06-15', balance: undefined });
    add({ label: 'Corporate 2033', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', coupon_rate: 0.05, maturity_date: '2033-03-01', balance: undefined });
    const muni = st().assetAccounts.find((a: any) => a.label === 'Muni 2031');
    expect([muni.balance, muni.value_basis]).toEqual([10000, 'face']);
    const b = theBonds({ accounts: st().assetAccounts });
    expect(b.avgYield).toBeCloseTo(1062.5 / 24650, 12);                         // 4.31%, over the Treasury alone
    expect(b.averageLeavesOut).toEqual({ notEntered: ['Corporate 2033'], noValueToday: [], valueIsPaid: [], valueIsFace: ['Muni 2031'] });
    expect([...b.leftOutOfAverage].sort()).toEqual(['Corporate 2033', 'Muni 2031']);   // the four lists are exactly these, once each
    render(<BondsScreen />);
    expect(screen.getByText('4.31%')).toBeOnTheScreen();
    expect(screen.getByText('Average yield leaves out Muni 2031 — the value shown is the face value; a yield needs a market value.')).toBeOnTheScreen();
    expect(screen.getByText('Average yield leaves out Corporate 2033 — value not entered.')).toBeOnTheScreen();
    expect(screen.queryByText(/Muni 2031 — no value today/)).toBeNull();          // before: both read "— no value today", one line
    expect(screen.queryByText(/no value today/)).toBeNull();
  });

  test('a bond valued at what was paid says so; a market value of $0 keeps the line of 2026-10-04', () => {
    fresh({ assetAccounts: [] });
    st().addAsset({ ...TREASURY, asset_id: undefined });
    st().addAsset({ label: 'Agency 2029', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', face_value: 5000, amount_paid: 4875.5, coupon_rate: 0.04, maturity_date: '2029-01-15', balance: undefined });
    st().addAsset({ label: 'Muni bond', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', face_value: 10000, coupon_rate: 0.04, maturity_date: '2031-06-15', balance: 0 });
    render(<BondsScreen />);
    expect(screen.getByText('Average yield leaves out Agency 2029 — the value shown is what you paid; a yield needs a market value.')).toBeOnTheScreen();
    expect(screen.getByText('Average yield leaves out Muni bond — no value today.')).toBeOnTheScreen();
  });
});

describe('nothing is cut to cents before it is saved (Q49 precision; the two roundings carried until 2026-10-20)', () => {
  const pressSell = () => jest.spyOn(Alert, 'alert').mockImplementation((_t: any, _m: any, buttons: any) => buttons.find((b: any) => b.text === 'Sell').onPress());
  afterEach(() => jest.restoreAllMocks());

  test('Bonds · part of a bond sold: the face left is kept at full precision', () => {
    fresh({ assetAccounts: [{ ...TREASURY }] });
    render(<BondsScreen />);
    fireEvent.press(screen.getByText('US Treasury 2027'));
    pressSell();
    fireEvent.changeText(screen.getByPlaceholderText('amount sold (up to $24,650)'), '1000.333');
    fireEvent.press(screen.getByLabelText('Sell'));
    const b = st().assetAccounts[0];
    expect(b.face_value).toBe(25000 * ((24650 - 1000.333) / 24650));         // 23985.4836…; it was cut to 23985.48
    expect(b.face_value).not.toBe(Math.round(b.face_value * 100) / 100);
    expect(b.balance).toBeCloseTo(24650 - 1000.333, 9);                      // the sale's ledger row lowers the value, exactly
  });

  test('Alternatives · part of a holding sold: the value left is kept at full precision', () => {
    fresh({ assetAccounts: [{ asset_id: 'a1', label: 'Bitcoin', institution: 'Coinbase', kind: 'crypto', tax_bucket: 'TAXABLE', balance: 28000 }] });
    render(<OtherInvestmentsScreen />);
    fireEvent.press(screen.getByText('Bitcoin'));
    pressSell();
    fireEvent.changeText(screen.getByPlaceholderText('amount sold (up to $28,000)'), '1000.333');
    fireEvent.press(screen.getByLabelText('Sell'));
    const a = st().assetAccounts[0];
    expect(a.balance).toBeCloseTo(28000 - 1000.333, 9);                      // 26999.667, not 26999.67
    expect(a.balance).not.toBe(Math.round(a.balance * 100) / 100);
  });
});

describe('a bond held inside an account: its face value, rate and maturity from the holding editor (DEC-0281, DEC-6212)', () => {
  const { HoldingEditor } = require('../PerformanceScreen');
  const BOND = { position_id: 'p1', ticker: '912828XG0', label: 'US Treasury 2030', kind: 'fixed_income', asset_class: 'bond',
    lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 98, purchase_date: '2025-01-05' }] };
  const accounts = [{ asset_id: 'brk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions: [BOND] }] as any;

  test('a holding classed Bonds & CDs is asked the three, saved on the holding, and read by the line under the bond', () => {
    const onSave = jest.fn();
    render(<HoldingEditor open accounts={accounts} existing={{ accountId: 'brk', position: BOND as any }} onClose={jest.fn()} onSave={onSave} />);
    for (const l of ['Face value (optional)', 'Interest rate % (optional)', 'Matures (optional)']) expect(screen.getByText(l)).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Face value'), '10000');
    fireEvent.changeText(screen.getByLabelText('Coupon percent'), '4.125');
    fireEvent.press(screen.getByLabelText('Save holding'));
    const saved = onSave.mock.calls[0][1];
    expect(saved).toMatchObject({ face_value: 10000, coupon_rate: 0.04125 });
    expect(saved.maturity_date).toBeUndefined();                              // empty is not entered
    const facts = holdingBondFacts(saved, 9900);
    expect([facts?.face, facts?.couponRate]).toEqual([10000, 0.04125]);
  });

  test('a stock is never asked them, and saves none', () => {
    const onSave = jest.fn();
    const STOCK = { position_id: 'p2', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 3, cost_per_share: 200, purchase_date: '2026-01-05' }] };
    render(<HoldingEditor open accounts={accounts} existing={{ accountId: 'brk', position: STOCK as any }} onClose={jest.fn()} onSave={onSave} />);
    expect(screen.queryByText('Face value (optional)')).toBeNull();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave.mock.calls[0][1].face_value).toBeUndefined();
  });
});
