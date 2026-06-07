import { availableToSaveSummary, sinkingFund } from './index';

describe('goals planning', () => {
  test('available-to-save summary: avg/min/max + lumpy flag', () => {
    const flat = availableToSaveSummary([{ label: 'Jan', amount: 1000 }, { label: 'Feb', amount: 1000 }, { label: 'Mar', amount: 1050 }]);
    expect(flat.avg).toBeCloseTo(1017, 0);
    expect(flat.lumpy).toBe(false);
    const lumpy = availableToSaveSummary([{ label: 'Jan', amount: 500 }, { label: 'Dec', amount: 8000 }]);
    expect(lumpy.min).toBe(500);
    expect(lumpy.max).toBe(8000);
    expect(lumpy.lumpy).toBe(true);
    expect(availableToSaveSummary([]).avg).toBe(0);
  });
  test('sinking fund: 1/12 monthly set-aside', () => {
    expect(sinkingFund(500)).toEqual({ annual: 6000, monthly: 500 });
    expect(sinkingFund(0)).toEqual({ annual: 0, monthly: 0 });
  });
});
