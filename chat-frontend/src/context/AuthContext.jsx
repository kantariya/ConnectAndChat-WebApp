// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const navigate = useNavigate();

  // On mount, fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/auth/me"); // your endpoint to get current user
        setUser(res.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoadingAuth(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (credentials) => {
    // credentials: { emailOrUsername, password }
    const res = await axios.post("/auth/login", credentials);
    // Backend sets HTTP-only cookie
    setUser(res.data); // adjust based on response shape
    return res;
  };

  const register = async (data) => {
    // data: { name, username, email, password }
    const res = await axios.post("/auth/register", data);
    setUser(res.data);
    return res;
  };

  const logout = async () => {
    await axios.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
