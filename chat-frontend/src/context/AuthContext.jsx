// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const navigate = useNavigate();

  // On mount, fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        setUser(null);
        toast.error(err.response?.data?.message || "Failed to fetch user");
      } finally {
        setLoadingAuth(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (credentials) => {
    try {
      const res = await axios.post("/auth/login", credentials);
      setUser(res.data);
      return res;
    } catch (error) {
      // The server's error message is inside error.response.data.message
      // If the server doesn't provide a message, use a default one
      throw new Error(error.response.data.message || "Login failed");
    }
  };

  const register = async (data) => {
    try {
      const res = await axios.post("/auth/register", data);
      setUser(res.data);
      return res;
    } catch (error) {
      throw new Error(error.response.data.message || "Registration failed");
    }
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout");
      setUser(null);
    } catch (error) {
      throw new Error(error.response.data.message || "Logout failed");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
