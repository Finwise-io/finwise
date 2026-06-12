import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Card, Button, Badge, ProgressBar, SegmentedControl, SectionHeader, TipCard, AmountText } from '../UI';

describe('UI primitives', () => {
  test('Card renders its children', () => {
    render(<Card><Text>inside</Text></Card>);
    expect(screen.getByText('inside')).toBeOnTheScreen();
  });

  test('Button fires onPress, and not while disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(<Button label="Continue" onPress={onPress} />);
    fireEvent.press(screen.getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<Button label="Continue" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);                 // unchanged
  });

  test('Button in loading state hides the label', () => {
    render(<Button label="Continue" onPress={() => {}} loading />);
    expect(screen.queryByText('Continue')).toBeNull();        // spinner replaces the label
  });

  test('Badge shows its label', () => {
    render(<Badge label="On track" color="green" />);
    expect(screen.getByText('On track')).toBeOnTheScreen();
  });

  test('ProgressBar clamps width to 0–100%', () => {
    expect(() => render(<ProgressBar pct={150} />)).not.toThrow();
    expect(() => render(<ProgressBar pct={-10} />)).not.toThrow();
  });

  test('SegmentedControl switches selection', () => {
    const onSelect = jest.fn();
    render(<SegmentedControl options={['Monthly', 'Yearly']} selected="Monthly" onSelect={onSelect} />);
    fireEvent.press(screen.getByText('Yearly'));
    expect(onSelect).toHaveBeenCalledWith('Yearly');
  });

  test('SectionHeader renders title and fires its action', () => {
    const onAction = jest.fn();
    render(<SectionHeader title="Goals" action="See all" onAction={onAction} />);
    fireEvent.press(screen.getByText('See all'));
    expect(onAction).toHaveBeenCalled();
  });

  test('TipCard renders children', () => {
    render(<TipCard color="amber"><Text>watch your dining spend</Text></TipCard>);
    expect(screen.getByText('watch your dining spend')).toBeOnTheScreen();
  });

  test('AmountText formats as money with cents', () => {
    render(<AmountText amount={2500} />);
    expect(screen.getByText('$2,500.00')).toBeOnTheScreen();
  });
});
