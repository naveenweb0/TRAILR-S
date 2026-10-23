import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Compass,
  ShieldCheck,
  School,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { getPostLoginRedirect } from '../../routes/routingUtils.js';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect immediately away from login
  React.useEffect(() => {
    if (!loading && user) {
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || sessionStorage.getItem('schooldest_redirect_url');
      sessionStorage.removeItem('schooldest_redirect_url');
      sessionStorage.removeItem('schooldest_login_intent');
      navigate(getPostLoginRedirect(user, redirect), { replace: true });
    }
  }, [user, loading, navigate, location.search]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      if (redirect) sessionStorage.setItem('schooldest_redirect_url', redirect);

      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setError(err.message || 'Google authentication was cancelled or failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const intent = new URLSearchParams(location.search).get('intent') || new URLSearchParams(location.search).get('portal');

  return (
    <div className="min-h-[calc(100vh-72px)] bg-aurora flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="max-w-md w-full space-y-7">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-blue-200 text-blue-700 text-[13px] font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Official B2B Authentication</span>
          </div>

          <h1 className="text-[32px] sm:text-[38px] font-black text-slate-950 font-display tracking-tight leading-tight">
            Account Sign In
          </h1>
          <p className="text-[15px] sm:text-[16px] text-slate-600 max-w-sm mx-auto leading-relaxed">
            The unified B2B platform connecting educational institutions directly with destinations across India
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[14px] flex items-start gap-3 shadow-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Authentication Notice</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {intent === 'school' && (
          <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-900 text-[14px] flex items-center gap-2.5 font-semibold shadow-xs">
            <School className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Institute Access: Continue with Google to access your verified excursion portal.</span>
          </div>
        )}

        {/* Main Glass Card */}
        <div className="glass-card p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-[20px] font-black text-slate-900 font-display">
              Secure Single Sign-On
            </h2>
            <p className="text-[13px] text-slate-500">
              Instant verified login for Institute staff, Venue managers & Administrators
            </p>
          </div>

          {/* Primary Action: Google Sign-in */}
          <div>
            <button
              type="button"
              onClick={() => handleGoogleSignIn()}
              disabled={googleLoading}
              className="w-full py-4 px-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50/80 text-slate-800 text-[16px] font-extrabold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Security Guarantee Strip */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-Bit SSL Encrypted &bull; No Password Needed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
