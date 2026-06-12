// ErrorBoundary — launch test plan P0 area 7 (crash resilience): a child render crash must show
// the friendly fallback and recover via "Try again", never white-screen the app.
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

function Bomb({ fuse }: { fuse: boolean }): React.JSX.Element {
  if (fuse) throw new Error('kaboom');
  return <Text>all good</Text>;
}

describe('ErrorBoundary', () => {
  test('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Text>healthy content</Text>
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy content')).toBeOnTheScreen();
  });

  test('a throwing child shows the fallback instead of crashing', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb fuse />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.getByText('Try again')).toBeOnTheScreen();
    consoleError.mockRestore();
  });

  test('a custom fallback message is shown when provided', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallbackMessage="The chart hit a snag — your data is safe.">
        <Bomb fuse />
      </ErrorBoundary>,
    );
    expect(screen.getByText('The chart hit a snag — your data is safe.')).toBeOnTheScreen();
    consoleError.mockRestore();
  });

  test('"Try again" re-renders the children (recovery path)', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    let fuse = true;
    function Flaky(): React.JSX.Element {
      if (fuse) throw new Error('kaboom');
      return <Text>recovered</Text>;
    }
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    fuse = false;                                   // the underlying problem goes away
    fireEvent.press(screen.getByText('Try again'));
    expect(screen.getByText('recovered')).toBeOnTheScreen();
    consoleError.mockRestore();
  });
});
