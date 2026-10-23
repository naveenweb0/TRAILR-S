import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, LogOut, School, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

import { getPostLoginRedirect } from '../../routes/routingUtils.js';

export const PortalSelectionPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState<'SCHOOL' | 'DESTINATION' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect users who already have a portal assignment — portal selection is strictly one-time
  React.useEffect(() => {
    if (!user) return;
    if (user.role === 'SUPER_ADMIN' || user.school || user.destination || user.portalType) {
      navigate(getPostLoginRedirect(user), { replace: true });
    }
  }, [user, navigate]);

  const selectPortal = async (portalType: 'SCHOOL' | 'DESTINATION') => {
    setSubmitting(portalType);
    setError(null);
    try {
      const response = await api.selectPortal(portalType);
      if (!response.success || !response.data?.token) {
        throw new Error(response.message || 'Portal selection could not be saved.');
      }
      localStorage.setItem('schooldest_token', response.data.token);
      await refreshUser();
      navigate(portalType === 'SCHOOL' ? '/school/onboard' : '/destination/onboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Portal selection could not be saved. Please try again.');
      setSubmitting(null);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dots flex items-center justify-center py-14 px-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            One-time setup
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black text-slate-950 font-display">
            Choose Your Portal
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Select how you will use SCHOOLDEST. This choice is saved to your account and will not be asked again.
          </p>
        </div>

        {error && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => selectPortal('SCHOOL')}
            disabled={submitting !== null}
            className="group text-left bg-white rounded-3xl border border-slate-200 p-7 shadow-lg hover:border-blue-400 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-5">
              {submitting === 'SCHOOL' ? <Loader2 className="w-7 h-7 animate-spin" /> : <School className="w-7 h-7" />}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Institute / Educational Institution</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Register your institute, manage educational trips, and connect with verified destination partners.
            </p>
            <span className="inline-block mt-6 text-sm font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
              Continue to institute onboarding →
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectPortal('DESTINATION')}
            disabled={submitting !== null}
            className="group text-left bg-white rounded-3xl border border-slate-200 p-7 shadow-lg hover:border-purple-400 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-60"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-5">
              {submitting === 'DESTINATION' ? <Loader2 className="w-7 h-7 animate-spin" /> : <Building2 className="w-7 h-7" />}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Destination / Venue Partner</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Submit your venue for review, publish experiences, and receive institute booking requests.
            </p>
            <span className="inline-block mt-6 text-sm font-bold text-purple-700 group-hover:translate-x-1 transition-transform">
              Continue to destination onboarding →
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          className="mx-auto flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};
