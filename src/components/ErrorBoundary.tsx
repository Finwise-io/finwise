import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {this.props.fallbackMessage ?? 'An unexpected error occurred. Your data is safe.'}
        </Text>
        {__DEV__ && this.state.error && (
          <ScrollView style={styles.devBox}>
            <Text style={styles.devText}>{this.state.error.toString()}</Text>
          </ScrollView>
        )}
        <TouchableOpacity style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emoji:       { fontSize: 48, marginBottom: Spacing.md },
  title:       { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  message:     { fontSize: Typography.sizes.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  devBox:      { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.sm, maxHeight: 200, width: '100%', marginBottom: Spacing.lg },
  devText:     { fontSize: 11, color: Colors.amber, fontFamily: 'monospace' },
  button:      { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.pill },
  buttonText:  { color: '#fff', fontWeight: '700', fontSize: Typography.sizes.md },
});
