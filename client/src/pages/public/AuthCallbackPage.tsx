import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { getNeonSession } from '../../services/neonAuth.js';
import { Loader2, AlertCircle, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';

import { getPostLoginRedirect } from '../../routes/routingUtils.js';

export const AuthCallbackPage: React.FC = () => {
  const { completeNeonAuth, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Verifying Google OAuth session with Neon Auth...');
  const hasRunRef = React.useRef(false);
  const callbackDoneRef = React.useRef(false);

  const handleRedirect = React.useCallback(
    (targetUser: any) => {
      if (!targetUser) return;

      const storedRedirect = sessionStorage.getItem('schooldest_redirect_url');
      sessionStorage.removeItem('schooldest_redirect_url');
      sessionStorage.removeItem('schooldest_login_intent');

      const targetPath = getPostLoginRedirect(targetUser, storedRedirect);
      navigate(targetPath, { replace: true });
    },
    [navigate]
  );

  // Only redirect from the user-effect AFTER the callback has already resolved
  // (handles the edge case where AuthContext already has a valid session from a prior login)
  useEffect(() => {
    if (user && callbackDoneRef.current) {
      handleRedirect(user);
    }
  }, [user, handleRedirect]);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    async function handleCallback() {
      try {
        const params = new URLSearchParams(location.search);
        let sessionToken = params.get('session_token') || params.get('token');

        if (!sessionToken) {
          setStatus('Retrieving session from Neon Auth...');
          const neonSession = await getNeonSession();
          sessionToken = neonSession?.session?.token || (neonSession as any)?.sessionToken;
        }

        if (!sessionToken) {
          throw new Error('No active Neon Auth session found after Google OAuth redirect. Please try signing in again.');
        }

        setStatus('Synchronizing user authorization and organization context...');
        const authUser = await completeNeonAuth(sessionToken);
        callbackDoneRef.current = true;
        handleRedirect(authUser);
      } catch (err: any) {
        console.error('Neon Auth callback error:', err);
        setError(err.message || 'Authentication exchange failed. Please try again.');
      }
    }

    handleCallback();
  }, [completeNeonAuth, handleRedirect, location.search]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center space-y-6">
        {!error ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Completing Google Sign-in
              </h2>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {status}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
              Secured with Neon Auth & Neon PostgreSQL server-side validation.
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Authentication Notice
              </h2>
              <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 mt-3 text-left">
                {error}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
