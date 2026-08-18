// PROBES — the sentences on the Plan door.
//
// These produce WORDS rather than numbers, which is exactly why they belong in the inventory: a
// sentence can mislead as effectively as a wrong figure, and it is not caught by checking arithmetic.
// The rule running through all of them is that a sample must never be mistaken for the person's own
// number, and a plan that falls short must say WHEN.
import { oddsLine, onCourseSentence, planDoor, sampleAskLine, sampleOddsLine, shortfallAgeFromBand } from '../../src/domain/planning/hub';

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const A = (o: any = {}) => ({ asset_id: 'a', label: 'acct', tax_bucket: 'TAXABLE', balance: 0, ...o } as any);

describe('ODDS_LINE', () => {
  test('it states the chance and the age it is measured to — never a bare percentage', () => {
    expect(oddsLine('saver', 82, 92)).toBe('82% odds of lasting to age 92');
    // the age matters: 82% to 92 and 82% to 100 are different plans
    expect(oddsLine('saver', 82, 100)).toBe('82% odds of lasting to age 100');
  });
});

describe('SAMPLE_LINES — a sample must never read as the person\'s own number', () => {
  test('the sample odds say SAMPLE first, before any figure', () => {
    expect(sampleOddsLine(92)).toMatch(/^Sample:/);
  });

  test('the ask names exactly what is missing, and how many answers it takes', () => {
    expect(sampleAskLine(['your age']))
      .toBe('a sample, not your number — add your age and it becomes yours');
    expect(sampleAskLine(['your age', 'what you spend']))
      .toBe('a sample, not your number — 2 answers make it yours: your age and what you spend');
    expect(sampleAskLine(['your age', 'what you spend', 'what counts toward retirement']))
      .toMatch(/3 answers make it yours: your age, what you spend and what counts/);
  });

  test('the verb fits the question — you CHOOSE what counts, you ADD an age', () => {
    expect(sampleAskLine(['what counts toward retirement'])).toContain('choose what counts');
    expect(sampleAskLine(['your age'])).toContain('add your age');
  });

  test('nothing missing means no ask at all', () => {
    expect(sampleAskLine([])).toBe('');
  });
});

describe('PLAN_DOOR — what is still needed before the odds are the person\'s own', () => {
  test('with nothing answered it names every missing piece', () => {
    const d = planDoor({}, []);
    expect(d.missing.length).toBeGreaterThan(0);
    expect(d.missing.join(' ')).toMatch(/age/);
  });

  test('THE FOUNDER FINDING: money that does not count toward retirement does not open the door', () => {
    // someone whose only asset is the home they live in used to look complete here and then produce
    // no odds at all — the gate now means what the odds mean
    const homeOnly = [A({ kind: 'home', tax_bucket: 'PROPERTY', real_estate_use: 'primary', balance: 600_000 })];
    const d = planDoor({ birthYear: 1962, monthlySpending: 5_000 }, homeOnly);
    expect(d.missing.length).toBeGreaterThan(0);
  });

  test('an account that DOES count toward retirement opens it', () => {
    const d = planDoor({ birthYear: 1962, monthlySpending: 5_000 }, [A({ kind: 'brokerage', balance: 400_000 })]);
    expect(d.missing).toEqual([]);
  });
});

describe('WHEN A PLAN FALLS SHORT, IT SAYS WHEN', () => {
  test('the age the middle path runs out is read off the band', () => {
    expect(shortfallAgeFromBand([{ age: 80, p50: 500_000 }, { age: 88, p50: 0 }, { age: 92, p50: -1 }])).toBe(88);
  });
  test('a plan that never runs out has no shortfall age — nothing, not a zero', () => {
    expect(shortfallAgeFromBand([{ age: 92, p50: 250_000 }])).toBeNull();
    expect(shortfallAgeFromBand(null)).toBeNull();
    expect(shortfallAgeFromBand([])).toBeNull();
  });
});

describe('ON_COURSE_SENTENCE', () => {
  const base = { lens: 'saver', retireAge: 65, horizonAge: 92, potAtRetire: 900_000,
                 leftoverAtHorizon: 300_000, money };

  test('with no odds yet there is no sentence — nothing is invented', () => {
    expect(onCourseSentence({ ...base, chance: null })).toBeNull();
  });

  test('a strong plan and a weak one do not read the same', () => {
    const strong = onCourseSentence({ ...base, chance: 92 });
    const weak = onCourseSentence({ ...base, chance: 41, leftoverAtHorizon: 0, shortfallAge: 84 });
    expect(strong).not.toBe(weak);
    expect(typeof strong).toBe('string');
  });

  test('a plan that falls short names the AGE it runs out, not just that it does', () => {
    const s = onCourseSentence({ ...base, chance: 41, leftoverAtHorizon: 0, shortfallAge: 84 });
    expect(s).toContain('84');
  });
});
