// React-level money formatter that respects the global Hide-balances toggle. money()/moneyCompact() are
// PURE domain functions (they must not read React state), so masking lives here at the component layer.
// Use this for user-facing BALANCE figures you want hidden in public; leave pure money() for non-sensitive
// labels (axes, deltas in tests, etc.).
import { useStore } from '../store/useStore';
import { money2, money } from '../domain/_shared/num';
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
// cents-precise sibling (B44 founder finding: holding-detail showed integers where cents matter)
export const maskedMoney2 = (n: number) => (useStore.getState().hideBalances ? BALANCE_MASK : money2(n));
/** Sub-$2 prices (a thin-priced holding's $1.132 average cost) keep 3 decimals — masked like all money. */
export const maskedPrice3 = (n: number) =>
  useStore.getState().hideBalances ? BALANCE_MASK : n > 0 && n < 2 ? `$${(Math.round(n * 1000) / 1000).toFixed(3)}` : money2(n);   // money-mask-ok: this IS a masked formatter (hidden-gated first)

/** Mask the dollar figures INSIDE a template sentence (insight bodies, engine copy) while keeping
 *  the words — '8 times your usual' stays readable, the balances become ••••. */
export const maskDollars = (text: string, hidden?: boolean) =>
  (hidden ?? useStore.getState().hideBalances) ? text.replace(/\$\s?[\d,]+(\.\d+)?/g, BALANCE_MASK) : text;

/** SPOKEN (accessibility) forms — walk row 15 (audit Home·NW #8): a screen reader must say the word
 *  "hidden", never read the dot characters. accessibilityLabel templates use THESE, not the visual
 *  maskers above (a guard test enforces it). Visual output is unchanged. */
export const spokenMoney = (n: number) => (useStore.getState().hideBalances ? 'hidden' : money(n));
export const spokenMoney2 = (n: number) => (useStore.getState().hideBalances ? 'hidden' : money2(n));
export const spokenDollars = (text: string) =>
  useStore.getState().hideBalances ? text.replace(/\$\s?[\d,]+(\.\d+)?/g, 'hidden') : text;
