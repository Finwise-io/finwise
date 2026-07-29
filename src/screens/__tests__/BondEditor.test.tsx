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

// Build-46 walk row 4 (audit Home·NW #20): a partial bond sale writes a SELL row to the ledger —
// the account's Activity carries the trail, and the ledger (not a silent patch) lowers the value.
test('recording a partial sale writes a SELL ledger row that lowers the bond value', () => {
  const { Alert } = require('react-native');
  jest.spyOn(Alert, 'alert').mockImplementation((_t: any, _m: any, btns: any) => {
    const go = (btns ?? []).find((b: any) => b.text === 'Record sale');
    go?.onPress?.();
  });
  const { useStore } = require('../../store/useStore');
  useStore.getState().resetAll();
  useStore.setState({
    assetAccounts: [{ asset_id: 'cd1', label: 'Chase CD', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      balance: 10000, face_value: 10000, coupon_rate: 0.04, maturity_date: '2030-01-01' }],
  } as any);
  const bond = useStore.getState().assetAccounts[0];
  const onSave = jest.fn((fields: any) => useStore.getState().updateAsset('cd1', fields));

  const { getByLabelText, getByPlaceholderText } = render(
    <BondEditor bond={bond} open onClose={() => {}} onSave={onSave} />,
  );
  fireEvent.changeText(getByPlaceholderText(/amount sold/), '4000');
  fireEvent.press(getByLabelText('Record sale'));

  const s = useStore.getState() as any;
  const sell = (s.transactions ?? []).find((t: any) => t.type === 'SELL' && t.account_id === 'cd1');
  expect(sell).toBeTruthy();                       // the Activity row exists
  expect(sell.amount).toBe(4000);
  const cd = s.assetAccounts.find((a: any) => a.asset_id === 'cd1');
  expect(cd.balance).toBe(6000);                   // value lowered BY THE LEDGER
  expect(cd.face_value).toBe(6000);                // face scaled proportionally by the editor save
  expect(onSave.mock.calls[0][0].balance).toBeUndefined();   // the editor no longer patches balance
  (Alert.alert as jest.Mock).mockRestore();
});
