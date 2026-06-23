/**
 * #20: the "What counts toward retirement?" sheet hid its % field + Done button behind the keyboard.
 * The sheet is now wrapped in a KeyboardAvoidingView. Keyboard physics aren't testable in jest, so this
 * guards the restructure: the sheet still renders its % input and the Done action.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { EarmarkSheet } from '../RetirementCockpit';
import type { AssetAccount } from '../../domain/assets';

test('EarmarkSheet renders the editable % field and the Done button', () => {
  const assets: AssetAccount[] = [
    { asset_id: 'a1', label: 'My 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', balance: 200000, target_return: 0.07 },
  ];
  const { getByText, UNSAFE_getAllByType } = render(
    <EarmarkSheet open assets={assets} nestEgg={200000} onClose={() => {}} onSet={() => {}} onDone={() => {}} />,
  );
  expect(getByText('What counts toward retirement?')).toBeTruthy();
  expect(getByText(/Counts toward retirement:/)).toBeTruthy();   // the Done button
  const { TextInput } = require('react-native');
  expect(UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);   // the % input is present
});
