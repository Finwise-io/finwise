// CONTRIBUTION ROOM, HELD TO ITS DRAWING WORD FOR WORD, IN ORDER, BOTH WAYS — MoneyKeel/documents/cashflow/
// moneykeel_pres_mock_contribution-room_v02.html, states A to F (2026-10-27, FX-CF-C).
//
// His words, 2026-10-27 (DEC-8839): "ContributionRoom, Stress Test screens - both are not standard app design as the standard design
// says box titles in dark green bar, and sub-titles in light green bar." REC2-01 (Cash flow drawing match, round 2): the v01 test
// checked each sentence for presence, so a line dropped, added or moved still passed. Here every line the drawn phone marks is the
// rendered screen's line in the same place — the two lists are equal — and the bars are read off the rendered styles.
// Workplan #361: the IRA amount for Traditional and Roth together, and the HSA cover (state F), worked by hand with IRS_LIMITS.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ContributionRoomScreen from '../ContributionRoomScreen';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { IRS_LIMITS } from '../../domain/income/limits';
import { theContributionRoom } from '../../../MoneyKeel/functions/cashflow/contribution-room';
import { phoneBlocks, drawnLines, drawnBands, renderedLines, renderedBands, levelSharedFooter } from '../../testing/drawnLines';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const MOCK = 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_contribution-room_v02.html';
const DAY = new Date(2026, 9, 27, 12);   // the drawing's day: 27 October 2026, three months left (October counts, his G36)
beforeEach(() => {
  jest.useFakeTimers({ now: DAY, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] });
  useStore.getState().resetAll();
});
afterEach(() => { jest.useRealTimers(); });
const open = (profile: Record<string, any>) => {
  useStore.setState({ hideBalances: false, onboardingProfile: profile, onboardingComplete: true } as any);
  return render(<ContributionRoomScreen />);
};

// the six drawn states, in the drawing's order, and the household each was drawn for
const STATES: [string, Record<string, any>][] = [
  ['A · the usual', { birthYear: '1965', c_401k: '1200', c_roth: '300', c_hsa: '150', medicareEnrolled: 'no' }],
  ['B · over the limit', { birthYear: '1966', c_401k: '3333.33', c_roth: '800' }],
  ['C · no birth year', { c_401k: '1000' }],
  ['D · Medicare from July', { birthYear: '1960', medicareEnrolled: 'yes', medicareStart: '2026-07' }],
  ['E · the first day', {}],
  ['F · a combined IRA and family HSA cover (#361)', { birthYear: '1971', c_401k: '1500', c_ira: '450', hsaCover: 'family' }],
];
const PHONES = phoneBlocks(MOCK);
const HTML = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', MOCK), 'utf8') as string;
/** THE DRAWING'S DATED CORRECTION ROWS, APPLIED — the phones are not redrawn (DEC-4529); each row says what a drawn line reads now.
 *  Row 7 (2026-10-31, CR3-01, the lead's ruling R13): a monthly amount prints as typed — phone B's $3,333.33 to the cent, so its year adds up
 *  ($3,333.33 × 12 = $39,999.96, shown $40,000); every amount typed whole reads as drawn, as Base pay prints the same 401(k).
 *  Row 8 (2026-10-31, R16, DEC-0296): the IRA box with nothing typed is empty — its grey "$0" goes (null = the line is not on the screen). */
const CORRECTED: [string, string | null, string][] = [['At $3,333/month', 'At $3,333.33/month', 'row 7'], ['$0', null, 'row 8']];
const asCorrected = (lines: string[]) => lines.flatMap((l) => {
  if (l === '$0') return [];                                                  // row 8: the empty box shows no figure
  const c = CORRECTED.find(([from, to]) => to != null && l.startsWith(`${from} you will put in`));
  return [c ? (c[1] as string) + l.slice(c[0].length) : l];
});

test('the drawing holds six phones, its READ THIS FIRST is dated 2026-10-27 and names his words (DEC-8839)', () => {
  expect(PHONES).toHaveLength(STATES.length);
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', MOCK), 'utf8');
  expect(html).toMatch(/READ THIS FIRST — 2026-10-27/);
  expect(html).toMatch(/DEC-8839/);
  expect(html).toContain('box titles in dark green bar, and sub-titles in light green bar');
  // his order of 2026-10-27, "I do not want to reviews screens in blind": the block opens with what he approved before for this
  // screen, his feedback word for word, and what is new for him to look at, item by item — in that order
  const a = html.indexOf('1 · What he approved before for this screen'), b = html.indexOf('2 · His feedback, word for word'), c = html.indexOf('3 · What is new to look at, item by item');
  expect([a > 0, b > a, c > b]).toEqual([true, true, true]);
  expect(html.slice(a, b)).toMatch(/^1 · What he approved before for this screen<\/h2>\s*Nothing\. No approval of/);
  expect((html.slice(c, html.indexOf('The detail, change by change')).match(/<li>/g) ?? []).length).toBeGreaterThanOrEqual(5);
});

describe.each(STATES.map(([name, profile], i) => [name, profile, i] as const))('%s', (name, profile, i) => {
  test('every line, word for word and in order, both ways: nothing drawn is missing, nothing rendered is extra', () => {
    open(profile);
    const drawn = asCorrected(drawnLines(PHONES[i]));   // the phone as drawn, with its dated rows of 2026-10-31 applied
    const built = levelSharedFooter(renderedLines(screen.toJSON()));
    // a guard proves it looked: the whole screen, top bar to the footer — never a card
    expect(drawn.length).toBeGreaterThanOrEqual(18);
    expect(drawn[0]).toBe('‹ Back');
    expect(drawn[drawn.length - 1]).toMatch(/^Estimates for guidance only/);
    expect(built).toEqual(drawn);
  });
  test('the bars: every box title on the dark-green bar, every sub-title on the light-green bar, as drawn, in order', () => {
    open(profile);
    const want = drawnBands(PHONES[i]);
    const got = renderedBands(screen.toJSON(), Colors.primaryDeep, Colors.bandLight);
    expect(got.filter((b) => b.kind === 'dark').map((b) => b.title)).toEqual(want.dark);
    expect(got.filter((b) => b.kind === 'light').map((b) => b.title)).toEqual(want.light);
    expect(want.dark.length).toBeGreaterThanOrEqual(3);    // 401(k), IRA, HSA — and Your birth year when it is not entered
    expect(want.light.length).toBeGreaterThanOrEqual(2);   // What you put in a month, Your cover — and Medicare at 65 and over
    for (const b of got) {
      // white (dark bar) or deep-green (light bar) capitals, 11 points, weight 800; square; a figure on the bar 15 points, weight 800
      expect(b.titleStyle).toMatchObject({ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: b.kind === 'dark' ? Colors.white : Colors.primaryDeep });
      expect(b.style).toMatchObject({ borderTopLeftRadius: 0, borderTopRightRadius: 0, marginHorizontal: -16 });
      if (b.valueStyle) expect(b.valueStyle).toMatchObject({ fontSize: 15, fontWeight: '800' });
    }
  });
});

// ── ROUND 3 (2026-10-31): the two dated rows, and what they hold on the screen ────────────────────────────────────────────────────────
describe('round 3 — rows 7 and 8 of 2026-10-31', () => {
  test('the drawing carries both rows, dated, and each names the words this test applies (CORRECTED above)', () => {
    expect(HTML).toMatch(/<tr><td>7<\/td><td>2026-10-31 \(settled the same day\) · /);
    expect(HTML).toMatch(/<tr><td>8<\/td><td>2026-10-31 · /);
    for (const [, to] of CORRECTED) if (to) expect(HTML).toContain(`‘${to}`);
    expect(HTML).toContain('A box nobody filled opens <b>empty</b>');
    expect(HTML).toContain('every other amount on these phones was typed whole and reads as drawn'.replace(/^e/, 'E'));
  });
  test('CR3-01, phone B by hand: "$3,333.33/month" × 12 = $39,999.96 → $40,000; − $35,750 = $4,249.96 → $4,250 over — the rows add up as printed', () => {
    open(STATES[1][1]);
    expect(screen.getByText(/^At \$3,333\.33\/month you will put in \$40,000 this year — \$4,250 over the \$35,750 limit\./)).toBeOnTheScreen();
    expect(3333.33 * 12).toBeCloseTo(39_999.96, 6);
    expect(Math.round(3333.33 * 12)).toBe(40_000);
    expect(Math.round(3333.33 * 12 - 35_750)).toBe(4_250);
  });
  test('R16: the IRA box with nothing typed is empty — no placeholder figure (phones C, D, E)', () => {
    for (const k of [2, 3, 4]) {
      const r = open(STATES[k][1]);
      const box = screen.getByLabelText('What you put into IRAs a month, Traditional and Roth together');
      expect([box.props.value, box.props.placeholder ?? '']).toEqual(['', '']);
      r.unmount();
    }
  });
  test.failing('the screen until 2026-10-31, pinned: the empty IRA box held a grey "$0" (FIXED 2026-10-31, R16)', () => {
    open(STATES[4][1]);
    expect(screen.getByLabelText('What you put into IRAs a month, Traditional and Roth together').props.placeholder).toBe('$0');
  });
});

test('every choice on the screen is at least 44 points tall (D draws them all: cover, Medicare, the thirteen months)', () => {
  open(STATES[3][1]);
  const radios = screen.UNSAFE_root.findAll((n: any) => n.props?.accessibilityRole === 'radio' && typeof n.type !== 'string' && n.props.style);
  expect(radios.length).toBeGreaterThanOrEqual(2 + 2 + 13);
  for (const r of radios) {
    const st = Object.assign({}, ...[r.props.style].flat(Infinity).filter(Boolean));
    expect(st.minHeight).toBeGreaterThanOrEqual(44);
  }
});

// ── #361, WORKED BY HAND WITH THE 2026 IRS LIMITS (src/domain/income/limits.ts, IRS_LIMITS) ───────────────────────────────────
describe('#361 — one IRA amount for Traditional and Roth together, and the HSA cover', () => {
  test('the limits the example is worked from are the 2026 IRS figures', () => {
    expect([IRS_LIMITS.elective_deferral_401k, IRS_LIMITS.catch_up_50, IRS_LIMITS.ira, IRS_LIMITS.ira_catch_up_50,
      IRS_LIMITS.hsa_self, IRS_LIMITS.hsa_family, IRS_LIMITS.hsa_catch_up_55]).toEqual([24_500, 8_000, 7_500, 1_100, 4_400, 8_750, 1_000]);
  });
  test('F, by hand: 55 this year; 401(k) $32,500 − $18,000 = $14,500; IRA $8,600 − $450 × 12 = $3,200; family HSA $8,750 + $1,000 = $9,750', () => {
    const r = theContributionRoom({ profile: STATES[5][1], today: DAY });
    expect(r.age).toBe(2026 - 1971);                                     // 55
    expect(r.k401.limit).toBe(24_500 + 8_000);                           // 32,500
    expect(r.k401.remaining).toBe(32_500 - 1_500 * 12);                  // 14,500
    expect(r.perMonthToFill401k).toBe(4_800);                            // 14,500 ÷ 3 = 4,833.33 → nearest $100
    expect(r.ira.limit).toBe(7_500 + 1_100);                             // 8,600
    expect(r.ira.used).toBe(450 * 12);                                   // 5,400
    expect(r.ira.remaining).toBe(8_600 - 5_400);                         // 3,200
    expect(r.hsaCover).toBe('family');
    expect(r.hsa.limit).toBe(8_750 + 1_000);                             // 9,750
    expect(r.hsaFullYearLimit).toBe(9_750);
  });
  test('the same person with self-only cover, and with no cover chosen: $4,400 + $1,000 = $5,400 — never the family limit unasked', () => {
    for (const hsaCover of ['self', undefined]) {
      const r = theContributionRoom({ profile: { ...STATES[5][1], hsaCover }, today: DAY });
      expect(r.hsa.limit).toBe(4_400 + 1_000);
      expect(r.hsaCover).toBe(hsaCover ?? null);
    }
  });
  test('family cover and Medicare from July: $9,750 × 6 ÷ 12 = $4,875, and the card says both', () => {
    open({ birthYear: '1960', medicareEnrolled: 'yes', medicareStart: '2026-07', hsaCover: 'family' });
    expect(screen.getByText('up to $4,875')).toBeOnTheScreen();
    expect(screen.getByText('You are enrolled in Medicare from July 2026, so HSA money counts for January to June only: $9,750 × 6 ÷ 12 = $4,875 (IRS Publication 969). This is the family limit.')).toBeOnTheScreen();
  });
  test('typing the IRA amount stores it as the one amount (c_ira), and the room moves at once; the Roth amount alone is no longer read', () => {
    open(STATES[0][1]);   // the Roth amount sign-up stored, $300, is what the box shows until something is typed
    expect(screen.getByDisplayValue('$300')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('What you put into IRAs a month, Traditional and Roth together'), '$500');
    expect((useStore.getState() as any).onboardingProfile.c_ira).toBe('500');
    expect(screen.getByText('room for $2,600')).toBeOnTheScreen();      // $8,600 − $500 × 12 = $2,600
    // cleared, the box is empty and the card reads "up to" — the Roth amount does not come back
    fireEvent.changeText(screen.getByLabelText('What you put into IRAs a month, Traditional and Roth together'), '');
    expect((useStore.getState() as any).onboardingProfile.c_ira).toBe('');
    expect(screen.getByText('up to $8,600')).toBeOnTheScreen();
  });
  test('choosing Family stores the cover and takes the family limit; Self-only takes it back', () => {
    open({ birthYear: '1971' });
    expect(screen.getByText('up to $5,400')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Family cover'));
    expect((useStore.getState() as any).onboardingProfile.hsaCover).toBe('family');
    expect(screen.getByText('up to $9,750')).toBeOnTheScreen();
    expect(screen.getByLabelText('Family cover').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByLabelText('Self-only cover'));
    expect(screen.getByText('up to $5,400')).toBeOnTheScreen();
    expect(screen.getByText(/This is the self-only limit\.$/)).toBeOnTheScreen();
  });
  test.failing('the screen until 2026-10-27, pinned: HSA cover always self-only — "self-only limit; family plans cap higher" (FIXED 2026-10-27, #361)', () => {
    open({ birthYear: '1971', hsaCover: 'family' });
    expect(screen.getByText('up to $5,400')).toBeOnTheScreen();
  });
});

test('the apostrophes on this screen are ’, as the drawings draw them (tenet 4; the shared footer is the components\' own)', () => {
  for (const [, profile] of STATES) {
    const r = open(profile);
    const own = renderedLines(screen.toJSON()).filter((l) => !l.startsWith('Estimates for guidance only'));
    expect(own.filter((l) => l.includes("'"))).toEqual([]);
    r.unmount();
  }
});
