import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  LogIn,
  Sparkles,
  Lock,
} from 'lucide-react';

export const AdminAcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, loginWithGoogle, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token in the URL.');
      setLoading(false);
      return;
    }

    api.validateSuperAdminInvitation(token)
      .then((res) => {
        if (res.success && res.data) {
          setInvitationData(res.data);
          if (!res.data.isValid) {
            setError(res.data.message || 'This invitation is no longer active.');
          }
        }
      })
      .catch((err) => {
        console.error('Validation error:', err);
        setError(err.message || 'Failed to validate invitation token.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await api.acceptSuperAdminInvitation(token);
      if (res.success && res.data) {
        localStorage.setItem('schooldest_token', res.data.token);
        await refreshUser();
        setAcceptSuccess(true);
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 1500);
      }
    } catch (err: any) {
      console.error('Accept invitation error:', err);
      setError(err.message || 'Failed to claim Super Administrator privileges.');
      setAccepting(false);
    }
  };

  const handleSignInToAccept = async () => {
    try {
      if (token) {
        sessionStorage.setItem('schooldest_redirect_url', `/admin/accept-invite?token=${token}`);
      }
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 font-display">Verifying Administrator Invitation</h2>
          <p className="text-xs text-slate-500">Checking cryptographic token validity with Neon PostgreSQL...</p>
        </div>
      </div>
    );
  }

  const isEmailMatching = user && invitationData && user.email.toLowerCase().trim() === invitationData.email.toLowerCase().trim();

  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-purple-600 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>Super Administrator Invitation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 font-display tracking-tight">
            Elevated Platform Credentials
          </h1>
        </div>

        {/* Main Card */}
        <div className="glass-card p-8 rounded-3xl shadow-xl shadow-slate-200/50 space-y-6 bg-white border border-slate-200/80">
          {error && !invitationData?.isValid ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">Invitation Inactive</h2>
                <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 text-left">
                  {error}
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md"
              >
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : acceptSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  Privileges Activated!
                </h2>
                <p className="text-xs text-slate-500">
                  Welcome to the platform administration command centre. Redirecting you now...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading Command Centre...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-black text-slate-900 font-display">
                  Administrator Access Ready
                </h2>
                <p className="text-xs text-slate-500">
                  You have been designated as a Super Administrator by{' '}
                  <span className="font-bold text-slate-800">{invitationData?.invitedBy}</span>.
                </p>
              </div>

              {/* Invitation Metadata Strip */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 text-xs space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Authorized Email:</span>
                  <span className="font-mono font-bold text-slate-900">{invitationData?.email}</span>
                </div>
                {invitationData?.notes && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Designation / Notes:</span>
                    <span className="font-semibold text-slate-800">{invitationData.notes}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Expires:</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(invitationData?.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* State 1: User not logged in */}
              {!user && (
                <div className="space-y-3">
                  <button
                    onClick={handleSignInToAccept}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md shadow-purple-600/25 transition-all"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google to Claim</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Must sign in with <span className="font-semibold text-slate-600">{invitationData?.email}</span>
                  </p>
                </div>
              )}

              {/* State 2: User logged in with matching email */}
              {user && isEmailMatching && (
                <div className="space-y-3">
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all disabled:opacity-60"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activating Administrator Privileges...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Claim Super Administrator Access</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-emerald-700 font-semibold text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Signed in as verified identity: {user.email}</span>
                  </p>
                </div>
              )}

              {/* State 3: User logged in with non-matching email */}
              {user && !isEmailMatching && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Identity Mismatch Notice</div>
                      <p className="text-[11px] mt-0.5">
                        You are currently signed in as <span className="font-bold">{user.email}</span>. This invitation is cryptographically locked to <span className="font-bold">{invitationData?.email}</span>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignInToAccept}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors"
                  >
                    Switch to {invitationData?.email}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminAcceptInvitePage;
