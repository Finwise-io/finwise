import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Card, Button, Badge, ProgressBar, SegmentedControl, SectionHeader, TipCard, AmountText, InfoDot } from '../UI';
import { useStore } from '../../store/useStore';

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

  test('AmountText formats via the canonical formatter (whole dollars, grouped)', () => {
    useStore.setState({ hideBalances: false });
    render(<AmountText amount={2500} />);
    expect(screen.getByText('$2,500')).toBeOnTheScreen();      // formatMoney = whole-dollar, not $2,500.00
  });

  test('AmountText masks to •••• when Hide-balances is on, restores when off', () => {
    useStore.setState({ hideBalances: true });
    const { rerender } = render(<AmountText amount={2500} />);
    expect(screen.getByText('••••')).toBeOnTheScreen();
    expect(screen.queryByText('$2,500')).toBeNull();
    useStore.setState({ hideBalances: false });
    rerender(<AmountText amount={2500} />);
    expect(screen.getByText('$2,500')).toBeOnTheScreen();
  });

  test('InfoDot opens its glossary definition on press', () => {
    render(<InfoDot term="nestEgg" />);
    fireEvent.press(screen.getByLabelText(/What is Retirement nest egg/));
    expect(screen.getByText(/invested money your retirement draws on/i)).toBeOnTheScreen();
  });
});

// THE INFO DOT MATCHES THE LINE IT SITS ON (founder 2026-08-14: "info dot should be the same size
// as text"). It was a flat 13pt everywhere — looming over an 11pt band title, lost beside a hero.
describe('InfoDot sizing', () => {
  const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));

  test('takes the size it is given', () => {
    const { InfoDot } = require('../UI');
    render(<InfoDot term="netWorth" size={11} />);
    expect(flat(screen.getByText('ⓘ')).fontSize).toBe(11);
  });

  test('the touch box reaches 44pt whatever size the glyph is drawn at', () => {
    const { InfoDot } = require('../UI');
    for (const size of [11, 13, 15]) {
      const { unmount } = render(<InfoDot term="netWorth" size={size} />);
      const f = flat(screen.getByText('ⓘ'));
      expect(size + f.paddingVertical * 2).toBeGreaterThanOrEqual(44);
      unmount();
    }
  });

  test('and the row never grows for it — padding is given straight back', () => {
    // The founder's constraint: the visible circle is the height of the text, so a row carrying a
    // dot is exactly as tall as one without. A dot that fattens its row looks wrong, and these sit
    // on bands all over the app. Padding buys the touch area; the negative margin returns the space.
    const { InfoDot } = require('../UI');
    render(<InfoDot term="netWorth" size={11} />);
    const f = flat(screen.getByText('ⓘ'));
    expect(f.paddingVertical + f.marginVertical).toBe(0);          // net vertical footprint: nothing
    expect(f.paddingHorizontal + f.marginHorizontal).toBe(6);      // net horizontal: the visible gap
  });

  test('and a section band asks for its own title size, not the old flat 13', () => {
    const { SectionBand } = require('../SectionBand');
    render(<SectionBand title="WHAT COUNTS TOWARD RETIREMENT" infoTerm="netWorth" />);
    const title = flat(screen.getByText('WHAT COUNTS TOWARD RETIREMENT')).fontSize;
    expect(flat(screen.getByText('ⓘ')).fontSize).toBe(title);
  });
});
