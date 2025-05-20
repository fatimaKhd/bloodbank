
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { toast } from "sonner";

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
  
      try {
        // Get token from local storage
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
  
        // Fetch user session
        const sessionRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/session`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!sessionRes.ok) throw new Error('Failed to fetch session');
  
        const session = await sessionRes.json();
        setUser(session.user);
  
        // Fetch user profile
        const profileRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/profiles/${session.user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!profileRes.ok) throw new Error('Failed to fetch profile');
  
        const profile = await profileRes.json();
        setProfile(profile);
      } catch (err) {
        console.error('Auth error:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserAndProfile();
  
    // You can optionally set up WebSocket or EventSource for auth state changes if needed
  }, []);
  

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      toast.success('Successfully signed in!');
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone
          }
        }
      });

      if (signUpError) throw signUpError;
      
      // If signup is successful, update the profile table
      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: phone
          })
          .eq('id', signUpData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast.success('Registration successful! Please check your email to verify your account.');
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  const signOut = async () => {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully signed out!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateProfile = async (profileData: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) => {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      if (!user) {
        throw new Error('No user logged in');
      }

      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => ({ ...prev, ...profileData }));

      toast.success('Profile updated successfully!');
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  return {
    user,
    loading,
    profile,
    signIn,
    signUp,
    signOut,
    updateProfile
  };
}
