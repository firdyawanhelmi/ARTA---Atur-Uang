/**
 * React binding over `session.ts`. All transition logic lives there (and is
 * unit-tested there); this provider only holds state and forwards calls.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  initialAuthState,
  loadDevices,
  refreshProfile,
  renameDevice,
  restoreSession,
  revokeDevice,
  signIn,
  signOut,
  signOutEverywhere,
  signUp,
  type AuthState,
  type DeviceMutationResult,
  type SessionDeps,
  type SignInInput,
  type SignUpInput,
  type SignUpResult,
} from './session';

export interface AuthContextValue {
  state: AuthState;
  restore: () => Promise<AuthState>;
  signIn: (input: SignInInput) => Promise<AuthState>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<AuthState>;
  signOutEverywhere: () => Promise<AuthState>;
  refreshProfile: () => Promise<AuthState>;
  loadDevices: () => Promise<AuthState>;
  renameDevice: (
    sessionId: number,
    deviceName: string,
  ) => Promise<DeviceMutationResult>;
  revokeDevice: (sessionId: number) => Promise<DeviceMutationResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const stateRef = useRef<AuthState>(state);
  const depsRef = useRef<SessionDeps>({});

  const update = useCallback((next: AuthState): AuthState => {
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    restoreSession(stateRef.current, depsRef.current).then((next) => {
      if (!cancelled) {
        update(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [update]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      restore: () =>
        restoreSession(stateRef.current, depsRef.current).then(update),
      signIn: (input: SignInInput) =>
        signIn(stateRef.current, input, depsRef.current).then(update),
      signUp: (input: SignUpInput) => signUp(input, depsRef.current),
      signOut: () => signOut(stateRef.current, depsRef.current).then(update),
      signOutEverywhere: () =>
        signOutEverywhere(stateRef.current, depsRef.current).then(update),
      refreshProfile: () =>
        refreshProfile(stateRef.current, depsRef.current).then(update),
      loadDevices: () =>
        loadDevices(stateRef.current, depsRef.current).then(update),
      renameDevice: (sessionId: number, deviceName: string) =>
        renameDevice(
          stateRef.current,
          sessionId,
          deviceName,
          depsRef.current,
        ).then((result) => {
          update(result.state);
          return result;
        }),
      revokeDevice: (sessionId: number) =>
        revokeDevice(stateRef.current, sessionId, depsRef.current).then(
          (result) => {
            update(result.state);
            return result;
          },
        ),
    }),
    [state, update],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
