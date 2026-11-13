/** "UPDATE MONEYKEEL TO KEEP SAVING" — held to its drawing (update-to-keep-saving v01, 2026-11-12, cloud copy R8a).
 *
 *  The drawing: MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_update-to-keep-saving_v01.html — Net worth with
 *  data (state A) and on the first day (state C), the amber banner at the top. Below the banner each state is Net worth v08 as
 *  approved, word for word, which networth_matches_v08 and networth_figures_match_v08 already hold; so this file holds the
 *  banner's own words exactly as drawn, and that the banner adds those words and nothing else: the screen with it is the screen
 *  without it, the banner's words in front. Behaviour: shown when the cloud asks for a newer version, first when both banners show,
 *  no ✕, the door opens the App Store; the same box at the top of every tab and Settings.
 */
import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { renderedLines } from '../../testing/drawnLines';
import { drawnStream, streamOf, streamBreak, CHROME_TOP } from '../../testing/stateLines';
import { HiddenBalancesBanner } from '../../components/HiddenBalancesBanner';
import { APP_STORE_URL } from '../../components/UpdateToKeepSavingBanner';
import SettingsScreen from '../SettingsScreen';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };

const FILE = 'MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_update-to-keep-saving_v01.html';
const BANNER_END = 'Update in the App Store ›';
const drawnBanner = (key: string) => { const d = drawnStream(FILE, key).replace(CHROME_TOP, ''); return d.slice(0, d.indexOf(BANNER_END) + BANNER_END.length); };
const built = () => streamOf(renderedLines(screen.toJSON()));
const same = (d: string, b: string) => { if (d !== b) throw new Error(streamBreak(d, b)); };

function netWorth(withData: boolean, needed: boolean) {
  useStore.getState().resetAll();
  useStore.setState({ user: { uid: 'pat', email: 'p@e.com', name: 'Pat' }, onboardingComplete: true, hideBalances: false, appUpdateNeeded: needed } as any);
  if (withData) {
    const s: any = useStore.getState();
    s.addAsset({ label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, source: 'manual', value_as_of: '2026-08-11' });
    s.addLiability?.({ label: 'Chase Visa', kind: 'credit_card', balance: 6000 });
  }
  return render(<NetWorth />);
}

describe.each([['STATE A', true], ['STATE C', false]] as const)('%s', (key, withData) => {
  test('the banner’s words, in order, as drawn — at the very top of the screen', () => {
    netWorth(withData, true);
    const b = built();
    same(drawnBanner(key), b.slice(0, drawnBanner(key).length));
  });

  test('the banner adds its words and nothing else moves', () => {
    netWorth(withData, false);
    const without = built();
    screen.unmount();
    netWorth(withData, true);
    same(`${drawnBanner(key)} ${without}`, built());
  });
});

test('no banner when the app may still save (the first day of an updated app looks as approved)', () => {
  netWorth(false, false);
  expect(screen.queryByText('⚠ Update MoneyKeel to keep saving')).toBeNull();
});

test('when both banners show, this one comes first; it has no ✕; its door opens MoneyKeel’s App Store page', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
  useStore.setState({ appUpdateNeeded: true, hideBalances: true } as any);
  render(<HiddenBalancesBanner />);
  expect(renderedLines(screen.toJSON())).toEqual([
    '⚠ Update MoneyKeel to keep saving',
    'This version of MoneyKeel can no longer save to the cloud. What you enter is kept on this phone and saved once MoneyKeel is updated.',
    'Update in the App Store ›',
    'Balances hidden — tap the eye to show',
  ]);
  expect(screen.queryByText('✕')).toBeNull();
  fireEvent.press(screen.getByText('Update in the App Store ›'));
  expect(open).toHaveBeenCalledWith(APP_STORE_URL);
  expect(APP_STORE_URL).toBe('https://apps.apple.com/app/id6773866960');
});

test('Settings carries it at the top too', () => {
  useStore.setState({ user: { uid: 'pat', email: 'p@e.com', name: 'Pat' }, appUpdateNeeded: true } as any);
  render(<SettingsScreen />);
  expect(renderedLines(screen.toJSON())[0]).toBe('⚠ Update MoneyKeel to keep saving');
});

test('every tab draws it from the one place: Home, Net worth, Performance, Cash flow and Plan each render HiddenBalancesBanner', () => {
  const fs = require('fs');
  const tabs = ['HomeScreen', 'NetWorthScreen', 'PerformanceScreen', 'CashFlowScreen', 'PlanHubScreen'];
  const seen = tabs.filter((t) => /<HiddenBalancesBanner \/>/.test(fs.readFileSync(require('path').join(__dirname, '..', `${t}.tsx`), 'utf8')));
  expect(seen).toEqual(tabs);   // 5 of 5
});
