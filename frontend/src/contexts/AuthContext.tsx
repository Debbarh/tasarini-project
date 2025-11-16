import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { authTokenStorage } from '@/integrations/api/client';
import { ApiUser, ApiUserProfile, authService } from '@/services/authService';
import { sessionService } from '@/services/sessionService';

export type UserRole = 'admin' | 'professional' | 'user' | 'partner';

type Profile = ApiUserProfile | null;

type AuthContextType = {
  user: ApiUser | null;
  profile: Profile;
  userRoles: UserRole[];
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role?: 'user' | 'partner',
    dateOfBirth?: string,
    termsAccepted?: boolean,
    privacyAccepted?: boolean,
    privacyPolicyVersion?: string,
    marketingConsent?: boolean
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithFacebook: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  hasRole: (role: UserRole) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const mapBackendRoleToFront = (role: string): UserRole => {
  if (role === 'traveler' || role === 'user') return 'user';
  if (role === 'editor' || role === 'professional') return 'professional';
  if (role === 'partner') return 'partner';
  return 'admin';
};

const deduplicateRoles = (primary: string, extra: string[]): UserRole[] => {
  const merged = new Set<UserRole>();
  merged.add(mapBackendRoleToFront(primary));
  extra.forEach((role) => merged.add(mapBackendRoleToFront(role)));
  return Array.from(merged);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserContext = async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setUserRoles(deduplicateRoles(currentUser.role, currentUser.roles || []));
      sessionService.setUser(currentUser);
      try {
        const profileData = await authService.getMyProfile();
        setProfile(profileData);
      } catch (profileError: any) {
        // Check if it's an EMAIL_NOT_VERIFIED error
        if (profileError?.errorCode === 'EMAIL_NOT_VERIFIED') {
          console.log('AuthContext: Email not verified, redirecting to verification page');
          setProfile(null);
          // Redirect to email verification page
          window.location.href = '/verify-email-required';
          return;
        }
        console.warn('AuthContext: unable to fetch profile', profileError);
        setProfile(null);
      }
    } catch (error: any) {
      // Check if it's an EMAIL_NOT_VERIFIED error on getCurrentUser
      if (error?.errorCode === 'EMAIL_NOT_VERIFIED') {
        console.log('AuthContext: Email not verified on getCurrentUser');
        window.location.href = '/verify-email-required';
        return;
      }
      authTokenStorage.clear();
      sessionService.clear();
      setUser(null);
      setUserRoles([]);
      setProfile(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authTokenStorage.getAccessToken()) {
      loadUserContext().catch(() => {
        // handled inside loadUserContext
      });
    } else {
      sessionService.clear();
      setLoading(false);
    }
  }, []);

  const signUp: AuthContextType['signUp'] = async (
    email,
    password,
    firstName,
    lastName,
    role = 'user',
    dateOfBirth,
    termsAccepted,
    privacyAccepted,
    privacyPolicyVersion = '1.0',
    marketingConsent = false
  ) => {
    try {
      const result = await authService.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
        date_of_birth: dateOfBirth,
        terms_accepted: termsAccepted,
        privacy_policy_accepted: privacyAccepted,
        privacy_policy_version: privacyPolicyVersion,
        marketing_consent: marketingConsent,
      });
      authTokenStorage.clear();
      sessionService.clear();
      setUser(null);
      setProfile(null);
      setUserRoles([]);
      toast.success('Un email de vérification a été envoyé. Merci de confirmer votre adresse pour activer votre compte.');
      return { error: null };
    } catch (error: any) {
      console.error('AuthContext: signUp error', error);
      toast.error(error?.payload?.detail || t('auth.invalidCredentials'));
      return { error };
    }
  };

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    try {
      const tokens = await authService.login(email, password);
      authTokenStorage.setTokens(tokens);
      await loadUserContext();
      toast.success(t('auth.signInSuccess'));
      return { error: null };
    } catch (error: any) {
      console.error('AuthContext: signIn error', error);
      const status = error?.status;
      if (status === 401) {
        toast.error(t('auth.invalidCredentials'));
      } else if (error?.payload?.code === 'user_inactive') {
        toast.error(
          'Votre compte n’est pas encore activé. Vérifiez votre boîte mail et suivez le lien de confirmation pour finaliser votre inscription.'
        );
      } else {
        toast.error(error?.payload?.detail || error?.message || t('auth.signInError'));
      }
      return { error };
    }
  };

  const unsupported = async () => {
    const error = new Error('Not supported yet');
    toast.error('Cette méthode de connexion n’est pas encore disponible.');
    return { error };
  };

  const signInWithGoogle = unsupported;
  const signInWithFacebook = unsupported;

  const signOut = async () => {
    authTokenStorage.clear();
    sessionService.clear();
    setUser(null);
    setProfile(null);
    setUserRoles([]);
  };

  const resetPassword: AuthContextType['resetPassword'] = async (email) => {
    toast.info('La réinitialisation du mot de passe sera bientôt disponible.');
    return { error: null };
  };

  const hasRole = (role: UserRole): boolean => {
    return userRoles.includes(role);
  };

  const value: AuthContextType = {
    user,
    profile,
    userRoles,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    resetPassword,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
