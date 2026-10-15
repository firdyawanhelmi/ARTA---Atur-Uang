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
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1.5,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.text,
  },
  logoTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 68,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 28,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeActive: {
    backgroundColor: '#e8f5e9',
  },
  badgeActiveText: {
    color: '#2e7d32',
  },
  badgeExpired: {
    backgroundColor: colors.surface,
  },
  badgeExpiredText: {
    color: colors.muted,
  },
  badgeRevoked: {
    backgroundColor: '#ffebee',
  },
  badgeRevokedText: {
    color: colors.danger,
  },
  badgeCurrent: {
    backgroundColor: colors.text,
  },
  badgeCurrentText: {
    color: colors.background,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
});
