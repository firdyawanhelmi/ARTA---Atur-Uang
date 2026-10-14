/**
 * Minimal monochrome theme (MONOCHROME / Pro Max direction): solid black,
 * gray, and white surfaces only. No gradients, no decorative elements.
 */

import { StyleSheet } from 'react-native';

export const colors = {
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#111111',
  muted: '#6b6b6b',
  border: '#d9d9d9',
  button: '#111111',
  buttonText: '#ffffff',
  danger: '#b00020',
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.button,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  link: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  error: {
    fontSize: 14,
    color: colors.danger,
    marginTop: 12,
  },
  notice: {
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
});
