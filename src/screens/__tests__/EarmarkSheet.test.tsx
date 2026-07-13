/**
 * #20: the "What counts toward retirement?" sheet hid its % field + Done button behind the keyboard.
 * The sheet is now wrapped in a KeyboardAvoidingView. Keyboard physics aren't testable in jest, so this
 * guards the restructure: the sheet still renders its % input and the Done action.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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

// P0 orphan-field fix: once retirement_pct was hand-set, the automatic default (earmarkDefault)
// became unreachable forever. The per-row 'auto' link clears it back to null.
describe('earmark auto-reset (P0 orphan field)', () => {
  const { earmarkDefault } = require('../../domain/assets');
  it('shows the auto link only for hand-set rows and clears back to null', () => {
    const assets = [
      { asset_id: 'a1', label: 'Brokerage', tax_bucket: 'TAXABLE', balance: 1000, retirement_pct: 40 },
      { asset_id: 'a2', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 5000 },   // auto (null)
    ] as any[];
    const onSet = jest.fn();
    render(<EarmarkSheet open assets={assets} nestEgg={0} onClose={() => {}} onSet={onSet} onDone={() => {}} />);
    const links = screen.getAllByText('auto');
    expect(links).toHaveLength(1);              // only the hand-set row offers the reset
    fireEvent.press(links[0]);
    expect(onSet).toHaveBeenCalledWith('a1', null);   // null → earmarkDefault applies again
    expect(earmarkDefault(assets[1])).toBeGreaterThan(0);  // and the default is a real share
  });
});
