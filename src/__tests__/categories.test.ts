import {
  EXPENSE_CATEGORIES,
  getCategoryIcon,
  getCategoryBg,
  useAllCategories,
} from '../constants/categories';

describe('getCategoryIcon', () => {
  it('returns the correct icon for a known category', () => {
    expect(getCategoryIcon('Groceries')).toBe('🛒');
    expect(getCategoryIcon('Dining')).toBe('🍔');
    expect(getCategoryIcon('Rent')).toBe('🏠');
  });

  it('returns the fallback icon for an unknown category', () => {
    expect(getCategoryIcon('Unicorn')).toBe('📦');
    expect(getCategoryIcon('')).toBe('📦');
  });
});

describe('getCategoryBg', () => {
  it('returns the correct background for a known category', () => {
    expect(getCategoryBg('Groceries')).toBe('#E1F5EE');
    expect(getCategoryBg('Health')).toBe('#FCE4EC');
  });

  it('returns the fallback background for an unknown category', () => {
    expect(getCategoryBg('Unicorn')).toBe('#F5F5F5');
  });
});

describe('useAllCategories', () => {
  it('returns base categories when no custom categories provided', () => {
    const result = useAllCategories([]);
    expect(result).toEqual(EXPENSE_CATEGORIES);
    expect(result).toHaveLength(EXPENSE_CATEGORIES.length);
  });

  it('appends custom categories after base categories', () => {
    const custom = [{ label: 'Pets', icon: '🐾', bg: '#E1F5EE' }];
    const result = useAllCategories(custom);
    expect(result).toHaveLength(EXPENSE_CATEGORIES.length + 1);
    expect(result[result.length - 1]).toEqual(custom[0]);
  });

  it('filters out custom categories that duplicate a base category label', () => {
    const custom = [
      { label: 'Groceries', icon: '🛒', bg: '#000' }, // duplicate
      { label: 'Pets', icon: '🐾', bg: '#E1F5EE' },   // new
    ];
    const result = useAllCategories(custom);
    expect(result).toHaveLength(EXPENSE_CATEGORIES.length + 1);
    const groceriesEntries = result.filter(c => c.label === 'Groceries');
    expect(groceriesEntries).toHaveLength(1);
    expect(groceriesEntries[0].bg).toBe('#E1F5EE'); // base version kept
  });

  it('handles multiple custom categories', () => {
    const custom = [
      { label: 'Pets', icon: '🐾', bg: '#E1F5EE' },
      { label: 'Travel', icon: '✈️', bg: '#E3F2FD' },
    ];
    const result = useAllCategories(custom);
    expect(result).toHaveLength(EXPENSE_CATEGORIES.length + 2);
  });
});
