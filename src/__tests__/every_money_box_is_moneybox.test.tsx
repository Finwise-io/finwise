/** EVERY MONEY BOX IN THE APP IS DRAWN BY MoneyBox (DEC-8385; NW2-19, MI2-01 — FX-SHARED, 2026-10-27).
 *
 *  DEC-8385 said "One component, MoneyBox, draws every money box" — and it drew two screens' boxes. The five sheets, Add an
 *  account, Monthly income, the Bill calendar and fifty more boxes printed a typed figure plain ("1000", "2400") while the income
 *  screens printed "$7,000": one figure, two forms (tenet 4, DEC-3523). Every money box now goes through MoneyBox: "$1,000" while
 *  it is typed, 1000 stored — a box keeps its own screen's look (`bare`), so only the figure's form changed.
 *
 *  WHAT IT READS — the disk, never a list from memory: every .tsx file under src and app (tests excluded). It counts every
 *  MoneyBox, and every TextInput: a TextInput with a number keyboard must be named below with the reason it is NOT money (a rate, a
 *  day, a count); a TextInput whose own words name money (an amount, a balance, a price, a fee, a $ example) fails wherever it is.
 *  Anything it does not recognise fails — a guard that skips what it does not know reports clean while seeing a fraction.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MoneyBox, amountInBox, plainAmount } from '../components/MoneyBox';

const ROOT = path.join(__dirname, '..', '..');
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}
/** every <TextInput …/> tag in a file, whole (braces counted, so a `/>` inside an expression does not end it) */
function tags(text: string, name: string): { at: number; tag: string }[] {
  const out: { at: number; tag: string }[] = [];
  for (const m of text.matchAll(new RegExp(`<${name}\\b`, 'g'))) {
    let i = m.index! + m[0].length, depth = 0;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === '{') depth++; else if (c === '}') depth--;
      else if (depth === 0 && text.startsWith('/>', i)) { i += 2; break; }
    }
    out.push({ at: text.slice(0, m.index).split('\n').length, tag: text.slice(m.index!, i) });
  }
  return out;
}

/** THE NUMBER BOXES THAT ARE NOT MONEY, each with its reason — read from the disk on 2026-10-27: 45 names in 23 files; 47 in 24 on 2026-11-01. */
const NOT_MONEY: Record<string, [string, string][]> = {
  'src/components/DebtEditorSheet.tsx': [['value={dueDate}', 'a month and year'], ['value={apr}', 'a rate, %'], ['value={due}', 'a day of the month'],
    ['value={endBy}', 'a month and year'], ['value={startsOn}', 'a month and year']],
  'src/components/InputModal.tsx': [['keyboardType={keyboardType}', 'the box for words; an amount is the MoneyBox branch (money)']],
  'src/components/PlanInputs.tsx': [['value={ageText}', 'an age']],
  'src/components/PlanGoals.tsx': [['value={form.month}', 'a month'], ['value={form.year}', 'a year']],   // Goals built to v03, 2026-10-31 (FX-PLAN)
  'src/onboarding/modules.tsx': [['style={s.heroInput} keyboardType="number-pad"', 'an age (HeroAmount, kind number); money is the MoneyBox branch (anchored on its style since R16 emptied its placeholder, 2026-11-01)'],
    ["keyboardType={decimal ? 'decimal-pad' : 'number-pad'}", 'a rate, a birth month or year (NumRow)'], ["value={row.apr ?? ''}", 'a rate, %'],
    ["value={row.termYears ?? ''}", 'years'], ['keyboardType={c.kb}', 'a count of shares or options; the price column is a MoneyBox'],
    ["value={day ?? ''}", 'a day'], ["value={year ?? ''}", 'a year'], ["value={e.dueDay ?? ''}", 'a day'], ['value={year}', 'a year']],
  'src/screens/AccountPortfolioScreen.tsx': [['value={val}', 'a return, %'], ['value={shares}', 'a count of shares or contracts']],
  'src/screens/AddAccountScreen.tsx': [['keyboardType={opts.keyboard}', 'a field whose example is not money (a name, a rate); a $ field is the MoneyBox branch'],
    ['value={earmark}', 'a share, %']],
  'src/screens/AuthScreen.tsx': [['value={email}', 'an email address'], ['keyboardType={keyboardType}', 'words or a code']],
  'src/screens/BasePayScreen.tsx': [["op.taxMode === 'manual'", 'a tax rate, %']],
  'src/screens/BigCostsScreen.tsx': [['value={year}', 'a year']],
  'src/screens/BillCalendarScreen.tsx': [['value={form.day}', 'a day'], ['value={form.year}', 'a year']],
  'src/screens/BondsScreen.tsx': [['value={coupon}', 'a rate, %']],
  'src/screens/ContributionRoomScreen.tsx': [['value={birthText}', 'a birth year']],
  'src/screens/CreditScreen.tsx': [['value={scoreStr}', 'a credit score']],
  'src/screens/EducationScreen.tsx': [['value={v}', 'years or a rate; a $ field is the MoneyBox branch']],
  'src/screens/GoalsScreen.tsx': [['value={tMonth}', 'a month'], ['value={tYear}', 'a year']],
  'src/screens/InsuranceScreen.tsx': [['value={v}', 'years; a $ field is the MoneyBox branch']],
  'src/screens/ItemizeScreen.tsx': [['value={coupon}', 'a rate, %']],
  'src/screens/MonthlyIncomeScreen.tsx': [['value={ssDay}', 'a day of the month']],
  'src/screens/NetWorthScreen.tsx': [['value={rate}', 'a rate, %']],
  'src/screens/PerformanceScreen.tsx': [['value={perContract}', 'shares in a contract'], ["lotVal(i, 'shares'", 'a count of shares'],
    ['value={bondRate}', 'a rate, %'], ['value={buyPerContract}', 'shares in a contract'], ['value={shares}', 'a count of shares']],
  'src/screens/RetirementCockpit.tsx': [['value={String(pct)}', 'a share, %'], ['value={val}', 'a return, %']],
  'src/screens/RothScreen.tsx': [['value={rateOverride}', 'a tax rate, %']],
  'src/screens/TaxOrganizerScreen.tsx': [['stateTaxRate', 'a tax rate, %']],
};
const NUMBER_KEYBOARD = /keyboardType=(\{[^}]*\}|"(decimal-pad|number-pad|numeric|numbers-and-punctuation|phone-pad)")/;
const SAYS_MONEY = /currencySymbol\(\)|placeholder="\$\d|\b(amount|balance|price|fee|paid|cost)\b/i;

test('every money box is a MoneyBox; every other number box is named with its reason — and the guard says how much it read', () => {
  let files = 0, inputs = 0, moneyBoxes = 0;
  const unnamed: string[] = [], saysMoney: string[] = [], named = new Set<string>();
  for (const root of ['src', 'app']) {
    for (const f of walk(path.join(ROOT, root))) {
      files += 1;
      const r = rel(f);
      const text = fs.readFileSync(f, 'utf8');
      moneyBoxes += tags(text, 'MoneyBox').length;
      if (r === 'src/components/MoneyBox.tsx') continue;   // the one component's own inputs
      for (const { at, tag } of tags(text, 'TextInput')) {
        inputs += 1;
        const hit = (NOT_MONEY[r] ?? []).find(([anchor]) => tag.includes(anchor));
        if (hit) { named.add(`${r} ${hit[0]}`); continue; }
        if (NUMBER_KEYBOARD.test(tag)) unnamed.push(`${r}:${at} — a number box neither drawn by MoneyBox nor named as not money`);
        else if (SAYS_MONEY.test(tag)) saysMoney.push(`${r}:${at} — its words name money, so it is a money box: draw it with MoneyBox`);
      }
    }
  }
  console.log(`money boxes: ${moneyBoxes} MoneyBox in ${files} files; ${inputs} other text boxes read, ${named.size} named as not money`);
  // IT LOOKED — counted 2026-10-27 from the disk: 148 files, 97 MoneyBox, 93 other text boxes, 45 names of not-money boxes
  expect(files).toBeGreaterThanOrEqual(145);
  expect(moneyBoxes).toBeGreaterThanOrEqual(97);
  expect(inputs).toBeGreaterThanOrEqual(85);
  expect(unnamed).toEqual([]);
  expect(saysMoney).toEqual([]);
  // every name in the table still points at a box: a stale entry is a box that moved or went, and the table must say so
  const stale = Object.entries(NOT_MONEY).flatMap(([f, rows]) => rows.filter(([a]) => !named.has(`${f} ${a}`)).map(([a]) => `${f} ${a}`));
  expect(stale).toEqual([]);
});

test('the $ is printed once: a box after a $ the screen prints reads "1,000" (dollarBeside), and only such a box does', () => {
  const DOLLAR_BEFORE = /(currencySymbol\(\)\}\s*<\/Text>|>\s*\$\s*<\/Text>)\s*(\{\/\*[\s\S]*?\*\/\}\s*)?$/;
  const twice: string[] = [], orphan: string[] = [];
  let beside = 0, seen = 0;
  for (const root of ['src', 'app']) {
    for (const f of walk(path.join(ROOT, root))) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(/<MoneyBox\b[^>]*?/g)) {
        seen += 1;
        const before = text.slice(Math.max(0, m.index! - 260), m.index);
        const tag = tags(text.slice(m.index!), 'MoneyBox')[0]?.tag ?? '';
        const at = `${rel(f)}:${text.slice(0, m.index).split('\n').length}`;
        const isBeside = /\bdollarBeside\b/.test(tag);
        if (isBeside) beside += 1;
        if (DOLLAR_BEFORE.test(before) && !isBeside) twice.push(`${at} — a $ before the box and a $ in it`);
        if (!DOLLAR_BEFORE.test(before) && isBeside) orphan.push(`${at} — dollarBeside with no $ printed before the box`);
      }
    }
  }
  // counted 2026-10-27: 97 boxes, 21 beside a $ the screen prints (Look back's among them)
  expect(seen).toBeGreaterThanOrEqual(97);
  expect(beside).toBeGreaterThanOrEqual(21);
  expect(twice).toEqual([]);
  expect(orphan).toEqual([]);
});

describe('MoneyBox draws the figure as money and stores the plain amount', () => {
  test('typed 7000 → the box reads $7,000; the screen is handed 7000', () => {
    const seen: string[] = [];
    const Box = () => { const [v, setV] = React.useState(''); return <MoneyBox bare value={v} onChangeText={(t) => { seen.push(t); setV(t); }} a11y="Amount" />; };
    render(<Box />);
    fireEvent.changeText(screen.getByLabelText('Amount'), '7000');
    expect(screen.getByLabelText('Amount').props.value).toBe('$7,000');
    expect(seen).toEqual(['7000']);
    fireEvent.changeText(screen.getByLabelText('Amount'), '$7,000.5');
    expect(screen.getByLabelText('Amount').props.value).toBe('$7,000.5');
    expect(seen[1]).toBe('7000.5');
  });
  test('a letter is refused whole (DEC-3768c); a share shows no $; a digits limit counts digits, not the $ or commas', () => {
    const seen: string[] = [];
    render(<MoneyBox bare value="250000" onChangeText={(t) => seen.push(t)} a11y="Box" maxDigits={6} />);
    fireEvent.changeText(screen.getByLabelText('Box'), 'about 2k');
    fireEvent.changeText(screen.getByLabelText('Box'), '$2,500,000');   // 7 digits: refused
    fireEvent.changeText(screen.getByLabelText('Box'), '$250,001');     // 6 digits: kept
    expect(seen).toEqual(['250001']);
    expect(screen.getByLabelText('Box').props.value).toBe('$250,000');
    expect(amountInBox('50', false)).toBe('50');
    expect(plainAmount('$1,850.50')).toBe('1850.50');
  });
  test('a money box holds whole dollars or cents (Q49): a figure held with more is shown to the cent, a typed third decimal is refused', () => {
    // FX-NW's finding of 2026-10-30: a paid amount held as 24100.375 showed "$24,100.375". Worked by hand, half up on the digits:
    expect(amountInBox('24100.375')).toBe('$24,100.38');   // .375 → .38
    expect(amountInBox('24100.374')).toBe('$24,100.37');
    expect(amountInBox('0.995')).toBe('$1.00');            // the carry reaches the dollar
    expect(amountInBox('999.995')).toBe('$1,000.00');      // and the thousands
    expect(amountInBox('1850.5')).toBe('$1,850.5');        // one decimal typed stays as typed
    const seen: string[] = [];
    render(<MoneyBox bare value="24100.375" onChangeText={(t) => seen.push(t)} a11y="Paid" />);
    expect(screen.getByLabelText('Paid').props.value).toBe('$24,100.38');   // shown to the cent; what is stored is not touched
    fireEvent.changeText(screen.getByLabelText('Paid'), '$24,100.375');     // a third decimal: refused
    fireEvent.changeText(screen.getByLabelText('Paid'), '$24,100.37');      // cents: kept
    expect(seen).toEqual(['24100.37']);
  });
  test('bare keeps the screen’s own box style: nothing of MoneyBox’s frame is drawn around it', () => {
    render(<MoneyBox bare value="12" onChangeText={() => {}} a11y="Bare" style={{ fontSize: 15, borderWidth: 0 }} />);
    const box = screen.getByLabelText('Bare');
    expect(box.props.style).toEqual({ fontSize: 15, borderWidth: 0 });
    expect(box.props.value).toBe('$12');
  });
});
