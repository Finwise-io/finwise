// Page-level keyboard-safe scroll (Theme 3): a full-screen ScrollView that lifts above the keyboard so
// inputs near the bottom (current age, balance, runway, etc.) are never trapped under it. Drop-in for a
// page's root <ScrollView> — forwards all ScrollView props; just swap the tag. Mirrors the proven
// ExpenseScreen pattern (KeyboardAvoidingView, behavior padding on iOS / height on Android).
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';

export function KeyboardAwareScreen({ children, ...props }: ScrollViewProps & { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" {...props}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
