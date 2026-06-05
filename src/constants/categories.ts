// Canonical budget categories — same set used in onboarding's spending plan, each tagged
// with the budget bucket it rolls into. Used by add-expense + budget-vs-actual so logged
// expenses match the categories you set up (incl. Insurance).
export type BudgetBucket = 'fixed' | 'nonmonthly' | 'flexible';
export const BUDGET_CATEGORIES: { id: string; label: string; bucket: BudgetBucket; icon: string }[] = [
  { id: 'rent', label: 'Rent / Mortgage', bucket: 'fixed', icon: '🏠' },
  { id: 'utilities', label: 'Utilities', bucket: 'fixed', icon: '⚡' },
  { id: 'phone', label: 'Phone / Internet', bucket: 'fixed', icon: '📶' },
  { id: 'insurance', label: 'Insurance', bucket: 'fixed', icon: '🛡️' },
  { id: 'subs', label: 'Subscriptions', bucket: 'fixed', icon: '📺' },
  { id: 'debt', label: 'Debt payment', bucket: 'fixed', icon: '💳' },
  { id: 'repairs', label: 'Repairs / maintenance', bucket: 'nonmonthly', icon: '🔧' },
  { id: 'travel', label: 'Travel / holidays', bucket: 'nonmonthly', icon: '✈️' },
  { id: 'gifts', label: 'Gifts', bucket: 'nonmonthly', icon: '🎁' },
  { id: 'groceries', label: 'Groceries', bucket: 'flexible', icon: '🛒' },
  { id: 'gas', label: 'Gas / Transport', bucket: 'flexible', icon: '⛽' },
  { id: 'dining', label: 'Dining out', bucket: 'flexible', icon: '🍔' },
  { id: 'shopping', label: 'Shopping', bucket: 'flexible', icon: '🛍️' },
  { id: 'fun', label: 'Entertainment', bucket: 'flexible', icon: '🎉' },
];

type CatLike = { label: string; bucket?: BudgetBucket; icon?: string };
/** Bucket for a logged expense category — canonical list first, then the user's custom cats, else flexible. */
export function categoryBucketFor(label: string, custom: CatLike[] = []): BudgetBucket {
  const c = BUDGET_CATEGORIES.find((x) => x.label === label) || custom.find((x) => x.label === label);
  return (c?.bucket as BudgetBucket) ?? 'flexible';
}
/** Icon for a budget/expense category, falling back to the legacy expense set, then 📦. */
export function budgetCategoryIcon(label: string, custom: CatLike[] = []): string {
  return BUDGET_CATEGORIES.find((x) => x.label === label)?.icon
    || custom.find((x) => x.label === label)?.icon
    || EXPENSE_CATEGORIES.find((c) => c.label === label)?.icon
    || '📦';
}

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
