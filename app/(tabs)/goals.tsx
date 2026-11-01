// GOALS LIVES ON THE PLAN TAB, UNDER ITS BAR (2026-10-31, FX-PLAN; goals v03, built under his DEC-9228). His words (DEC-8889):
// "The screen has no name … When I click on "Add goal" same - other tabs missing … Add goal is showing some times from prepare tab."
// So this route, which the Menu's Goals and every 'Add a goal ›' door open, lands on Plan with Goals selected — the bar at the top,
// the Plan tab lit — never on the old full Goals screen, which carried the debt sections and Prepare's rows.
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GoalsRoute() {
  const { add } = (useLocalSearchParams?.() ?? {}) as { add?: string };
  return <Redirect href={(add === '1' ? '/(tabs)/plan?sub=goals&add=1' : '/(tabs)/plan?sub=goals') as any} />;
}
