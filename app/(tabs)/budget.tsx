// v1.3 (founder-approved 2026-07-19): the separate Budget screen RETIRED — its jobs live in the
// consolidated Cash flow surface (Activity → Spending tab, Budget → the plan card, Debts → Debts
// tab). Deep links and habits land safely on the surface.
import { Redirect } from 'expo-router';
export default function BudgetRedirect() {
  return <Redirect href="/(tabs)/cashflow" />;
}
