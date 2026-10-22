/** GUARD — the Net worth family's inputs are built ONCE (owner, DEC-0345, 2026-09-13): "inputs assembled once per
 *  family — one function builds the person's state for a family and every orchestrator in that family reads it; no
 *  orchestrator and no screen assembles its own."
 *
 *  The family's two doors are MK-NW-O-003 theNetWorth and MK-NW-O-004 theEmergencyFund. Until 2026-10-20 seven screens
 *  picked the accounts, debts, expenses and plan answers out of the store for themselves and handed them in — each a
 *  little differently (one named the person 'local', one fell back to no answers, one to an empty answer set). One
 *  function builds them now, MK-NW-F-145 netWorthInputs, read through its hook useNetWorthInputs
 *  (src/hooks/useNetWorthInputs.ts), and every screen hands a door what that hook returned.
 *
 *  What this reads, from the disk (never a typed list): every screen, component, route, sign-up and hook file. In each it
 *  finds every call of either door — under whatever local name it was imported — and classifies it:
 *    · READS THE BUILDER: the door is handed the hook's answer itself, or an object that spreads it and adds only a
 *      question of its own (the day a change is measured from, a cash figure the person is trying, a month they typed);
 *    · BUILDS ITS OWN: anything else — the store picked apart, a field of the family's inputs typed in by hand.
 *  A door named in any other way (handed on as a value, called through another name) is a record this guard cannot
 *  classify, and it fails the build rather than pass it quietly (A GUARD MUST PROVE IT LOOKED, 2026-09-28).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOTS = ['src/screens', 'src/components', 'app', 'src/onboarding', 'src/hooks'];
const DOORS: Record<string, RegExp> = {
  theNetWorth: /networth-and-performance\/net-worth$/,
  theEmergencyFund: /networth-and-performance\/emergency-fund$/,
};
/** The facts the builder gathers. A screen that names one of these in a door's question is gathering it itself. */
const FAMILY_FIELDS = new Set(['uid', 'accounts', 'debts', 'expenses', 'profile', 'transactions', 'snapshotDays']);
/** What a screen may add to the family's inputs: its own question, never a fact about the person. */
const OWN_QUESTION = new Set(['since', 'today', 'cashOverride', 'essentialsOverride']);

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}

type Finding = { file: string; door: string; line: number; reads: boolean; why: string };

/** Every place a file names one of the two doors, classified. Exported so the self-check below can feed it a fake file. */
export function doorCalls(file: string, text: string): { findings: Finding[]; unclassified: string[] } {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const local = new Map<string, string>();      // local name → door
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause?.namedBindings || !ts.isNamedImports(st.importClause.namedBindings)) continue;
    const spec = (st.moduleSpecifier as ts.StringLiteral).text;
    for (const el of st.importClause.namedBindings.elements) {
      const name = (el.propertyName ?? el.name).text;
      if (DOORS[name] && DOORS[name].test(spec)) local.set(el.name.text, name);
    }
  }
  const findings: Finding[] = [];
  const unclassified: string[] = [];
  if (!local.size) return { findings, unclassified };
  // the names this file gave to the builder's answer: `const x = useNetWorthInputs()` (or the plain function)
  const built = new Set<string>();
  const visitDecl = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isCallExpression(n.initializer)
      && ts.isIdentifier(n.initializer.expression) && /^(useNetWorthInputs|netWorthInputs)$/.test(n.initializer.expression.text)) built.add(n.name.text);
    ts.forEachChild(n, visitDecl);
  };
  visitDecl(sf);
  const isBuilt = (e: ts.Expression): boolean => (ts.isIdentifier(e) && built.has(e.text))
    || (ts.isPropertyAccessExpression(e) && isBuilt(e.expression));
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const classify = (arg: ts.Expression | undefined): { reads: boolean; why: string } => {
    if (!arg) return { reads: false, why: 'asked with nothing' };
    if (isBuilt(arg)) return { reads: true, why: 'handed the builder\'s answer' };
    if (!ts.isObjectLiteralExpression(arg)) return { reads: false, why: `handed ${arg.getText(sf).slice(0, 60)}` };
    let spreadsBuilt = false;
    for (const p of arg.properties) {
      if (ts.isSpreadAssignment(p)) {
        if (isBuilt(p.expression)) { spreadsBuilt = true; continue; }
        return { reads: false, why: `spreads ${p.expression.getText(sf)}, which is not the builder's answer` };
      }
      const name = p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : '?';
      if (FAMILY_FIELDS.has(name)) return { reads: false, why: `gathers "${name}" itself` };
      if (!OWN_QUESTION.has(name)) return { reads: false, why: `adds "${name}", which is neither a family fact nor a question this guard knows` };
    }
    return spreadsBuilt ? { reads: true, why: 'spreads the builder\'s answer and adds its own question' }
      : { reads: false, why: 'builds the question without the builder\'s answer' };
  };

  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n) && local.has(n.text)) {
      const parent = n.parent;
      if (ts.isImportSpecifier(parent)) { /* the import itself */ }
      else if (ts.isCallExpression(parent) && parent.expression === n) {
        const c = classify(parent.arguments[0]);
        findings.push({ file, door: local.get(n.text)!, line: lineOf(n), ...c });
      } else unclassified.push(`${file}:${lineOf(n)} names ${local.get(n.text)} without calling it`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { findings, unclassified };
}

function sweep() {
  const files = ROOTS.flatMap(walk);
  const findings: Finding[] = [];
  const unclassified: string[] = [];
  for (const f of files) {
    const r = doorCalls(f, fs.readFileSync(f, 'utf8'));
    findings.push(...r.findings); unclassified.push(...r.unclassified);
  }
  return { files, findings, unclassified };
}

test('no screen builds the Net worth family\'s inputs itself — every door call reads MK-NW-F-145 netWorthInputs', () => {
  const { files, findings, unclassified } = sweep();
  // THE GUARD LOOKED: the files it read, the door calls it found, and the screens they are in
  expect(files.length).toBeGreaterThanOrEqual(140);
  const screens = [...new Set(findings.map((f) => f.file))].sort();
  const reading = screens.filter((s) => findings.filter((f) => f.file === s).every((f) => f.reads));
  // printed every run: the screens that ask the family's doors, and how many read the one builder
  console.log(`screens reading the one builder: ${reading.length} of ${screens.length} — door calls examined: ${findings.length}, in ${files.length} files`);
  expect(screens.length).toBeGreaterThanOrEqual(7);
  expect(findings.length).toBeGreaterThanOrEqual(13);
  expect(unclassified).toEqual([]);
  expect(findings.filter((f) => !f.reads).map((f) => `${f.file}:${f.line} ${f.door} — ${f.why} (read useNetWorthInputs instead, DEC-0345)`)).toEqual([]);
});

test('the seven screens of 2026-10-20 are all found — if one stops asking a door, this says so rather than shrinking quietly', () => {
  const { findings } = sweep();
  expect([...new Set(findings.map((f) => f.file))].sort()).toEqual([
    'src/screens/HomeScreen.tsx',
    'src/screens/IncomeManagerScreen.tsx',
    'src/screens/InsightsScreen.tsx',
    'src/screens/JobSafetyScreen.tsx',
    'src/screens/NetWorthScreen.tsx',
    'src/screens/OtherInvestmentsScreen.tsx',
    'src/screens/StressTestScreen.tsx',
  ]);
});

test('the guard still fires: a screen that picks the store apart, or hands a door on as a value, goes red', () => {
  const fake = `import { theNetWorth as worthOf } from '../../MoneyKeel/functions/networth-and-performance/net-worth';
import { theEmergencyFund } from '../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { useNetWorthInputs } from '../hooks/useNetWorthInputs';
export default function X() {
  const nwIn = useNetWorthInputs();
  const a = worthOf({ uid: 'local', accounts: store.assetAccounts, debts: [] });
  const b = theEmergencyFund({ ...nwIn, profile: {} });
  const c = theEmergencyFund({ ...store, cashOverride: 5 });
  const d = worthOf({ ...nwIn, since: '2026-01' });
  const e = theEmergencyFund(nwIn);
  const f = [1].map(() => worthOf);
  return null;
}`;
  const { findings, unclassified } = doorCalls('src/screens/Fake.tsx', fake);
  expect(findings.map((f) => f.reads)).toEqual([false, false, false, true, true]);
  expect(findings[0].why).toBe('gathers "uid" itself');
  expect(findings[1].why).toBe('gathers "profile" itself');
  expect(unclassified).toHaveLength(1);
});
