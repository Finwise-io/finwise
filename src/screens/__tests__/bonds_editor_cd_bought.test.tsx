// DEC-3837 (2026-10-10): the Bonds screen's own add/edit form asks a CD "Bought from the bank, or through a
// broker?" — the same question as Add an account — and saves the answer with the other fields.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BondEditor } from '../BondsScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}) }));

const fill = (name: string) => {
  const onSave = jest.fn();
  render(<BondEditor bond={null} open onClose={() => {}} onSave={onSave} />);
  fireEvent.changeText(screen.getByPlaceholderText('e.g. US Treasury 2030, Apple Corp 4.5%'), name);
  fireEvent.changeText(screen.getByPlaceholderText('10000'), '10000');
  fireEvent.changeText(screen.getByPlaceholderText('4.5'), '4.2');
  fireEvent.press(screen.getByLabelText('Pick a maturity date'));
  return onSave;
};

test('a CD named "Schwab CD" asks, and saves "through a broker"', () => {
  const onSave = fill('Schwab CD');
  expect(screen.getByText('Bought from the bank, or through a broker?')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('CD bought through a broker'));
  fireEvent.press(screen.getByText('Add bond'));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ label: 'Schwab CD', cd_bought: 'broker' }));
});

test('a bond that is not a CD is never asked, and saves no answer', () => {
  const onSave = fill('US Treasury 2030');
  expect(screen.queryByText('Bought from the bank, or through a broker?')).toBeNull();
  fireEvent.press(screen.getByText('Add bond'));
  expect(onSave.mock.calls[0][0].cd_bought).toBeUndefined();
});

test('editing a CD shows the saved answer and keeps it', () => {
  const onSave = jest.fn();
  const bond: any = { asset_id: 'c1', label: 'Schwab CD', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 9850,
    target_return: 0.042, face_value: 10000, coupon_rate: 0.042, maturity_date: '2028-10-10', cd_bought: 'broker' };
  render(<BondEditor bond={bond} open onClose={() => {}} onSave={onSave} />);
  expect(screen.getByLabelText('CD bought through a broker').props.accessibilityState).toEqual({ selected: true });
  fireEvent.press(screen.getByText('Save'));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ cd_bought: 'broker' }));
});
