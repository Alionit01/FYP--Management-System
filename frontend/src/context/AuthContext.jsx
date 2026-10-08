import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function getValidToken() {
  const token = localStorage.getItem("access_token");
  if (token && isTokenExpired(token)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("student_id");
    return null;
  }
  return token;
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getValidToken());
  // null = not fetched yet; true/false once known
  const [profileComplete, setProfileComplete] = useState(null);

  const login = (token, studentId) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("student_id", studentId);
    setProfileComplete(null);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("student_id");
    setProfileComplete(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        login,
        logout,
        profileComplete,
        setProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
