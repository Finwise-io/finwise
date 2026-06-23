/**
 * B-L1: Tips are computed ON-DEVICE. Pressing "Analyze my expenses" must produce tips WITHOUT calling
 * the cloud AI, and the screen must state the privacy claim.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import * as economicData from '../../services/economicData';
import TipsScreen from '../TipsScreen';

beforeEach(() => useStore.getState().resetAll());

test('analyzing produces on-device tips and never calls the cloud AI', async () => {
  const spy = jest.spyOn(economicData, 'analyzeExpenses');
  useStore.setState({
    expenses: [
      { id: 'e1', amount: 300, category: 'Dining', store: 'Cafe', date: '2026-06-10' },
      { id: 'e2', amount: 60, category: 'Subscriptions', store: 'Streaming', date: '2026-06-11' },
    ],
  } as any);

  const { getByText } = render(<TipsScreen />);
  expect(getByText(/never sent to an AI provider/)).toBeTruthy();   // the emphasized privacy claim

  fireEvent.press(getByText('Analyze my expenses →'));
  await waitFor(() => expect(getByText('Cook more at home')).toBeTruthy());   // an on-device tip

  expect(spy).not.toHaveBeenCalled();   // B-L1: no cloud AI call
  spy.mockRestore();
});
