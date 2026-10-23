/** A TEXT THAT PRINTS FIGURES, SAID THROUGH THE ONE SPOKEN WRITER (2026-10-22, W-A11Y).
 *
 *  A line such as "4.00%/year", or a balance hidden as "••••", is read aloud letter by letter unless the Text says otherwise.
 *  This is a Text that says otherwise: its spoken form is its own printed words through saidSentence (figure.ts, beside
 *  figSaid) — the canon's spoken period after a rate, and "hidden". Where the two are the same it adds nothing, so a screen reader
 *  and every test that reads labels see exactly what they saw before. A label given by the screen wins. */
import React from 'react';
import { Text, type TextProps } from 'react-native';
import { saidSentence } from './figure';

/** The words a Text prints: its strings and numbers, and those of the Texts nested in it, in order. */
export function printedWords(children: React.ReactNode): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(printedWords).join('');
  if (React.isValidElement(children)) return printedWords((children.props as any)?.children);
  return '';
}

export function SaidText(props: TextProps) {
  const printed = printedWords(props.children);
  const said = saidSentence(printed);
  return <Text {...props} accessibilityLabel={props.accessibilityLabel ?? (said !== printed ? said : undefined)} />;
}
