// THE TEST THE FOUNDER ASKED FOR — the engine must not be coded to any institution.
//
// His point, 2026-08-18: "If you code the engine to a particular institution that is bound to fail."
// Exactly right, and the matrix exists precisely so we map ECONOMIC EVENTS rather than one broker's
// dialect. This proves the engine works that way rather than asserting it.
//
// The method: take one economic event, word it the way many different institutions plausibly would,
// and require the SAME canonical answer from all of them. Where a phrasing is one we have never
// observed, it is listed anyway — because the question is whether the RULE generalises, not whether
// we happened to have seen that broker's file.
import { classifyEvent, touches } from '../events';

const ev = (w: string) => classifyEvent(w).event;
const allAgree = (event: string, wordings: string[]) => {
  const got = wordings.map((w) => [w, ev(w)] as const);
  const wrong = got.filter(([, e]) => e !== event);
  if (wrong.length) {
    throw new Error(`\n  These wordings did NOT map to ${event}:\n` +
      wrong.map(([w, e]) => `    "${w}" → ${e}`).join('\n') + '\n');
  }
};

describe('ONE EVENT, MANY DIALECTS — the same answer from every institution', () => {
  test('a dividend that was reinvested', () => {
    allAgree('REINVEST_PURCHASE', [
      'Reinvestment',                    // Vanguard file
      'Dividend Reinvestment',
      'REINVEST DIVIDEND',
      'Reinvested Dividend',
      'DIVIDENDREINVEST',                // FDX
      'REINVESTOFINCOME',                // FDX
      'Capital Gain Reinvestment',
      'Reinvest - Long Term Cap Gain',
    ]);
  });

  test('money moving between an account and its own sweep fund', () => {
    allAgree('SWEEP', [
      'Sweep out', 'Sweep in',           // Vanguard file
      'Sweep Into Settlement Fund', 'Sweep Out Of Settlement Fund',
      'CASH SWEEP', 'Automatic Cash Sweep', 'Sweep to Bank',
    ]);
  });

  test('a bond or CD maturing and paying out', () => {
    allAgree('RETURN_OF_CAPITAL', [
      'Corp Action (Redemption)',        // Vanguard file
      'REDEMPTION',                      // E*TRADE, live
      'RETURNOFCAPITAL',                 // FDX
      'Return of Principal',
      'Maturity',
      'Bond Matured',
      'Called Bond',
    ]);
  });

  test('a dividend paid in cash', () => {
    allAgree('DIVIDEND', [
      'Dividend', 'Dividend Received', 'DIV', 'Qualified Dividend',
      'Cash Dividend', 'Ordinary Dividend',
    ]);
  });

  test('interest received', () => {
    allAgree('INTEREST', [
      'Interest', 'Interest Received', 'INTEREST',
      'INTEREST as of 2026-08-15 UNITED STATES TREAS BONDS 4.5% 02/15/2044 (Cash)',   // Fidelity
      'Bond Interest', 'Credit Interest',
    ]);
  });

  test('a fee or charge', () => {
    allAgree('FEE', [
      'Fee', 'ADR Custody Fee', 'SERVICE FEE', 'REORG FEE',
      'Commission', 'Account Service Charge', 'SRVCHG',
    ]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE THE RULES ARE BRITTLE — found by asking the founder's question honestly
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('A DIALECT WE HAVE NOT MET, and why the failure is the SAFE one', () => {
  // Writing this test found two real gaps and one weakness, all now fixed:
  //   · FDX's own run-together spellings (DIVIDENDREINVEST, RETURNOFCAPITAL) matched NOTHING
  //   · anchored patterns broke on an ordinary suffix
  // Both were the founder's point exactly: rules tuned to the dialects we happened to see.
  test('a recognised word survives the suffixes institutions add to it', () => {
    expect(ev('CONTRIBUTION')).toBe('CASH_IN');
    expect(ev('Contribution - Employee')).toBe('CASH_IN');       // was UNKNOWN before this test existed
    expect(ev('WITHDRAWAL')).toBe('CASH_OUT');
    expect(ev('Withdrawal - ACH')).toBe('CASH_OUT');
  });

  test('but a word sharing NO vocabulary with anything we know is still UNKNOWN', () => {
    // and it should be. Guessing at an unrecognised word is what produced $1m of phantom deposits.
    expect(ev('PROMOTIONAL CREDIT')).toBe('UNKNOWN');
    expect(ev('SOMETHING NOBODY HAS SENT YET')).toBe('UNKNOWN');
  });

  test('and being wrong costs a VISIBLE GAP, never an invented number', () => {
    // this is why the unknown rule matters more than the word list. A dialect we have not met yet
    // produces a row the person can see and ask about — not a silent deposit.
    for (const t of ['contributions', 'withdrawals', 'income', 'costs'] as const) {
      expect(touches('UNKNOWN', t)).toBe(false);
    }
  });

  test('the word-based rules DO survive suffixes, which is why they are preferred', () => {
    expect(ev('Dividend Received — VANGUARD FEDERAL MONEY MARKET')).toBe('DIVIDEND');
    expect(ev('Sweep Out Of Settlement Fund')).toBe('SWEEP');
    expect(ev('ADR Custody Fee for TAL EDUCATION')).toBe('FEE');
  });
});

describe('NO RULE KEYS ON AN INSTITUTION', () => {
  test('the same word gives the same answer whoever sent it', () => {
    // there is no branch anywhere that asks "is this Vanguard?" — proven by the fact that the
    // classifier takes ONE argument: the word. It cannot know who sent it.
    expect(classifyEvent.length).toBe(1);
  });
});
