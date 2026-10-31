/** CANON ROW 18 — THE LINK'S WORDS ARE Linked · Link again · Unlink (workplan #106, 2026-10-27).
 *
 *  Settings said "Disconnect" beside "Linked accounts": two words for one link. His words of 2026-09-14 ruled the family
 *  ("connected / reconnected - change to linked / link again"); no word for removing a link had been ruled, so the lead
 *  decided Unlink, from that family, and retired Disconnect. The canon guard cannot hold the retired word, because the
 *  ways-to-add v10 drawing still draws it on its consent phones and phones are not redrawn (its READ THIS FIRST row of
 *  2026-10-27 says so); this test holds it over every file a person could meet instead, and proves how much it read.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { CONSENT_COPY } from '../../services/sync';
import * as ts from 'typescript';
import SettingsScreen from '../SettingsScreen';

const ROOT = path.join(__dirname, '..', '..', '..');
const RETIRED = /\b[Dd]isconnect(?:s|ed|ing)?\b/;

/** What a person could read in a file: string bodies, template text, JSX text and every comment — the canon guard's reading,
 *  kept here rather than imported, because importing a test file runs its tests a second time. Identifiers are code. */
function copySegments(file: string, text: string): { text: string; line: number }[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: { text: string; line: number }[] = [];
  const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const seen = new Set<number>();
  const comment = (r: ts.CommentRange) => { if (!seen.has(r.pos)) { seen.add(r.pos); out.push({ text: text.slice(r.pos, r.end).replace(/'[a-z_][a-z0-9_]*'/g, "''"), line: lineOf(r.pos) }); } };
  const visit = (n: ts.Node) => {
    ts.getLeadingCommentRanges(text, n.getFullStart())?.forEach(comment);
    ts.getTrailingCommentRanges(text, n.getEnd())?.forEach(comment);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (/\s/.test(n.text.trim()) || /^[A-Z][a-z]/.test(n.text.trim())) out.push({ text: n.text, line: lineOf(n.getStart(sf)) });
    } else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || (ts.isJsxText(n) && n.text.trim())) {
      out.push({ text: n.text, line: lineOf(n.getStart(sf)) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  for (const m of text.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g)) if (m.index != null && !seen.has(m.index + 1)) out.push({ text: m[0], line: lineOf(m.index) });
  return out;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' || d.name === 'node_modules' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\./.test(d.name) && !/\.d\.ts$/.test(d.name) ? [p] : [];
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  useStore.setState({ user: { uid: 'u1', email: 'a@b.com', name: 'A' }, snaptradeConnections: [{ id: 'c1', brokerage: 'Vanguard', disabled: false }] } as any);
});

test('Settings: the button beside a linked account reads Unlink, and so does the question it asks', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render(<SettingsScreen />);
  expect(screen.getByText('Linked accounts')).toBeOnTheScreen();
  expect(screen.getByText('Unlink')).toBeOnTheScreen();
  expect(screen.queryByText('Disconnect')).toBeNull();
  fireEvent.press(screen.getByLabelText('Unlink Vanguard'));
  expect(alert).toHaveBeenCalledTimes(1);
  const [title, body, buttons] = alert.mock.calls[0] as [string, string, { text: string }[]];
  expect(title).toBe('Unlink Vanguard?');
  expect(body).toBe('You choose: keep your numbers as a by-hand account (frozen at today’s numbers), or delete the connection’s data. Either way the link itself is removed from the connection service.');
  // the two answers behind the consent card's promise do not change (walk row 16)
  expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Keep as manual', 'Remove accounts']);
});

test('the consent card names the same button: "Unlink any time in Settings"', () => {
  const line = CONSENT_COPY.find((l) => /Settings/.test(l));
  expect(line).toBe('Unlink any time in Settings — you choose: keep your numbers as a by-hand account, or delete the connection’s data.');
});

test('the retired word appears nowhere a person could meet it, in src and MoneyKeel/functions — and the guard proves it looked', () => {
  const offences: string[] = [];
  let files = 0, segments = 0;
  for (const root of ['src', 'MoneyKeel/functions']) {
    for (const file of walk(path.join(ROOT, root))) {
      files += 1;
      for (const seg of copySegments(file, fs.readFileSync(file, 'utf8'))) {
        segments += 1;
        if (RETIRED.test(seg.text)) offences.push(`${path.relative(ROOT, file)}:${seg.line} — "${seg.text.trim().slice(0, 80)}" → Unlink (canon row 18)`);
      }
    }
  }
  // counted 2026-10-27 from the disk, not typed from memory: 225 files, 23,973 readable pieces. Floors, so a walk that stops
  // finding files goes red rather than quiet.
  expect(files).toBeGreaterThanOrEqual(220);
  expect(segments).toBeGreaterThanOrEqual(23_000);
  expect(offences).toEqual([]);
}, 120_000);
