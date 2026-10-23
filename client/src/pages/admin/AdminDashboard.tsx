import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import {
  Shield,
  School,
  Landmark,
  Calendar,
  Truck,
  IndianRupee,
  ArrowRight,
  PlusCircle,
  FileText,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { SkeletonDashboard } from '../../components/common/Skeleton.js';
import { ScrollReveal } from '../../components/common/ScrollReveal.js';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAdminOverview()
      .then((res) => {
        if (res.success) setOverview(res.data);
      })
      .catch((err) => {
        console.error('Admin overview error:', err);
        setError(err.message || 'Failed to load administrator overview.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <SkeletonDashboard isDark={true} title="Synchronizing ecosystem command center..." />;
  }

  if (error || !overview) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Administrative Access Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'Unable to authorize access to platform administrator data. Please ensure you are signed in with a verified SUPER_ADMIN account.'}
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dots py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <img
                src="/brand/logo-light.png"
                alt="TRAILR'S"
                className="h-8 w-auto object-contain"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/25 border border-purple-400/40 text-purple-200 text-[12px] font-bold tracking-wide">
                <Shield className="w-3.5 h-3.5 text-purple-300" />
                <span>Super Administration</span>
              </span>
            </div> 
            <h1 className="text-white text-[28px] sm:text-[34px] font-black font-display tracking-tight leading-tight">
              Global Command Centre
            </h1>
            <p className="text-slate-200 text-[15px] sm:text-[16px] max-w-xl leading-relaxed">
              Ecosystem visibility into all institutes, destinations, bookings, and the dedicated fleet coordination queue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/admin/traveller-requests"
              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 text-white font-bold text-[15px] shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Truck className="w-5 h-5 text-white" />
              <span>Fleet Queue ({overview?.traveller?.new || 0} New)</span>
            </Link>

            <Link
              to="/admin/destinations"
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 text-white font-bold text-[15px] border border-slate-700 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              <span>Onboard Venue</span>
            </Link>
          </div>
        </div>

        {/* METRICS GRID - Full Card Clickable Surfaces */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Destinations Card */}
          <ScrollReveal direction="up" delay={60}>
            <Link
              to="/admin/destinations"
              aria-label={`Destinations overview: ${overview?.destinations?.total ?? 0} total venues`}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer block group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span className="group-hover:text-emerald-700 transition-colors">Destinations</span>
                <Landmark className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-slate-900 tracking-tight mt-1">
                {overview?.destinations?.total ?? 0}
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="text-[13px] text-emerald-700 font-semibold">
                  {overview?.destinations?.published ?? 0} published & live
                </div>
                {overview?.destinations?.pendingApproval > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate('/admin/destinations?tab=pending');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/admin/destinations?tab=pending');
                      }
                    }}
                    className="text-[12px] font-bold text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-1.5 mt-0.5 cursor-pointer"
                    title="Filter pending approval proposals"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>{overview.destinations.pendingApproval} pending review</span>
                  </span>
                )}
              </div>
            </Link>
          </ScrollReveal>

          {/* 2. Registered Institutes Card */}
          <ScrollReveal direction="up" delay={120}>
            <Link
              to="/admin/schools"
              aria-label={`Registered institutes overview: ${overview?.schools?.total ?? 0} registered institutes`}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer block group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span className="group-hover:text-blue-700 transition-colors">Registered Institutes</span>
                <School className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-slate-900 tracking-tight mt-1">
                {overview?.schools?.total ?? 0}
              </div>
              <div className="text-[13px] text-blue-700 font-semibold mt-1">
                {overview?.schools?.verified ?? 0} approved institutions
              </div>
            </Link>
          </ScrollReveal>

          {/* 3. Excursions Booked Card */}
          <ScrollReveal direction="up" delay={180}>
            <Link
              to="/admin/bookings"
              aria-label={`Excursions booked overview: ${overview?.bookings?.total ?? 0} total bookings`}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer block group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span className="group-hover:text-indigo-700 transition-colors">Excursions Booked</span>
                <Calendar className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-slate-900 tracking-tight mt-1">
                {overview?.bookings?.total ?? 0}
              </div>
              <div className="text-[13px] text-indigo-700 font-semibold mt-1">
                {overview?.bookings?.accepted ?? 0} accepted / confirmed
              </div>
            </Link>
          </ScrollReveal>

          {/* 4. Fleet Requests Card */}
          <ScrollReveal direction="up" delay={240}>
            <Link
              to="/admin/traveller-requests"
              aria-label={`Fleet coordination requests: ${overview?.traveller?.total ?? 0} total transport requests`}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer block group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span className="group-hover:text-purple-700 transition-colors">Fleet Requests</span>
                <Truck className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-purple-700 tracking-tight mt-1">
                {overview?.traveller?.total ?? 0}
              </div>
              <div className="text-[13px] text-purple-700 font-semibold mt-1">
                {overview?.traveller?.new ?? 0} new awaiting fleet action
              </div>
            </Link>
          </ScrollReveal>
        </div>

        {/* Total Ecosystem Booking Value Card - Full Clickable Surface */}
        <ScrollReveal direction="up" delay={100}>
          <Link
            to="/admin/bookings"
            aria-label={`Total gross booking value: ₹${(overview?.totalEstimatedValue ?? 0).toLocaleString()} - click to view global bookings`}
            className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer block group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <IndianRupee className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[13px] text-slate-500 font-bold uppercase tracking-wider block">
                    Ecosystem Total Gross Booking Value
                  </span>
                  <div className="text-[32px] sm:text-[36px] font-black text-slate-950 font-display">
                    ₹{(overview?.totalEstimatedValue ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[12px] text-slate-400 font-medium">
                    Calculated from verified itemized quote snapshots of accepted institute bookings
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-5 py-3 rounded-xl bg-slate-950 group-hover:bg-blue-600 text-white text-[15px] font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <span>View Global Bookings</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        </ScrollReveal>

        {/* QUICK MANAGEMENT TILES */}
        <ScrollReveal direction="up" delay={150}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Link
              to="/admin/traveller-requests"
              className="p-6 bg-purple-50/70 hover:bg-purple-50 border border-purple-200 rounded-3xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group space-y-2"
            >
              <Truck className="w-7 h-7 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-purple-950 text-[17px]">Traveller Coordination</h3>
              <p className="text-[14px] text-purple-800/80 leading-relaxed">
                Admin-only queue for sourcing coaches, pricing quotes, and confirming bus fleets.
              </p>
            </Link>

            <Link
              to="/admin/destinations"
              className="p-6 bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 rounded-3xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group space-y-2"
            >
              <Landmark className="w-7 h-7 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-emerald-950 text-[17px]">Destination Directory</h3>
              <p className="text-[14px] text-emerald-800/80 leading-relaxed">
                Onboard new amusement venues, verify amusement licenses, and moderate listings.
              </p>
            </Link>

            <Link
              to="/admin/schools"
              className="p-6 bg-blue-50/70 hover:bg-blue-50 border border-blue-200 rounded-3xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group space-y-2"
            >
              <School className="w-7 h-7 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-blue-950 text-[17px]">Institute Management</h3>
              <p className="text-[14px] text-blue-800/80 leading-relaxed">
                Review institute registrations, verify affiliations (CBSE/ICSE), and manage staff.
              </p>
            </Link>

            <Link
              to="/admin/settings"
              className="p-6 bg-slate-100/70 hover:bg-slate-100 border border-slate-200 rounded-3xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group space-y-2"
            >
              <Activity className="w-7 h-7 text-slate-700 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-slate-900 text-[17px]">Audit Logs & Settings</h3>
              <p className="text-[14px] text-slate-600 leading-relaxed">
                Inspect immutable audit records of all bookings, changes, and system policies.
              </p>
            </Link>
          </div>
        </ScrollReveal>

        {/* Onboarding Call to Action when database is freshly initialized */}
        {overview?.destinations?.total === 0 && overview?.schools?.total === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <PlusCircle className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-[22px] font-bold text-slate-900">Platform Ready for Real Data</h2>
              <p className="text-slate-500 text-[15px]">
                All demo data has been cleared. Begin by onboarding verified destination partners and educational institutions.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/admin/destinations"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Onboard First Destination
              </Link>
              <Link
                to="/admin/schools"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                Manage Institutes
              </Link>
            </div>
          </div>
        )}

        {/* RECENT AUDIT LOGS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Real-time Ecosystem Audit Activity</span>
            </h3>
            <Link to="/admin/settings" className="text-xs font-bold text-blue-600 hover:underline">
              View All Logs
            </Link>
          </div>

          {(!overview?.recentActivity || overview.recentActivity.length === 0) ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No audit logs recorded yet. System activity will appear here as bookings and venue updates occur.
            </div>
          ) : (
            <div className="space-y-3">
              {overview.recentActivity.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-slate-400">
                    <div>{log.user?.name || 'System'}</div>
                    <div>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

