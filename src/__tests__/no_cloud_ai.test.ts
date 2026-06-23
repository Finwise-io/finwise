/**
 * B-L1 guard: no user-facing screen may send financial data or receipt images to a cloud AI / LLM /
 * Vision provider. Tips run on-device; receipt OCR runs on-device (ML Kit). The cloud helpers may still
 * exist in the repo (for a future, consented feature) but must NOT be wired into a screen.
 * This is a static-source guard so the privacy claim ("never sent to AI/LLM providers") can't silently regress.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('Tips screen does NOT import or call the cloud AI (analyzeExpenses)', () => {
  const src = read('screens/TipsScreen.tsx');
  expect(src).not.toMatch(/import[^\n]*analyzeExpenses/);   // no import
  expect(src).not.toMatch(/analyzeExpenses\s*\(/);          // no call (comments use "(analyzeExpenses)")
});

test('Add-expense screen does NOT use the Google Vision OCR path', () => {
  const src = read('screens/ExpenseScreen.tsx');
  expect(src).not.toMatch(/from '[^']*receiptOCR'/);        // no import of the Vision module
  expect(src).not.toMatch(/parseReceiptWithOCR\s*\(/);      // no call
});

test('no screen imports the cloud Vision OCR module', () => {
  const dir = path.join(__dirname, '..', 'screens');
  const offenders = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') && !f.includes('__tests__'))
    .filter((f) => /from '.*receiptOCR'|parseReceiptWithOCR/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  expect(offenders).toEqual([]);
});
