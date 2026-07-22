import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, isConfigured } from '../firebase';

const SESSION_KEY = 'ce_student_session';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [teacher, setTeacher] = useState(null);
  const [authReady, setAuthReady] = useState(!isConfigured);
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isConfigured) return;
    return onAuthStateChanged(auth, (user) => {
      setTeacher(user);
      setAuthReady(true);
    });
  }, []);

  const saveSession = (s) => {
    setSession(s);
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  };

  const logoutTeacher = () => signOut(auth);

  return (
    <AppContext.Provider value={{ teacher, authReady, session, saveSession, logoutTeacher }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
