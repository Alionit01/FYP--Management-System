import { createContext, useContext, useEffect, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "../api/errors";
import { isTokenExpired } from "../api/token";

const AuthContext = createContext();

/* How often an open tab re-checks its token. Expiry was previously
   evaluated exactly once, at mount, so a tab left open past the token's
   lifetime kept rendering a signed-in navbar and protected pages.
   30s is frequent enough to feel immediate and costs one base64 decode. */
const TOKEN_RECHECK_MS = 30000;

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
  // Set once the session is dropped while the app is open, so the UI
  // can explain *why* it signed the student out instead of silently
  // bouncing them to the login page.
  const [sessionExpired, setSessionExpired] = useState(false);
  // null = not fetched yet; true/false once known
  const [profileComplete, setProfileComplete] = useState(null);

  const login = (token, studentId) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("student_id", studentId);
    setProfileComplete(null);
    setSessionExpired(false);
    setIsLoggedIn(true);
  };

  const logout = ({ expired = false } = {}) => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("student_id");
    setProfileComplete(null);
    setSessionExpired(expired);
    setIsLoggedIn(false);
  };

  const dismissSessionExpired = () => setSessionExpired(false);

  /* Re-check on a timer and whenever the tab regains focus, so a
     sleeping laptop or a backgrounded tab is corrected as soon as the
     student returns to it. */
  useEffect(() => {
    const recheck = () => {
      if (isLoggedIn && !getValidToken()) {
        // Expiry discovered locally: worth explaining, because from the
        // student's point of view nothing they did should have signed
        // them out.
        logout({ expired: true });
      }
    };

    const interval = window.setInterval(recheck, TOKEN_RECHECK_MS);
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [isLoggedIn]);

  /* The server rejected a request we sent a token with. Same treatment,
     raised by any call site that goes through extractErrorMessage. */
  useEffect(() => {
    const onExpired = () => {
      if (isLoggedIn) logout({ expired: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        login,
        logout,
        profileComplete,
        setProfileComplete,
        sessionExpired,
        dismissSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* The hook must live beside AuthProvider so it reads the same context
   instance; splitting them would create a second, empty context. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
