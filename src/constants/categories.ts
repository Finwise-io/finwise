export const EXPENSE_CATEGORIES = [
  { label: 'Groceries',     icon: '🛒', bg: '#E1F5EE' },
  { label: 'Dining',        icon: '🍔', bg: '#FFF3E0' },
  { label: 'Gas',           icon: '⛽', bg: '#FFF8E1' },
  { label: 'Transit',       icon: '🚌', bg: '#E3F2FD' },
  { label: 'Health',        icon: '💊', bg: '#FCE4EC' },
  { label: 'Fun',           icon: '🎬', bg: '#F3E5F5' },
  { label: 'Clothes',       icon: '👕', bg: '#E8F5E9' },
  { label: 'Utilities',     icon: '💡', bg: '#FFFDE7' },
  { label: 'Rent',          icon: '🏠', bg: '#E0F7FA' },
  { label: 'Subscriptions', icon: '📱', bg: '#EDE7F6' },
  { label: 'Shopping',      icon: '🛍', bg: '#FBE9E7' },
  { label: 'Other',         icon: '📦', bg: '#F5F5F5' },
];

export function getCategoryIcon(cat: string): string {
  return EXPENSE_CATEGORIES.find(c => c.label === cat)?.icon || '📦';
}

export function getCategoryBg(cat: string): string {
  return EXPENSE_CATEGORIES.find(c => c.label === cat)?.bg || '#F5F5F5';
}
