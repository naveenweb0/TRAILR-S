import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { Booking, Destination } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { SkeletonDashboard } from '../../components/common/Skeleton.js';
import {
  Landmark,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  ArrowRight,
  Settings,
  XCircle,
  Check,
} from 'lucide-react';
import { ScrollReveal } from '../../components/common/ScrollReveal.js';

export const DestinationDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Destination | null>(null);
  const [reports, setReports] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewAction, setReviewAction] = useState<'ACCEPT' | 'REJECT' | 'CHANGES' | null>(null);
  const [reason, setReason] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, rRes, bRes] = await Promise.all([
        api.getMyDestinationProfile().catch(() => null),
        api.getDestinationReports().catch(() => null),
        api.getDestinationBookings().catch(() => null),
      ]);
      if (pRes && pRes.success) {
        setProfile(pRes.data);
      } else if (!user?.destination && user?.role !== 'SUPER_ADMIN') {
        navigate('/destination/onboard');
        return;
      }
      if (rRes && rRes.success) setReports(rRes.data);
      if (bRes && bRes.success) setBookings(bRes.data);
    } catch (err) {
      console.error(err);
      if (!user?.destination && user?.role !== 'SUPER_ADMIN') {
        navigate('/destination/onboard');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleExecuteAction = async () => {
    if (!selectedBooking || !reviewAction) return;
    setActionLoading(true);

    try {
      if (reviewAction === 'ACCEPT') {
        await api.acceptBooking(selectedBooking.id, reason || 'Booking accepted by destination manager.');
      } else if (reviewAction === 'REJECT') {
        if (!reason) {
          alert('Please enter a rejection reason.');
          setActionLoading(false);
          return;
        }
        await api.rejectBooking(selectedBooking.id, reason);
      } else if (reviewAction === 'CHANGES') {
        if (!reason) {
          alert('Please explain the proposed changes.');
          setActionLoading(false);
          return;
        }
        await api.requestBookingChanges(selectedBooking.id, {
          proposedDate: proposedDate || undefined,
          reason,
        });
      }

      setReviewAction(null);
      setSelectedBooking(null);
      setReason('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW');

  if (loading) {
    return <SkeletonDashboard title="Loading Venue Operations Portal..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Banner */}
        <ScrollReveal direction="up" delay={50}>
          <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
                  <Landmark className="w-3.5 h-3.5" />
                  {profile?.name || user?.destination?.name || 'Destination Management Portal'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
                  Venue Operations Dashboard
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                  Manage group capacity, live availability calendars, ticket rates, and incoming institute booking decisions.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/destination/calendar"
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Control Calendar</span>
                </Link>

                <Link
                  to="/destination/listing"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Edit Listing</span>
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Pending Approval notice */}
        {profile?.status === 'PENDING_APPROVAL' && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900">Venue Proposal Under Administrator Review</h4>
              <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                Your destination details, media uploads, and student group ticket pricing have been submitted. The platform super administrator verifies all attraction details and safety compliance before publishing to institutes nationwide.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-900 font-black text-[10px] tracking-wide uppercase shrink-0">
              PENDING APPROVAL
            </span>
          </div>
        )}

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <ScrollReveal direction="up" delay={80}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Total Bookings</span>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-slate-900 tracking-tight">
                {reports?.totalBookings ?? bookings.length}
              </div>
              <div className="text-[13px] text-slate-500">Lifetime institute requests</div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={140}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Pending Decisions</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-amber-600 tracking-tight">
                {pendingBookings.length}
              </div>
              <div className="text-[13px] text-amber-700">Requires your review</div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Confirmed Visitors</span>
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-emerald-600 tracking-tight">
                {reports?.totalVisitors ?? 0}
              </div>
              <div className="text-[13px] text-emerald-700">Students & teachers</div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={260}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Estimated Revenue</span>
                <IndianRupee className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-[28px] sm:text-[32px] font-black text-blue-600 tracking-tight font-display">
                ₹{(reports?.estimatedRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-[13px] text-blue-700">From accepted bookings</div>
            </div>
          </ScrollReveal>
        </div>

        {/* INCOMING BOOKING INBOX */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Incoming Institute Requests Inbox</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Review visitor counts, requested add-ons, and decide whether to accept or propose adjustments.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {bookings.length} requests received
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading inbox...</div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-sm">Inbox is Clear</h4>
              <p className="text-slate-500 text-xs mt-1">No incoming institute booking requests at this moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ref</th>
                    <th className="py-3 px-4">Institute</th>
                    <th className="py-3 px-4">Visit Date</th>
                    <th className="py-3 px-4">Students / Staff</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4">Estimate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {b.bookingReference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.school?.name}</div>
                        <div className="text-[11px] text-slate-400">{b.school?.city}, {b.school?.contactPhone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {new Date(b.visitDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">{b.arrivalTime} - {b.departureTime}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900">{b.totalGroupSize}</span>
                        <span className="text-slate-400 text-[10px]"> ({b.studentCount} students, {b.teacherCount} staff)</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge type="booking" status={b.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        ₹{(b.confirmedQuoteAmount || b.originalQuoteAmount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setReviewAction('ACCEPT');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setReviewAction('CHANGES');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors"
                        >
                          Propose Changes
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setReviewAction('REJECT');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors"
                        >
                          Decline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DECISION / REVIEW MODAL */}
        {selectedBooking && reviewAction && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {reviewAction === 'ACCEPT' && 'Accept Institute Booking Request'}
                  {reviewAction === 'CHANGES' && 'Propose Alternative Date or Adjustments'}
                  {reviewAction === 'REJECT' && 'Decline Institute Booking Request'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setReviewAction(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>Institution: <strong className="text-slate-900">{selectedBooking.school?.name}</strong></div>
                <div>Requested Date: <strong>{new Date(selectedBooking.visitDate).toLocaleDateString()}</strong></div>
                <div>Group Strength: <strong>{selectedBooking.totalGroupSize} visitors</strong> ({selectedBooking.studentCount} students)</div>
              </div>

              {reviewAction === 'CHANGES' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Propose Alternative Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {reviewAction === 'ACCEPT' && 'Confirmation Notes / Assembly Instructions'}
                  {reviewAction === 'CHANGES' && 'Reason for Proposed Change *'}
                  {reviewAction === 'REJECT' && 'Clear Reason for Rejection *'}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    reviewAction === 'ACCEPT'
                      ? 'e.g. Pavilion B reserved for lunch; wristbands will be issued at Gate 2.'
                      : reviewAction === 'CHANGES'
                      ? 'e.g. Our Space Theatre has full reservations on morning slot; we propose shifting by 1 day or splitting into 2 batches.'
                      : 'e.g. Park reached daily maximum student capacity on this date.'
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setReviewAction(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteAction}
                  disabled={actionLoading}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                    reviewAction === 'ACCEPT'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : reviewAction === 'CHANGES'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
