/** THE WAY INTO ITEMIZE — one door, on the screen that answers what is inside an account.
 *
 *  Found by running his seven steps on 2026-10-01: the Itemize screen had NO door in any approved
 *  design. The Net worth mock v08 does not draw one (zero mentions of the word), and the approved
 *  Account portfolio — Performance v17 frame 2 — has no Edit button at all. The only path in the code
 *  ran Net worth → account row → Account detail → Edit → back to Net worth with the edit sheet open →
 *  Itemize, and that Edit button exists ONLY in the account-detail drawing he rejected. Worse, it took
 *  that path only for cash, stocks and mixed accounts: for a bonds account Edit goes to /bonds and for
 *  alternatives to /other-investments, so Itemize was unreachable for both.
 *
 *  He was blunt about it, and right: *"Ealier you said no way to reach screen you are forcing to
 *  design and approve. Is that true? If yes, why you keep asking like a broken record."*
 *
 *  So the door was decided and applied rather than asked about. It sits on the Account portfolio,
 *  because that screen already answers what is inside an account and breaking a lump into its real
 *  holdings is that same question continued. It appears only when the account holds money and nothing
 *  is recorded inside it — which is when the screen has nothing to show and the person has something
 *  to say — and never on a linked account, which has its own records.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(SRC, p), 'utf8');
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;,)}])\/\/.*$/gm, '$1 ');

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === '__tests__' || e.name === '__snapshots__') return [];
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return filesUnder(p);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

describe('Itemize has exactly one door, and it is on the Account portfolio', () => {
  it('the Account portfolio opens it', () => {
    const t = code(read('screens/AccountPortfolioScreen.tsx'));
    expect(t).toMatch(/router\.push\(`\/itemize\?accountId=\$\{account\.asset_id\}/);
    expect(t).toContain('Itemize into holdings');
  });

  it('it shows only when the account holds money with nothing recorded inside it', () => {
    const t = code(read('screens/AccountPortfolioScreen.tsx'));
    const at = t.indexOf('itemizeDoor');
    const guard = t.slice(Math.max(0, at - 320), at);
    expect(guard).toContain('insideRows.length === 0');
    expect(guard).toContain('tickers.length === 0');
    expect(guard).toMatch(/account\.balance \|\| 0\) > 0/);
    // a linked account keeps the broker's own records — it is not ours to break apart
    expect(guard).toContain("source !== 'connected'");
  });

  it('and nowhere else opens it — one door, counted', () => {
    const files = filesUnder(SRC);
    expect(files.length).toBeGreaterThanOrEqual(120);
    const doors = files.filter((f) => /\/itemize\?/.test(code(fs.readFileSync(f, 'utf8'))));
    expect(doors.map((f) => path.relative(SRC, f)).sort())
      .toEqual(['screens/AccountPortfolioScreen.tsx']);
  });

  it('the old door is gone from the Net worth edit sheet', () => {
    const t = code(read('screens/NetWorthScreen.tsx'));
    expect(t).not.toContain('/itemize?');
  });

  it('it is reachable for every class, which the old path was not', () => {
    // the old path went through Account detail's Edit, whose route forks by class and sends a bonds
    // account to /bonds and an alternatives account to /other-investments — neither of which can
    // itemise. The new door is on the screen itself and does not fork.
    const t = code(read('screens/AccountPortfolioScreen.tsx'));
    const at = t.indexOf('itemizeDoor');
    expect(t.slice(Math.max(0, at - 320), at)).not.toContain('cls ===');
  });
});
