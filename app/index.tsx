import { Redirect } from "expo-router";
// New users start in onboarding (Q1/Q2 are unauthenticated; account is created mid-flow).
// The _layout auth guard redirects already-signed-in / completed users onward.
export default function Index() {
  return <Redirect href="/onboarding" />;
}
