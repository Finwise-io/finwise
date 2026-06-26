// Page-level keyboard-safe scroll (Theme 3): a full-screen ScrollView that keeps the focused input visible
// above the keyboard — including the reported case where the content fits the screen (so there was nothing
// to scroll and KeyboardAvoidingView's padding couldn't lift a bottom field).
// iOS: `automaticallyAdjustKeyboardInsets` adds a keyboard-sized content inset AND scrolls the focused
//      field into view, which works even when content otherwise fits. (No KAV, to avoid double-insetting.)
// Android: KeyboardAvoidingView height + the manifest's adjustResize handle it.
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';

export function KeyboardAwareScreen({ children, ...props }: ScrollViewProps & { children: React.ReactNode }) {
  const ios = Platform.OS === 'ios';
  const scroll = (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={ios} {...props}>
      {children}
    </ScrollView>
  );
  return ios ? scroll : (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">{scroll}</KeyboardAvoidingView>
  );
}
