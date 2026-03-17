import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isGuest: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  continueAsGuest: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage / session storage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedGuest = sessionStorage.getItem('isGuest');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else if (storedGuest === 'true') {
      setIsGuest(true);
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData: User, jwtToken: string) => {
    setUser(userData);
    setToken(jwtToken);
    setIsGuest(false);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.removeItem('isGuest');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsGuest(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('isGuest');
  };

  const continueAsGuest = () => {
    setUser(null);
    setToken(null);
    setIsGuest(true);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('isGuest', 'true');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isGuest,
      login,
      logout,
      continueAsGuest,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
