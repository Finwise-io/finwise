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

// Emoji options for custom categories
export const CATEGORY_EMOJI_OPTIONS = [
  '🐾','🎵','✈️','🏋️','📚','🎮','☕','🧹','🌿','🎁','💈','🏥',
  '👶','🐶','🐱','🚲','🎨','🍷','🏖','🔧','💻','📷','🎤','🧴',
];

export const CATEGORY_BG_OPTIONS = [
  '#E1F5EE','#FFF3E0','#FFF8E1','#E3F2FD','#FCE4EC','#F3E5F5',
  '#E8F5E9','#FFFDE7','#E0F7FA','#EDE7F6','#FBE9E7','#F5F5F5',
  '#FFF9C4','#F1F8E9','#E8EAF6','#FBE9E7',
];

export function getCategoryIcon(cat: string): string {
  return EXPENSE_CATEGORIES.find(c => c.label === cat)?.icon || '📦';
}

export function getCategoryBg(cat: string): string {
  return EXPENSE_CATEGORIES.find(c => c.label === cat)?.bg || '#F5F5F5';
}

export function useAllCategories(customCategories: { label: string; icon: string; bg: string }[]) {
  const custom = customCategories.filter(
    c => !EXPENSE_CATEGORIES.find(e => e.label === c.label)
  );
  return [...EXPENSE_CATEGORIES, ...custom];
}
