import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("jwtToken") || null);

  // Автоматично перевіряємо токен при завантаженні
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("http://localhost:8080/api/username", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setUsername(null);
          setToken(null);
          localStorage.removeItem("jwtToken");
        } else {
          const data = await res.text();
          setUsername(data);
        }
      } catch (e) {
        setUsername(null);
        setToken(null);
        localStorage.removeItem("jwtToken");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = (jwt, username) => {
    setToken(jwt);
    localStorage.setItem("jwtToken", jwt);
    setUsername(username);
  };

  const logout = () => {
    setUsername(null);
    setToken(null);
    localStorage.removeItem("jwtToken");
  };

  return (
    <AuthContext.Provider value={{ username, setUsername, login, logout, token, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);