/**
 * #11: the maturity-date spinner only fired onChange when you SPUN it, so tapping the date row and
 * saving the DEFAULT date saved nothing (and blocked Save). Opening the picker must commit the default.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BondEditor } from '../BondsScreen';

test('opening the date picker commits the default maturity, so Save works without spinning', () => {
  const onSave = jest.fn();
  const { getByText, getByPlaceholderText } = render(
    <BondEditor bond={null} open onClose={() => {}} onSave={onSave} />,
  );
  fireEvent.changeText(getByPlaceholderText(/US Treasury 2030/), 'US Treasury 2035');
  fireEvent.changeText(getByPlaceholderText('10000'), '10000');
  fireEvent.changeText(getByPlaceholderText('4.5'), '4');

  fireEvent.press(getByText('Tap to pick a date'));   // open the picker — no spin
  fireEvent.press(getByText('Add bond'));

  expect(onSave).toHaveBeenCalledTimes(1);
  const saved = onSave.mock.calls[0][0];
  expect(saved.maturity_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);   // a real date was committed
  expect(Number(saved.maturity_date.slice(0, 4))).toBe(new Date().getFullYear() + 10);
});
