import React from 'react';
import { render } from '@testing-library/react-native';
import { Disclaimer } from '../Disclaimer';

test('renders the default not-advice disclaimer', () => {
  const { getByText } = render(<Disclaimer />);
  expect(getByText(/not financial, investment, or tax advice/)).toBeTruthy();
  expect(getByText(/aren't guaranteed/)).toBeTruthy();
});

test('renders custom text when provided', () => {
  const { getByText } = render(<Disclaimer text="A planning estimate." />);
  expect(getByText('A planning estimate.')).toBeTruthy();
});
