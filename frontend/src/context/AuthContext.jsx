import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loginUser, fetchCurrentUser, logoutUser, setAuthToken, getAuthToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessibleStations, setAccessibleStations] = useState([]);

  const refreshUser = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setCurrentUser(null);
        setAccessibleStations([]);
        return null;
      }
      const data = await fetchCurrentUser();
      if (data && data.success) {
        setCurrentUser(data.user);
        setAccessibleStations(data.accessibleStations || []);
        return data.user;
      } else {
        setCurrentUser(null);
        setAccessibleStations([]);
        return null;
      }
    } catch (err) {
      setCurrentUser(null);
      setAccessibleStations([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    if (data.success && data.user) {
      setCurrentUser(data.user);
      await refreshUser();
    }
    return data;
  };

  const logout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setAccessibleStations([]);
  };

  const isAuthorizedForStation = (stationId) => {
    if (!currentUser) return true; // Demo fallback allows open view unless strict
    if (currentUser.role === "admin") return true;
    return currentUser.assignedStationId === stationId;
  };

  const value = {
    currentUser,
    loading,
    accessibleStations,
    isAdmin: currentUser?.role === "admin",
    isOperator: currentUser?.role === "operator",
    assignedStationId: currentUser?.assignedStationId || null,
    login,
    logout,
    refreshUser,
    isAuthorizedForStation
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
