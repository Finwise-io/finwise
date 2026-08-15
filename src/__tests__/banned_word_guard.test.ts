// THE WORD "SAFE" IS BANNED ON ANYTHING TO DO WITH MONEY (founder ruling, 2026-08-12):
//   "we should never call anything safe — as we don't know. Always ensure legally we are not saying
//    anything binding."
//
// This is a legal position, not a style preference. We are not licensed advisers and every figure
// on these surfaces is an estimate from a simulation; a label calling an amount "safe" reads as a
// guarantee we cannot make. The sweep was done on 2026-08-14 — but a sweep only fixes today. This
// guard is what stops the word walking back in, which is the whole point of enforcing with a gate
// rather than an intention.
//
// It reads USER-VISIBLE text only: rendered strings, labels, titles, accessibility labels. Internal
// identifiers (solveSafeDraw, netSafeToSpend, the 'safe' rate band) are deliberately out of scope —
// renaming them is a large mechanical change with real risk and no user benefit, and nobody reads
// them. What matters is what the app SAYS.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SCAN = ['screens', 'components', 'domain'];

// Uses that have nothing to do with money, and stay.
const ALLOWED = [
  /data is safe/i,                    // an import failed; nothing was written. About data, not value.
  /somewhere safe/i,                  // telling the user where to keep a recovery code
  /keep this safe/i,
  /SafeArea/,                         // React Native
  /keyboard-safe|type-safe|safely|safe fallback|safe reset|safe to call|safe to read/i,
  /Safeway|safeway/,                  // a grocery chain in the receipt parser
  /job safety|Job safety|JobSafety|jobsafety/,   // employment security — a different word entirely
  /colorblind-safe|colourblind-safe/,  // a palette property
  /balance-safe/,                     // a delete-safety mechanism
  /=== 'safe'|RateBand = 'safe'|\? 'safe'|band === 'safe'/,   // the internal band name, never rendered
  /never .?safe.?|Never "safe"|overstate "safe"|banned|the two "safe" words|the cap is safe/i,  // comments DOCUMENTING the ban
];

/** Strings the user can actually read: JSX text, string literals in label/title props, a11y labels. */
function userVisibleLines(src: string): string[] {
  return src.split('\n').filter((line) => {
    const code = line.replace(/^\s*(\/\/|\*).*$/, '');       // drop whole-line comments
    if (!/safe/i.test(code)) return false;
    return /['"`>]/.test(code);                              // some string or JSX text on the line
  });
}

describe('the banned word never returns to anything the user can read', () => {
  const offenders: string[] = [];

  for (const dir of SCAN) {
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) { if (entry.name !== '__tests__') walk(p); continue; }
        if (!/\.tsx?$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
        for (const line of userVisibleLines(fs.readFileSync(p, 'utf8'))) {
          if (ALLOWED.some((re) => re.test(line))) continue;
          // an internal identifier alone is fine — it is the readable words we are policing
          const readable = line.replace(/\b(safeDraw|safeDrawMonthly|netSafeToSpend|solveSafeDraw|safePool|safeAmt|safeAmounts|largestSafe|'safe'|"safe")\b/g, '');
          if (!/safe/i.test(readable)) continue;
          offenders.push(`${path.relative(ROOT, p)}: ${line.trim().slice(0, 120)}`);
        }
      }
    };
    walk(path.join(ROOT, dir));
  }

  test('no screen, component or domain string calls money safe', () => {
    expect(offenders).toEqual([]);
  });

  test('the founder-approved replacements are the ones actually on screen', () => {
    const paycheck = fs.readFileSync(path.join(ROOT, 'components/PaycheckCard.tsx'), 'utf8');
    expect(paycheck).toContain('LEFT TO SPEND');
    expect(paycheck).toContain('+ Draw from savings');
    expect(paycheck).not.toContain('SAFE TO SPEND');   // the banned original

    const glossary = fs.readFileSync(path.join(ROOT, 'domain/glossary.ts'), 'utf8');
    expect(glossary).toContain("title: 'Draw from savings'");   // every InfoDot on the draw reads this
  });
});
