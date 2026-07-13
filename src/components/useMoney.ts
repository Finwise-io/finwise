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

/** Mask-aware money for components that already subscribe to the store (the whole-store useStore()
 *  pattern every FCC screen uses — a hideBalances flip re-renders them, so reading getState() here
 *  is reactive in practice). The fcc_agreement mask walk enforces zero '$' under hide. */
export const maskedMoney = (n: number) => (useStore.getState().hideBalances ? BALANCE_MASK : money(n));

/** Mask the dollar figures INSIDE a template sentence (insight bodies, engine copy) while keeping
 *  the words — '8 times your usual' stays readable, the balances become ••••. */
export const maskDollars = (text: string, hidden?: boolean) =>
  (hidden ?? useStore.getState().hideBalances) ? text.replace(/\$\s?[\d,]+(\.\d+)?/g, BALANCE_MASK) : text;
