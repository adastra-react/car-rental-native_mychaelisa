import React, { createContext, useContext, useState } from "react";

type AuthContextType = {
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    // TODO: replace with real API call
    // For now, accept any credentials and set a mock token
    setToken("mock-token-" + email);
  };

  const signUp = async (email: string, password: string) => {
    // TODO: call backend registration
    setToken("mock-token-" + email);
  };

  const signOut = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
