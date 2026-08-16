// AUDIT D — 10 DECISIONS, each traced to the SHIPPED CODE rather than to a document.
// A decision recorded in a changelog and absent from the app is not a decision, it is a note.
import fs from 'fs';
import path from 'path';
const R = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(R, p), 'utf8');
const F: string[] = [];
const check = (id: string, what: string, ok: boolean, detail = '') => { if (!ok) F.push(`${id} ${what}${detail ? ' — ' + detail : ''}`); };

test('AUDIT D — 10 founder decisions, in the code', () => {
  const outcome = read('components/PlanOutcome.tsx');
  const hub = read('domain/planning/hub.ts');
  const target = read('domain/planning/target.ts');
  const inputs = read('components/PlanInputs.tsx');
  const plan = read('screens/PlanHubScreen.tsx');
  const insights = read('screens/InsightsScreen.tsx');
  const spend = read('domain/planning/spendMore.ts');
  const econ = read('services/economicData.ts');

  // D1 the target is TYPED, never derived and labelled as theirs
  check('D1', 'typed target exists and drives the dial',
    /typedTarget/.test(target) && /typedTarget/.test(outcome) && /targetNestEgg/.test(read('store/useStore.ts')));

  // D2 our suggestion is labelled as ours
  check('D2', 'the suggestion says it is ours', /our starting figure, not yours/.test(inputs));

  // D3 a typed target never moves the odds
  check('D3', 'target is not an input to the simulation', !/typedTarget/.test(read('domain/retirement/index.ts')));

  // D4 Social Security window is 60–70 and SHARED between surfaces
  check('D4', 'one 60-70 window across the app',
    /SS_DECISION_FROM = 60/.test(hub) && /SS_DECISION_TO = 70/.test(hub)
    && /SS_DECISION_FROM && age <= SS_DECISION_TO/.test(insights));

  // D5 the dated obligation LEADS the list; no separate card
  check('D5', 'no standalone next-decision card', !/styles\.nextCard\b[\s\S]{0,80}onPress={\(\) => router\.push\(next\.route/.test(plan));
  check('D5b', 'the dated row wears its date', /due={next\.kicker/.test(plan));

  // D6 the word "safe" is gone from money copy, and a guard stops it returning
  check('D6', 'banned-word guard exists', fs.existsSync(path.join(R, '__tests__/banned_word_guard.test.ts')));
  check('D6b', 'the retiree hero says LEFT TO SPEND', /LEFT TO SPEND/.test(read('components/PaycheckCard.tsx')));

  // D7 counts, not bare percentages, on consequence sentences
  check('D7', 'consequences read as counts', /future simulations out of/.test(spend));

  // D8 "projects to", never "reaches" — no promise about an uncertain future
  check('D8', 'the closing sentence projects', /projects to/.test(outcome) && !/reaches your target/.test(outcome));

  // D9 growth is explained, so the subtraction a person does resolves
  check('D9', 'the growth breakdown is on screen', /Growth does almost half the work/.test(outcome));

  // D10 hide balances: the odds stay, money-derived percentages mask
  check('D10', 'maskedPct exists and the target dial uses it',
    /maskedPct/.test(read('components/useMoney.ts')) && /maskedPct\(t\.targetPct\)/.test(outcome));

  // D11 the mortgage decision left Retire for Debt
  check('D11', 'no mortgage row on the retire panel', !/Pay off the mortgage early/.test(plan));
  check('D11b', 'and the comparison lives on the debt surface',
    /MortgageRateCompare/.test(read('screens/BudgetScreen.tsx')));

  // D12 the ten-year yield is live, not the dead endpoint
  check('D12', 'the yield reads the Federal Reserve series',
    /fredgraph\.csv\?id=DGS10/.test(econ) && !/avg_interest_rates/.test(econ));

  // D13 assumptions are labelled as ours
  check('D13', 'assumed values say they are ours', /ours until you change it/.test(inputs));

  // D14 no fake zeros on the first screen
  check('D14', 'no $0 for what counts or big costs', /counted > 0 \? maskedMoney\(counted\) : '—'/.test(inputs));

  if (F.length) throw new Error('\nDECISION FINDINGS:\n' + F.join('\n'));
});
