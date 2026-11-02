/** ONE MINUS SIGN: A NEGATIVE AMOUNT IS WRITTEN "−$", NEVER "-$" (SU3-02, FX-SHARED 2026-10-31; tenet 4, DEC-3523).
 *
 *  Sign-up's recap printed "-$4,876", "-$4,800", "-$3,600" with a hyphen, and Home's net worth "-$333,000", while every drawing and every
 *  other screen writes the minus sign "−" (U+2212). Two causes, both held here:
 *   1. the money formatter (formatMoney, formatMoneyCents, moneyCompact) handed on the hyphen the number formatter gives;
 *   2. screens typed a hyphen in front of a money figure: `-${money(x)}`, '-' + money(x), "-$5" in an example.
 *  The second is read from the disk — every string, template and JSX text in src, app and MoneyKeel/functions — and the guard says how
 *  much it read.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { formatMoney, formatMoneyCents, moneyCompact, MINUS } from '../domain/_shared/money';
import { money, money2 } from '../domain/_shared/num';

const ROOT = path.join(__dirname, '..', '..');
const MONEY_CALL = /^(money0?|money2|moneyShort|maskedMoney2?|maskedPrice|spokenMoney2?|typedAmount|formatMoney(Cents)?|moneyCompact|currencySymbol|fig|figSaid|figPer|figSpoken)\(/;

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name) ? [p] : [];
  });
}

/** Every place a hyphen-minus is typed in front of a money figure. Returns the hits and how many money calls it looked beside. */
export function hyphenBeforeMoney(file: string, text: string): { hits: string[]; moneyCalls: number } {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = [];
  let moneyCalls = 0;
  const at = (n: ts.Node) => `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
  const isMoney = (e: ts.Node) => MONEY_CALL.test(e.getText(sf).trim());
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && isMoney(n)) moneyCalls += 1;
    // `…-${money(x)}`: the text before a money expression ends in a hyphen
    if (ts.isTemplateExpression(n)) {
      let before = n.head.text;
      for (const span of n.templateSpans) {
        if (/-\s?$/.test(before) && !/\w-\s?$/.test(before) && isMoney(span.expression)) hits.push(`${at(span)} — \`${before.slice(-12)}\${${span.expression.getText(sf).slice(0, 30)}}\``);
        before = span.literal.text;
      }
    }
    // '-' + money(x)
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken && ts.isStringLiteral(n.left) && /-\s?$/.test(n.left.text) && isMoney(n.right)) {
      hits.push(`${at(n)} — '${n.left.text}' + ${n.right.getText(sf).slice(0, 30)}`);
    }
    // <Text>-{money(x)}</Text>
    if (ts.isJsxElement(n)) {
      n.children.forEach((c, i) => {
        const next = n.children[i + 1];
        if (ts.isJsxText(c) && /-\s?$/.test(c.text) && next && ts.isJsxExpression(next) && next.expression && isMoney(next.expression)) hits.push(`${at(c)} — JSX "-" before {${next.expression.getText(sf).slice(0, 30)}}`);
      });
    }
    // A SIGN BUILT BY HAND (CF6-19, 2026-11-02): `isIncome ? '+' : '-'` before {fig(…)} on All transactions, `k < 0 ? '-' : ''` in the
    // sign-up bars' moneyShort ('-$1.2K'). Any choice whose branch is a lone hyphen against '' or '+' is a sign being written — the
    // one minus writer (MINUS) writes it, never a hyphen.
    if (ts.isConditionalExpression(n)) {
      const lone = (e: ts.Expression) => ts.isStringLiteral(e) && /^\s?-\s?$/.test(e.text);
      const other = (e: ts.Expression) => ts.isStringLiteral(e) && /^\s?\+?\s?$/.test(e.text);
      if ((lone(n.whenTrue) && other(n.whenFalse)) || (lone(n.whenFalse) && other(n.whenTrue))) hits.push(`${at(n)} — a sign written as a hyphen: ${n.getText(sf).slice(0, 50)}`);
    }
    // a typed example "-$5"
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n))
      && /(^|[^\w])-\$\d/.test(n.text)) hits.push(`${at(n)} — "${n.text.trim().slice(0, 40)}"`);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { hits, moneyCalls };
}

describe('the one money formatter writes the minus sign', () => {
  test('whole dollars, cents and the short form: "−$", never "-$"', () => {
    expect(MINUS).toBe('−');
    expect(formatMoney(-4876)).toBe('−$4,876');
    expect(money(-333000)).toBe('−$333,000');       // Home's net worth figure goes through this
    expect(formatMoneyCents(-12.5)).toBe('−$12.50');
    expect(money2(-0.5)).toBe('−$0.50');
    expect(moneyCompact(-1200000)).toBe('−$1.2MM');
    expect(moneyCompact(-1500)).toBe('−$2K');
    expect(formatMoney(4876)).toBe('$4,876');        // a positive figure is untouched
  });
  test('a figure that rounds to nothing is $0, never a signed zero', () => {
    expect(formatMoney(-0.4)).toBe('$0');            // Intl wrote "-$0"
    expect(formatMoneyCents(-0.004)).toBe('$0.00');
  });
});

test('no screen types a hyphen in front of a money figure, in src, app or MoneyKeel/functions — and the guard says how much it read', () => {
  const hits: string[] = [];
  let files = 0, moneyCalls = 0;
  for (const root of ['src', 'app', 'MoneyKeel/functions']) {
    for (const f of walk(path.join(ROOT, root))) {
      files += 1;
      const r = hyphenBeforeMoney(f, fs.readFileSync(f, 'utf8'));
      hits.push(...r.hits); moneyCalls += r.moneyCalls;
    }
  }
  console.log(`one minus sign: ${files} files, ${moneyCalls} money calls looked beside`);
  // counted 2026-10-31 from the disk, not typed from memory: 285 files, 1,040 money calls. Floors just under, so a reader that stops
  // finding files goes red rather than quiet.
  expect(files).toBeGreaterThanOrEqual(291);       // 291 files, 1,122 money calls on 2026-11-02 (PF-TOOLS, round 6)
  expect(moneyCalls).toBeGreaterThanOrEqual(1122);
  expect(hits).toEqual([]);
});

test('the guard catches what it is for (fed one of each)', () => {
  const probe = "const a = `-${money(x)}/year`; const b = '-' + money(y); const c = <T>-{maskedMoney(z)}</T>; const d = 'down -$5'; const ok = `${MINUS}${money(x)}`; const e = `pre-${money(x)}`;\n";
  const r = hyphenBeforeMoney(path.join(ROOT, 'probe.tsx'), probe);
  expect(r.hits).toHaveLength(4);   // the word-hyphen "pre-" is not a minus sign
});

test('the guard catches a sign written by hand (CF6-19: All transactions\' "-$15.00", the sign-up bars\' "-$1.2K")', () => {
  const probe = "const a = <T>{isIncome ? '+' : '-'}{fig('MK', x)}</T>; const b = `${k < 0 ? '-' : ''}${currencySymbol()}${k}K`; const ok = <T>{isIncome ? '+' : MINUS}{fig('MK', x)}</T>; const c = a ? '-' : 'none';\n";
  const r = hyphenBeforeMoney(path.join(ROOT, 'probe.tsx'), probe);
  expect(r.hits).toHaveLength(2);   // a hyphen against a word ('none') is not a sign
});
