// Regression tests for the recovery-code screen. Born from manual TestFlight findings — every bug
// found by hand gets pinned here at the lowest layer that can catch it (QA discipline, 2026-06-22).
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecoveryCodeModal } from '../RecoveryCodeModal';

const CHECKBOX = "I've saved my recovery code somewhere safe";

test('shows the code and starts UNchecked', () => {
  const { getByText, queryByText } = render(<RecoveryCodeModal visible code="ABCD-1234" onDone={() => {}} />);
  expect(getByText('ABCD-1234')).toBeTruthy();
  expect(queryByText('✓')).toBeNull();                 // checkbox unchecked at first
});

test('checking the box shows the ✓', () => {
  const { getByLabelText, queryByText } = render(<RecoveryCodeModal visible code="ABCD-1234" onDone={() => {}} />);
  fireEvent.press(getByLabelText(CHECKBOX));
  expect(queryByText('✓')).toBeTruthy();
});

// Issue 2 (build #28): the modal stays mounted between signups, so its checked state persisted →
// a second signup showed the box already checked.
test('the "I\'ve saved it" checkbox RESETS when the screen reappears (regression: issue 2)', () => {
  const { getByLabelText, queryByText, rerender } = render(
    <RecoveryCodeModal visible code="ABCD-1234" onDone={() => {}} />,
  );
  fireEvent.press(getByLabelText(CHECKBOX));
  expect(queryByText('✓')).toBeTruthy();               // checked

  rerender(<RecoveryCodeModal visible={false} code="ABCD-1234" onDone={() => {}} />);   // dismissed
  rerender(<RecoveryCodeModal visible code="WXYZ-9876" onDone={() => {}} />);           // second signup

  expect(queryByText('✓')).toBeNull();                 // must be UNchecked again
  expect(queryByText('WXYZ-9876')).toBeTruthy();
});
