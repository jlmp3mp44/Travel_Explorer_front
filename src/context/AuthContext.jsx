import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiUrl } from "../config/api";
import { clearAuthToken } from "../utils/authToken";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/user"), {
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        clearAuthToken();
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

  /** Keep the session cookie in sync while the tab is open (pairs with longer-lived server JWT). */
  useEffect(() => {
    if (!user) return undefined;
    const intervalMs = 8 * 60 * 1000;
    const id = window.setInterval(() => {
      void refreshUser();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshUser();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user, refreshUser]);

  /** Call after successful sign-in; body matches UserInfoResponse from the backend. */
  const login = (userInfo) => {
    setUser(userInfo);
  };

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl("/api/auth/signout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* clear local session even if sign-out request fails */
    }
    setUser(null);
    clearAuthToken();
    localStorage.removeItem("userEmail");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        username: user?.username ?? null,
        email: user?.email ?? null,
        phone: user?.phoneNumber ?? user?.phone ?? null,
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
