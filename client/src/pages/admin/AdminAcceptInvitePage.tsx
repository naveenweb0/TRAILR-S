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
  LogOut,
  Sparkles,
  Lock,
  Mail,
  RefreshCw,
} from 'lucide-react';

export const AdminAcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, loginWithGoogle, refreshUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  // Popups & Countdown States
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [countdown, setCountdown] = useState<number>(10);
  const [countdownActive, setCountdownActive] = useState<boolean>(false);

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
          if (res.data.status === 'PENDING') {
            setShowEmailPrompt(true);
          } else if (res.data.status === 'ACCEPTED' || res.data.isAccepted) {
            // Already accepted invitation
            setAcceptSuccess(true);
            setCountdownActive(true);
          } else {
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

  // Handle 10-second countdown to auto logout
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdownActive && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdownActive && countdown === 0) {
      handleAutoLogout();
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdownActive, countdown]);

  const handleAutoLogout = async () => {
    setCountdownActive(false);
    const targetEmail = invitationData?.email || user?.email || '';
    try {
      await logout();
    } catch (e) {
      console.warn('Logout error during auto logout:', e);
    } finally {
      navigate(`/login?notice=relogin_super_admin&email=${encodeURIComponent(targetEmail)}`, { replace: true });
    }
  };

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
        setCountdown(10);
        setCountdownActive(true);
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
      setShowEmailPrompt(false);
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
  const isAcceptedStatus = invitationData?.status === 'ACCEPTED' || invitationData?.isAccepted;

  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-purple-600 selection:text-white relative">
      {/* Modal 1: "Use This Same Email" Popup on Open */}
      {showEmailPrompt && invitationData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-inner">
              <Mail className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wide">
                Account Verification Required
              </span>
              <h3 className="text-xl font-black text-slate-900 font-display">
                Use This Same Email
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This Super Administrator invitation was specifically issued to:
              </p>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 font-mono font-bold text-purple-900 text-sm select-all">
                {invitationData.email}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Please continue with this exact Google account. After identity verification, you will be automatically logged out and asked to re-login to enter the Super Admin Command Centre.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {!user ? (
                <button
                  onClick={handleSignInToAccept}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google ({invitationData.email})</span>
                </button>
              ) : isEmailMatching ? (
                <button
                  onClick={() => {
                    setShowEmailPrompt(false);
                    handleAccept();
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Claim Super Admin Access Now</span>
                </button>
              ) : (
                <button
                  onClick={handleSignInToAccept}
                  className="w-full py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors"
                >
                  <span>Switch Account to {invitationData.email}</span>
                </button>
              )}

              <button
                onClick={() => setShowEmailPrompt(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Close & View Details
              </button>
            </div>
          </div>
        </div>
      )}

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
          {error && !invitationData?.isValid && !isAcceptedStatus ? (
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
          ) : acceptSuccess || isAcceptedStatus ? (
            <div className="text-center space-y-5 py-3 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  Super Admin Privileges Activated!
                </h2>
                <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 text-xs text-purple-950 text-left space-y-2.5">
                  <p className="font-bold text-purple-900">
                    Important Account Activation Step:
                  </p>
                  <p className="leading-relaxed">
                    Your Google account (<strong>{user?.email || invitationData?.email}</strong>) is now authorized as a top-level Super Administrator.
                  </p>
                  
                  {/* Countdown Notice Box */}
                  <div className="bg-white/95 p-3.5 rounded-xl border border-purple-300 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-600 animate-spin" />
                        <span>Auto sign-out in progress...</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-mono font-black text-xs">
                        {countdown}s
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      You will be automatically signed out in <strong>{countdown} seconds</strong>. Then, simply re-login with your Google account to enter the Command Centre with full Super Admin privileges.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleAutoLogout}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out Now & Re-login with Google</span>
                </button>

                <button
                  onClick={() => navigate('/admin', { replace: true })}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Continue Directly to Admin Dashboard
                </button>
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
                    <span>Sign in with Google ({invitationData?.email})</span>
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
