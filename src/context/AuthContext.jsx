import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8080";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user`, {
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      const data = await res.json();
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  /** Call after successful sign-in; body matches UserInfoResponse from the backend. */
  const login = (userInfo) => {
    setUser(userInfo);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("userEmail");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        username: user?.username ?? null,
        email: user?.email ?? null,
        roles: user?.roles ?? [],
        login,
        logout,
        refreshUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
