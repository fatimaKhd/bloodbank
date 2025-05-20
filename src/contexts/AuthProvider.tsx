import { createContext, useContext, useState, useEffect } from 'react';

interface UserProfile {
  name?: string | null;
  phone?: string | null;
}

interface AuthContextType {
  user: any | null;
  loading: boolean;
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<void | boolean>;
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<void | boolean>;
  signOut: () => Promise<void>;
  updateProfile: (profileData: UserProfile) => Promise<boolean>;
  fetchProfile: () => Promise<void>;  // New method to fetch user profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Adjust your backend URL
const BACKEND_URL = "http://localhost:5000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setLoading(false); // don't stay stuck
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.ok && data.user) {
          setUser(data.user);
          setProfile(data.profile || {});
        } else {
          console.warn("Not authorized, clearing token");
          localStorage.removeItem("authToken");
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Fetch user error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);


  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setProfile(data.profile);
        return true;
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (err) {
      console.error("SignIn error", err);
      return false;
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, phone }),
      });

      const data = await res.json();
      if (res.ok) {
        return true;
      } else {
        throw new Error(data.message || "Signup failed");
      }
    } catch (err) {
      console.error("SignUp error", err);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const updateProfile = async (profileData: UserProfile) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setProfile(updated);
      return true;
    } catch (err) {
      console.error("Profile update failed", err);
      return false;
    }
  };

  // Function to fetch the current user's profile from the backend
  const fetchProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      const data = await response.json();

      if (data.user) {
        setUser(data.user);
        setProfile(data.user);
      } else {
        throw new Error('User profile not found');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };



  return (
    <AuthContext.Provider value={{ user, loading, profile, signIn, signUp, signOut, updateProfile, fetchProfile }}>
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
