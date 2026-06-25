// React-level money formatter that respects the global Hide-balances toggle. money()/moneyCompact() are
// PURE domain functions (they must not read React state), so masking lives here at the component layer.
// Use this for user-facing BALANCE figures you want hidden in public; leave pure money() for non-sensitive
// labels (axes, deltas in tests, etc.).
import { useStore } from '../store/useStore';
import { money } from '../domain/_shared/num';
import { moneyCompact } from '../domain/_shared/money';

export const BALANCE_MASK = '••••';

export function useMoney() {
  const hidden = useStore((s) => s.hideBalances);
  return {
    hidden,
    m: (n: number) => (hidden ? BALANCE_MASK : money(n)),
    compact: (n: number, style: 'M' | 'MM' = 'MM') => (hidden ? BALANCE_MASK : moneyCompact(n, style)),
  };
}
