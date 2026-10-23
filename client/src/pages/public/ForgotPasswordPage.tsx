import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { KeyRound, Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const tokenFromUrl = queryParams.get('token') || queryParams.get('reset_token');

  // Request Reset state
  const [email, setEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  // Perform Reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setRequestSuccess(true);
      if (res?.resetToken) {
        setDevResetToken(res.resetToken);
      }
    } catch (err: any) {
      setRequestError(err.message || 'Unable to process password reset request. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 8) {
      setResetError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!tokenFromUrl) {
      setResetError('Missing password reset token. Please request a new link.');
      return;
    }

    setResetLoading(true);

    try {
      await api.resetPassword(tokenFromUrl, newPassword);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || 'Password reset failed. The link may have expired or already been used.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dots flex items-center justify-center py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-7">
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <Link to="/" title="Return to Home">
              <img
                src="/brand/logo-dark.png"
                alt="TRAILR'S"
                className="h-12 sm:h-14 w-auto object-contain transition-transform hover:scale-105"
              />
            </Link>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-black text-slate-950 tracking-tight font-display">
            {tokenFromUrl ? 'Reset Account Password' : 'Password Recovery'}
          </h1>
          <p className="text-[15px] text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
            {tokenFromUrl
              ? 'Enter and confirm your new password to regain access to your portal.'
              : 'Enter your verified official email to receive a secure password recovery link.'}
          </p>
        </div>

        <div className="bg-white p-7 sm:p-9 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6">
          {tokenFromUrl ? (
            /* RESET PASSWORD FORM */
            resetSuccess ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Password Updated!</h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Your password has been successfully reset. You may now sign in using your new credentials.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {resetError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[14px] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[16px] text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[16px] text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-[16px] font-bold shadow-md shadow-slate-900/10 transition-colors flex items-center justify-center gap-2 focus:outline-none disabled:opacity-60"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Set New Password</span>
                        <KeyRound className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* REQUEST RESET LINK FORM */
            requestSuccess ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <Mail className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Recovery Instructions Sent</h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    If an account exists with <span className="font-semibold text-slate-900">{email}</span>, a secure password reset link has been dispatched.
                  </p>
                </div>

                {devResetToken && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-2">
                    <span className="font-bold block flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Development Mode Helper
                    </span>
                    <p className="text-amber-800/90 text-[11px]">
                      A local reset token was generated. Click below to proceed directly to the new password form:
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/forgot-password?token=${devResetToken}`)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      Open Reset Form &rarr;
                    </button>
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-[14px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                {requestError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[14px] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    <span>{requestError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">Registered Official Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coordinator@dpsludhiana.edu.in"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[16px] text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="w-full py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-[16px] font-bold shadow-md shadow-slate-900/10 transition-colors flex items-center justify-center gap-2 focus:outline-none disabled:opacity-60"
                  >
                    {requestLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Recovery Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center text-[14px]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
