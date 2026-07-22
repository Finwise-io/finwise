import { Redirect } from "expo-router";
// B45 FIX (founder fresh-install test): the entry NEVER picks a flow itself — it lands on the
// auth gate and the route guard does the rest: unauthenticated stays to sign in / create the
// account; a new authenticated user goes to /first-run (the approved B46 light flow); a returning
// completed user bounces straight Home. The old redirect to /onboarding predated the June auth
// rework and silently resurrected the deep questionnaire as everyone's first screen.
export default function Index() {
  return <Redirect href="/auth" />;
}
