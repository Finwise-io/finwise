// Saying how far back the record goes — in words, to the person, not in a code comment.
import { coverageFor, measuredFromLabel, canAnswer, monthWords, dayWords } from '../coverage';
import type { SnapshotDay } from '../snapshots';

const day = (date: string): SnapshotDay =>
  ({ date, origin: 'observed', writtenAt: `${date}T12:00:00Z`, holdings: [], accounts: [] });
const TODAY = '2026-08-18';

describe('WHEN THE RECORD COVERS THE WINDOW — say nothing', () => {
  const days = [day('2024-01-05'), day('2026-08-18')];
  test('no sentence is shown, because none is needed', () => {
    expect(coverageFor(days, '2026-01-01', TODAY).sentence).toBe('');
    expect(coverageFor(days, '2026-01-01', TODAY).covers).toBe(true);
  });
  test('but the figure still names its own start date', () => {
    expect(measuredFromLabel(days, '2026-01-01')).toBe('since 1 January 2026');
  });
});

describe('WHEN THE WINDOW REACHES FURTHER BACK THAN THE RECORD', () => {
  // installed in July; asking for "this year"
  const days = [day('2026-07-19'), day('2026-08-18')];
  const c = coverageFor(days, '2026-01-01', TODAY);

  test('it says what it is really measured from, and names what was asked for', () => {
    expect(c.covers).toBe(false);
    expect(c.sentence).toBe('Measured from 19 July 2026, when your records begin — not from 1 January 2026.');
  });

  test('THIS IS THE FOUNDER\'S +2.0% — the label the figure never carried', () => {
    // a person who installed after a fall saw the recovery and none of the fall, labelled "this year"
    expect(measuredFromLabel(days, '2026-01-01')).toBe('since 19 July 2026');
    expect(c.measuredFrom).toBe('2026-07-19');
  });
});

describe('WHEN ONLY MONTH-ENDS SURVIVE THAT FAR BACK', () => {
  const days = [day('2022-03-31'), day('2023-07-31'), day('2025-06-01'), day('2026-08-18')];
  test('it states both what it has monthly and what it has daily', () => {
    const c = coverageFor(days, '2020-01-01', TODAY);
    expect(c.sentence).toBe(
      'Measured from 31 March 2022, when your records begin. We have month-by-month figures back to '
      + 'March 2022, and day-by-day figures for the last two years.');
  });
  test('and it knows where the daily detail starts', () => {
    expect(coverageFor(days, '2020-01-01', TODAY).dailyFrom).toBe('2024-08-18');
  });
});

describe('WHEN THERE IS NO RECORD AT ALL', () => {
  test('it says so plainly rather than showing a figure from nowhere', () => {
    const c = coverageFor([], '2026-01-01', TODAY);
    expect(c.covers).toBe(false);
    expect(c.sentence).toBe('We have not recorded anything yet. Figures will start once the app has been open for a day.');
    expect(measuredFromLabel([], '2026-01-01')).toBe('');
    expect(canAnswer([], '2026-01-01')).toBe(false);
  });
});

describe('THE WORDS THEMSELVES', () => {
  test('dates read the way a person says them', () => {
    expect(dayWords('2026-07-19')).toBe('19 July 2026');
    expect(monthWords('2022-03-31')).toBe('March 2022');
    expect(dayWords(null)).toBe('');
  });
  test('every sentence avoids saying anything about how the app stores things', () => {
    const all = [
      coverageFor([], '2026-01-01', TODAY).sentence,
      coverageFor([day('2026-07-19')], '2026-01-01', TODAY).sentence,
      coverageFor([day('2022-03-31'), day('2026-08-18')], '2020-01-01', TODAY).sentence,
    ].join(' ');
    for (const w of ['snapshot', 'prune', 'retention', 'store', 'daily row', 'record set']) {
      expect(all.toLowerCase()).not.toContain(w);
    }
  });
});
