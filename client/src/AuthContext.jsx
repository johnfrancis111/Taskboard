import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    if (!tokenStore.get()) return;
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => {
    const finish = ({ token, user: u }) => {
      tokenStore.set(token);
      setUser(u);
    };
    return {
      user,
      loading,
      login: async (email, password) => finish(await api.login(email, password)),
      signup: async (email, password) => finish(await api.signup(email, password)),
      logout: () => {
        tokenStore.clear();
        setUser(null);
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
