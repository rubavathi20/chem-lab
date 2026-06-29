import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, studentId: string, className: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseSupabaseError(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;

  const err = error as { message?: string; code?: string; error_code?: string };
  const message = err.message || '';
  const code = err.code || err.error_code || '';

  // Map common Supabase auth errors to user-friendly messages
  if (message.includes('User already registered') || code === 'user_already_exists') {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (message.includes('Invalid email') || code === 'invalid_email') {
    return 'Please enter a valid email address.';
  }
  if (message.includes('Password') && message.includes('short')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('Signups not allowed')) {
    return 'New registrations are currently disabled. Contact your administrator.';
  }
  if (message.includes('Unable to connect') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please check your email and click the confirmation link before logging in.';
  }

  return message || 'Registration failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
      console.log('[Auth] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        return null;
      }

      console.log('[Auth] Profile fetched:', data ? 'success' : 'not found');
      setProfile(data);
      return data;
    } catch (e) {
      console.error('[Auth] Profile fetch exception:', e);
      return null;
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        console.log('[Auth] Initializing auth state...');
        const { data: { session: s }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Session fetch error:', error);
        }

        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          console.log('[Auth] User found, fetching profile...');
          await fetchProfile(s.user.id);
        }
      } catch (e) {
        console.error('[Auth] Init error:', e);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('[Auth] Auth initialization complete');
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('[Auth] Auth state changed:', event);
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) {
        setProfile(null);
      } else if (event === 'SIGNED_IN') {
        fetchProfile(s.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    console.log('[Auth] Signing in with email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        console.error('[Auth] Sign in error:', error);
        return { error: parseSupabaseError(error) };
      }

      if (data.session) {
        console.log('[Auth] Sign in successful');
        setSession(data.session);
        setUser(data.session.user);
        await fetchProfile(data.session.user.id);
      }
      return { error: null };
    } catch (e) {
      console.error('[Auth] Sign in exception:', e);
      return { error: parseSupabaseError(e) };
    }
  }

  async function signUp(email: string, password: string, name: string, studentId: string, className: string) {
    console.log('[Auth] Signing up:', { email, name, studentId, className });

    // Validate inputs
    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }
    if (!name || name.trim().length < 2) {
      return { error: 'Please enter your full name (at least 2 characters).' };
    }
    if (!studentId || studentId.trim().length < 2) {
      return { error: 'Please enter a valid student ID.' };
    }

    try {
      // Sign up with user metadata (will be passed to the database trigger)
      console.log('[Auth] Calling supabase.auth.signUp...');
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            student_id: studentId.trim(),
            class_name: className.trim() || '',
          },
          emailRedirectTo: window.location.origin,
        },
      });

      console.log('[Auth] SignUp response:', {
        user: data.user?.id,
        session: !!data.session,
        error: error?.message
      });

      if (error) {
        console.error('[Auth] SignUp error:', error);
        return { error: parseSupabaseError(error) };
      }

      if (!data.user) {
        console.error('[Auth] No user returned from signUp');
        return { error: 'Registration failed. No user account was created.' };
      }

      // Check if user already exists (identities will be empty if email already registered)
      if (data.user.identities && data.user.identities.length === 0) {
        return { error: 'An account with this email already exists. Try logging in instead.' };
      }

      console.log('[Auth] User created successfully:', data.user.id);

      // If we have a session immediately, fetch profile
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        await fetchProfile(data.user.id);
        return { error: null };
      }

      // If no session, user needs to confirm email
      // Try to create profile manually in case the trigger didn't work
      console.log('[Auth] No immediate session, attempting profile creation...');

      // Wait a moment for the trigger to potentially fire
      await new Promise(resolve => setTimeout(resolve, 500));

      // Even without a session, we've successfully registered
      // The user will need to verify email if required
      return { error: null };

    } catch (e) {
      console.error('[Auth] SignUp exception:', e);
      return { error: parseSupabaseError(e) };
    }
  }

  async function signOut() {
    console.log('[Auth] Signing out');
    setProfile(null);
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
