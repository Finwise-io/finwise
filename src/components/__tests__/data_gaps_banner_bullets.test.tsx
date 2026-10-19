/** THE AMBER BOX'S BULLETS HANG — DEC-6078, 2026-10-19, his words: "bullet in amber box text on the left should be
 *  aligned." Each line is a row: the dot in its own narrow column, the words in a column that fills the rest, so a line
 *  that wraps starts again at the words' left edge, never under the dot. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DataGapsBanner } from '../DataGapsBanner';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const gap = (title: string) => ({ title, meanwhile: 'meanwhile', fixLabel: 'Fix', route: '/x', action: 'route' }) as any;

test('every line is a row: the dot alone, then the words in a column that fills the rest', () => {
  render(<DataGapsBanner gaps={[gap('Fidelity hasn’t shared dividend records for this account, so its dividends sit inside the change in investment value'), gap('B'), gap('C'), gap('D')]} />);
  const rows = screen.getAllByTestId('gap-line');
  expect(rows).toHaveLength(4);                       // three gaps and "and 1 more"
  for (const row of rows) {
    const style = Object.assign({}, ...[row.props.style].flat());
    expect(style.flexDirection).toBe('row');
    const [dot, words] = row.children as any[];
    expect(dot.props.children).toBe('·');
    expect(Object.assign({}, ...[words.props.style].flat(5).filter(Boolean)).flex).toBe(1);
  }
  expect(screen.getByText('and 1 more')).toBeOnTheScreen();
});
