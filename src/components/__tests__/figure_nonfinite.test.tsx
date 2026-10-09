// A NUMBER THAT IS NOT A NUMBER NEVER REACHES THE SCREEN (outside review OpenAI final, 2026-10-09, DEC-3523).
// fig() treats NaN and Infinity exactly as a refused (null) figure: the same refusal words, no "NaN",
// no period stuck after it, and the census records it as a refusal (value null), not as NaN.
import { fig, figPer, figSpoken, figSaid, figuresPrinted, resetFiguresPrinted } from '../figure';
import { figureSpec } from '../../../MoneyKeel/functions/figures';

const ID = 'MK-NW-M-004';   // What you own

describe('fig() — a non-finite value is a refused figure', () => {
  beforeEach(() => resetFiguresPrinted());

  test.each([NaN, Infinity, -Infinity])('%p prints the same words as null, never "NaN"', (bad) => {
    for (const write of [fig, figPer, figSaid]) {
      const text = write(ID, bad);
      expect(text).toBe(write(ID, null));
      expect(text).not.toMatch(/NaN|Infinity/);
    }
    expect(figSpoken(ID, bad)).toBe(figSpoken(ID, null));
  });

  test('the refusal is the figure\'s own declared words, and the census sees null, not NaN', () => {
    expect(fig(ID, NaN)).toBe(figureSpec(ID).refusal);
    expect(figuresPrinted().map((p) => p.value)).toEqual([null]);
  });

  test('a real number still prints as a number — $26,051', () => {
    expect(fig(ID, 26050.75)).toBe('$26,051');
  });
});
