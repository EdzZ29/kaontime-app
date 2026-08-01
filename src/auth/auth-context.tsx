import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  type AuthUser,
} from '@/api/auth';
import { clearToken } from '@/api/client';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the cold-start reset finishes. */
  isPreparing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  // Every cold start begins signed out. Any token left in secure storage by a
  // previous run is discarded, so credentials are always required — the app
  // deliberately does not restore a session.
  useEffect(() => {
    let cancelled = false;

    clearToken()
      .catch(() => {})
      .then(() => {
        if (!cancelled) {
          setUser(null);
          setIsPreparing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await apiLogin(email, password));
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isPreparing, signIn, signOut }),
    [user, isPreparing, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }

  return context;
}
