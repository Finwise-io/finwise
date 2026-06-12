import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { InputModal } from '../InputModal';

const setup = (over: Record<string, any> = {}) => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <InputModal
      visible
      title="Monthly amount"
      message="How much each month?"
      placeholder="e.g. 250"
      keyboardType="decimal-pad"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...over}
    />,
  );
  return { onConfirm, onCancel };
};

describe('InputModal', () => {
  test('shows title, message, and placeholder when visible', () => {
    setup();
    expect(screen.getByText('Monthly amount')).toBeOnTheScreen();
    expect(screen.getByText('How much each month?')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('e.g. 250')).toBeOnTheScreen();
  });

  test('hidden when visible=false', () => {
    setup({ visible: false });
    expect(screen.queryByText('Monthly amount')).toBeNull();
  });

  test('typed value reaches onConfirm; the field clears for next open', () => {
    const { onConfirm } = setup();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 250'), '375.50');
    fireEvent.press(screen.getByText('OK'));
    expect(onConfirm).toHaveBeenCalledWith('375.50');
    expect(screen.getByPlaceholderText('e.g. 250').props.value).toBe('');
  });

  test('submit-from-keyboard confirms too', () => {
    const { onConfirm } = setup();
    const input = screen.getByPlaceholderText('e.g. 250');
    fireEvent.changeText(input, '42');
    fireEvent(input, 'submitEditing');
    expect(onConfirm).toHaveBeenCalledWith('42');
  });

  test('cancel discards the draft value', () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 250'), '999');
    fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('e.g. 250').props.value).toBe('');
  });

  test('custom confirm label renders', () => {
    setup({ confirmLabel: 'Save' });
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });
});
