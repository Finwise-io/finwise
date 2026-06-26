import { GLOSSARY, type GlossaryTerm } from './glossary';

describe('GLOSSARY (in-context education, §3.3)', () => {
  const terms = Object.keys(GLOSSARY) as GlossaryTerm[];

  test('every term has a non-empty title and body', () => {
    for (const t of terms) {
      expect(GLOSSARY[t].title.trim().length).toBeGreaterThan(0);
      expect(GLOSSARY[t].body.trim().length).toBeGreaterThan(15);
    }
  });

  test('definitions stay consistent with the canonical money model', () => {
    expect(GLOSSARY.takeHome.body).toMatch(/401\(k\)/);          // take-home is after 401k
    expect(GLOSSARY.surplus.body).toMatch(/debt/i);              // surplus is after debt
    expect(GLOSSARY.rmd.body).toMatch(/73/);                     // RMD start age
  });

  // device-test: glossary now covers asset classes + income so InfoDots can explain them in-context.
  test('asset-class + income terms exist (Net Worth class headers, holdings, Income)', () => {
    for (const t of ['cash', 'stocks', 'bonds', 'alternatives', 'realEstate', 'personalProperty', 'grossIncome', 'contributionRoom'] as const) {
      expect(GLOSSARY[t].title.trim().length).toBeGreaterThan(0);
    }
    expect(GLOSSARY.bonds.body).toMatch(/coupon|maturity/i);     // bonds explained in plain terms
  });
});
