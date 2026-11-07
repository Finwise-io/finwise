/**
 * A FIGURE THAT CANNOT BE WORKED OUT SHOWS NO FIGURE — NEVER THE MASTER FILE'S EXPLANATION IN ITS PLACE (design review, 2026-11-06).
 *
 * His Build 55 screenshot IMG_0896: the Bonds summary's AVERAGE YIELD box read "A bond with no price today is left out rather than
 * counted at zero." over six lines, and the row read "yield — when there is no coupon rate, no face value on a bond, or no value to
 * divide by." Each figure's refusal is the sentence the master file prints on its row, written for a reader of the file; printed
 * with nothing, fig() handed that sentence to the screen. The Bonds v02 row of 2026-10-07 draws it: "its yield shows no figure",
 * with the reason on its own line.
 *
 * The guard is on the CLASS, every Net worth screen in the states where figures go missing: it renders each, reads every figure
 * printed (the census), and fails on any figure printed with nothing whose words are its refusal sentence. It asserts how many
 * prints it examined, so a census that stops recording goes red rather than quiet.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { figureSpec } from '../../../MoneyKeel/functions/figures';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: any) => { const R = require('react'); R.useEffect(() => cb(), []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

// his KEY BANK CD as Build 55 imported it (no facts), and as Build 56 imports it (its facts from its name; matured 24 Aug 2026)
const CD = { asset_id: 'cd1', label: 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026', kind: 'fixed_income', asset_class: 'bonds',
  balance: 109992.74, institution: 'Robinhood', source: 'imported', value_as_of: '2026-11-04' };
const CD_FACTS = { face_value: 110000, coupon_rate: 0.0385, maturity_date: '2026-08-24' };
const HOLDING_NO_PRICE = { asset_id: 'b1', label: 'Brokerage', kind: 'brokerage', asset_class: 'stocks', balance: 0, institution: 'Fidelity',
  positions: [{ position_id: 'p1', ticker: 'ZZZQ', name: 'No Price Co', shares: 10, lots: [{ lot_id: 'l1', shares: 10, cost_per_share: null }] }] };

const STATES: [string, any[]][] = [
  ['nothing entered', []],
  ['a CD with no facts', [{ ...CD }]],
  ['a matured CD', [{ ...CD, ...CD_FACTS }]],
  ['a holding with no price and no cost', [HOLDING_NO_PRICE]],
];

const SCREENS: [string, () => any, (accts: any[]) => Record<string, string | undefined>][] = [
  ['Net worth', () => require('../NetWorthScreen').default, () => ({})],
  ['Bonds', () => require('../BondsScreen').default, () => ({})],
  ['account page', () => require('../AccountPortfolioScreen').default, (a) => ({ id: a[0]?.asset_id })],
  ['Holding', () => require('../HoldingDetailScreen').default, (a) => ({ account: a[0]?.asset_id, position: a[0]?.positions?.[0]?.position_id })],
];

// A REFUSAL THAT IS THE DRAWN SCREEN WORDS, named with the drawing that draws it. Only these may stand in a figure's place.
const DRAWN_REFUSALS: Record<string, string> = {
  'MK-NW-M-032': 'holding-detail v02, row of 2026-10-21: Price paid (average) "read No price paid on record."',
  'MK-NW-M-033': 'holding-detail v02, row of 2026-10-21: Total paid "read No price paid on record."',
};

let examined = 0;
for (const [screenName, load, params] of SCREENS) {
  for (const [stateName, accounts] of STATES) {
    if (screenName === 'account page' && accounts.length === 0) continue;   // no account to open
    if (screenName === 'Holding' && !accounts[0]?.positions) continue;      // no holding to open
    test(`${screenName}, ${stateName}: no figure box carries its explanation sentence`, () => {
      useStore.getState().resetAll();
      useStore.setState({ hideBalances: false, onboardingComplete: true, assetAccounts: accounts.map((a) => ({ ...a })), transactions: [], priceCache: {} } as any);
      mockParams = params(accounts);
      resetFiguresPrinted();
      const C = load();
      render(<C />);
      const printed = figuresPrinted();
      examined += printed.length;
      const leaked = printed.filter((p) => p.value == null && p.text === figureSpec(p.id).refusal && p.text.length > 12 && !DRAWN_REFUSALS[p.id])
        .map((p) => `${p.id}: "${p.text}"`);
      expect(leaked).toEqual([]);
    });
  }
}

test('the guard looked: it examined the figures the screens printed', () => {
  expect(examined).toBeGreaterThanOrEqual(40);
});

describe('the Bonds screen as drawn (Bonds v02, rows of 2026-10-07 and 2026-10-09)', () => {
  const B = () => { const S = require('../BondsScreen').default; return <S />; };
  const set = (a: any) => { useStore.getState().resetAll(); useStore.setState({ hideBalances: false, assetAccounts: [a], transactions: [], priceCache: {} } as any); };

  test('no rate on any bond: INTEREST A YEAR reads not entered, never $0; AVERAGE YIELD shows no figure; the line under it says why', () => {
    set({ ...CD });
    render(<B />);
    expect(screen.queryByText('A bond with no price today is left out rather than counted at zero.')).toBeNull();
    expect(screen.getByText('not entered')).toBeOnTheScreen();
    expect(screen.queryByText('$0')).toBeNull();
    expect(screen.getByText(/— no rate entered\./)).toBeOnTheScreen();
  });

  test('a matured CD: its row says matured, pays $0 and shows no yield; the summary names it as left out, matured', () => {
    set({ ...CD, ...CD_FACTS });
    render(<B />);
    const card = within(screen.getByLabelText(/KEY BANK CD.*matured Aug 24, 2026\. Opens the editor\./));
    expect(card.getByText(/matured Aug 24, 2026/)).toBeOnTheScreen();
    expect(card.getByText('$0/year coupon')).toBeOnTheScreen();
    expect(card.queryByText(/3\.85%$/)).toBeNull();
    expect(screen.getByText(/Average yield leaves out KEY BANK CD.* — matured\./)).toBeOnTheScreen();
    expect(screen.queryByText(/not shown without a maturity date/)).toBeNull();
  });
});

describe('nothing cut off, and every sheet has its ✕ (design review, 2026-11-06)', () => {
  test('a bar title takes a second line rather than being cut off — his walk title, DEC-5136', () => {
    const { SectionBand } = require('../../components/SectionBand');
    const title = 'HOW $109,993 BECAME $109,993 · THIS ACCOUNT';
    render(<SectionBand title={title} />);
    expect(screen.getByText(title).props.numberOfLines).toBe(2);
  });

  test('the tab names fit their tab: one line, shrinking to fit, never "Performa…"', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../../app/(tabs)/_layout.tsx'), 'utf8');
    expect(src).toMatch(/tabBarLabel: \(\{ color \}\) => \(\s*<Text testID=\{`tab-label-\$\{name\}`\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}/);
  });

  test('Update value has a ✕ that closes it without saving', () => {
    useStore.getState().resetAll();
    useStore.setState({ hideBalances: false, assetAccounts: [{ asset_id: 'h1', label: 'House', kind: 'real_estate', asset_class: 'real_estate', balance: 500000, value_as_of: '2026-11-01' }], transactions: [] } as any);
    mockParams = { id: 'h1' };
    const A = require('../AccountPortfolioScreen').default;
    render(<A />);
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(screen.getByText('Update value'));
    expect(screen.getByText(/^Update value — /)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Close'));
    expect(screen.queryByText(/^Update value — /)).toBeNull();
    expect((useStore.getState().assetAccounts[0] as any).balance).toBe(500000);
  });
});
