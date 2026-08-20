// The event engine, proved against the exact words in the founder's own Vanguard and Fidelity files.
import { classifyEvent, touches, EVENTS } from '../events';

const ev = (w: string) => classifyEvent(w).event;

describe("VANGUARD — every word in the founder's real file", () => {
  test('the three that caused the $1.4m are now named, not guessed', () => {
    expect(ev('Sweep out')).toBe('SWEEP');
    expect(ev('Sweep in')).toBe('SWEEP');
    expect(ev('Corp Action (Redemption)')).toBe('RETURN_OF_CAPITAL');
  });

  test('none of the three counts as money coming in or going out', () => {
    for (const w of ['Sweep out', 'Sweep in', 'Corp Action (Redemption)']) {
      expect(touches(ev(w), 'contributions')).toBe(false);
      expect(touches(ev(w), 'withdrawals')).toBe(false);
    }
  });

  test('the reinvestment pair splits correctly — income once, purchase separately', () => {
    expect(ev('Dividend')).toBe('DIVIDEND');
    expect(ev('Reinvestment')).toBe('REINVEST_PURCHASE');
    expect(touches('DIVIDEND', 'income')).toBe(true);
    expect(touches('REINVEST_PURCHASE', 'income')).toBe(false);   // the $2,387 cannot recur
    expect(touches('REINVEST_PURCHASE', 'contributions')).toBe(false);
  });

  test('the rest of the file', () => {
    expect(ev('Interest')).toBe('INTEREST');
    expect(ev('Buy')).toBe('BUY');
    expect(ev('Fee')).toBe('FEE');
  });
});

describe("FIDELITY — the founder's activity export, where the action carries detail", () => {
  test('a word with the whole security description appended still classifies', () => {
    expect(ev('INTEREST as of 2026-08-15 UNITED STATES TREAS SER BONDS OF FEBRUAR 4.50000% 02/15/2044 BDS (Cash)'))
      .toBe('INTEREST');
  });

  test('and it is income, not a deposit — the old code would have guessed deposit', () => {
    expect(touches('INTEREST', 'income')).toBe(true);
    expect(touches('INTEREST', 'contributions')).toBe(false);
  });
});

describe("E*TRADE — words live-verified on the founder's real account", () => {
  test('the external ones, which are the ONLY two that move contributions', () => {
    expect(ev('CONTRIBUTION')).toBe('CASH_IN');
    expect(ev('WITHDRAWAL')).toBe('CASH_OUT');
    expect(ev('WIRE IN')).toBe('CASH_IN');
    expect(ev('WIRE OUT')).toBe('CASH_OUT');
  });

  test('REDEMPTION is internal — six figures of it on one real account', () => {
    expect(ev('REDEMPTION')).toBe('RETURN_OF_CAPITAL');
    expect(touches('RETURN_OF_CAPITAL', 'contributions')).toBe(false);
  });

  test('the option and in-kind words', () => {
    expect(ev('OPTIONEXPIRATION')).toBe('OPTION_EXPIRY');
    expect(ev('OPTIONEXERCISE')).toBe('OPTION_EXERCISE');
    expect(ev('EXCHANGE RECEIVED IN')).toBe('SECURITIES_IN');
    expect(ev('SERVICE FEE')).toBe('FEE');
  });
});

describe('THE RULE THAT ENDS THE BUG — an unknown word counts in nothing', () => {
  test('anything unrecognised is UNKNOWN, whatever the amount says', () => {
    for (const w of ['SOMETHING NEW', 'PROMOTIONAL CREDIT', 'MISC']) {
      expect(ev(w)).toBe('UNKNOWN');
    }
  });

  test('UNKNOWN touches NO total at all — that is the whole point', () => {
    for (const t of ['contributions', 'withdrawals', 'income', 'costs', 'units'] as const) {
      expect(touches('UNKNOWN', t)).toBe(false);
    }
  });

  test('and the institution\'s own word is kept, so it can be shown and chased', () => {
    const c = classifyEvent('PROMOTIONAL CREDIT');
    expect(c.word).toBe('PROMOTIONAL CREDIT');
    expect(c.recognised).toBe(false);
  });

  test('a recognised word records WHICH source taught us it', () => {
    expect(classifyEvent('Sweep out').matchedBy).toMatch(/Vanguard/);
  });
});

describe('ORDER MATTERS — the specific must beat the general', () => {
  test('"Dividend Reinvestment" is a purchase, NOT a dividend', () => {
    expect(ev('Dividend Reinvestment')).toBe('REINVEST_PURCHASE');
    expect(ev('CAPITAL GAIN REINVESTMENT')).toBe('REINVEST_PURCHASE');
  });
  test('"margin interest" is a cost, not income', () => {
    expect(ev('MARGIN INTEREST')).toBe('MARGIN_INTEREST');
    expect(touches('MARGIN_INTEREST', 'income')).toBe(false);
    expect(touches('MARGIN_INTEREST', 'costs')).toBe(true);
  });
  test('a fee reversal is still a fee line, not income', () => {
    expect(ev('REORG FEE')).toBe('FEE');
  });
});

describe('EVERY event declares what it may touch — no total can be reached another way', () => {
  test('exactly four events move contributions or withdrawals, and they are all EXTERNAL', () => {
    const external = Object.values(EVENTS).filter(
      (r) => r.totals.includes('contributions') || r.totals.includes('withdrawals'));
    expect(external.map((r) => r.event).sort())
      .toEqual(['CASH_IN', 'CASH_OUT', 'SECURITIES_IN', 'SECURITIES_OUT']);
    for (const r of external) expect(r.externality).toBe('EXTERNAL');
  });
});

// ── Track 1 step 3: audit item 32 — direction comes from the words, never one-size-fits-IN ──
describe('in-kind transfers carry their own direction', () => {
  const ev = (w: string) => classifyEvent(w).event;
  test('outbound in-kind is SECURITIES_OUT — booked IN, a transfer away read as a contribution', () => {
    expect(ev('EXCHANGE DELIVERED OUT')).toBe('SECURITIES_OUT');
    expect(ev('EXTERNAL_ASSET_TRANSFER_OUT')).toBe('SECURITIES_OUT');
  });
  test('inbound stays SECURITIES_IN', () => {
    expect(ev('EXCHANGE RECEIVED IN')).toBe('SECURITIES_IN');
    expect(ev('EXTERNAL_ASSET_TRANSFER_IN')).toBe('SECURITIES_IN');
  });
  test('an in-kind row with NO direction word is UNKNOWN — recorded, counted in nothing (rule R2)', () => {
    expect(ev('In-kind transfer')).toBe('UNKNOWN');
  });
});

// ── audit item 31: the sheet's committed basis rules are now representable ──
describe('cost basis and realised gain joined the totals axis', () => {
  test('a reinvested distribution RAISES basis (Metrics K14) — taxed once, never taxed again as gain', () => {
    expect(touches('REINVEST_PURCHASE', 'costBasis')).toBe(true);
    expect(touches('REINVEST_PURCHASE', 'income')).toBe(false);
  });
  test('a buy creates basis; a sell realises gain; income events touch neither', () => {
    expect(touches('BUY', 'costBasis')).toBe(true);
    expect(touches('SELL', 'realisedGain')).toBe(true);
    expect(touches('DIVIDEND', 'costBasis')).toBe(false);
    expect(touches('INTEREST', 'realisedGain')).toBe(false);
  });
});
