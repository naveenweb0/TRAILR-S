import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Booking } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  X,
  FileText,
  Building2,
  Users,
  Utensils,
  Ban,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const SchoolBookingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('status') || 'ALL');

  const [respondingToChange, setRespondingToChange] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.getMyBookings(activeTab !== 'ALL' ? activeTab : undefined);
      if (res.success) {
        setBookings(res.data);

        // If viewId in query params, open details
        const viewId = searchParams.get('viewId');
        if (viewId) {
          const b = res.data.find((item: Booking) => item.id === viewId);
          if (b) setSelectedBooking(b);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const handleRespondChange = async (changeRequestId: string, action: 'ACCEPT' | 'REJECT') => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      const res = await api.respondToChangeRequest(selectedBooking.id, {
        changeRequestId,
        action,
        schoolResponseNotes: changeNotes,
      });
      if (res.success) {
        setRespondingToChange(false);
        fetchBookings();
        // Refresh single booking
        const updated = await api.getBookingDetail(selectedBooking.id);
        if (updated.success) setSelectedBooking(updated.data);
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    const reason = prompt('Please enter the cancellation reason:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await api.cancelBooking(selectedBooking.id, reason);
      if (res.success) {
        fetchBookings();
        const updated = await api.getBookingDetail(selectedBooking.id);
        if (updated.success) setSelectedBooking(updated.data);
      }
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { label: 'All Bookings', value: 'ALL' },
    { label: 'Pending Review', value: 'SUBMITTED' },
    { label: 'Changes Requested', value: 'CHANGES_REQUESTED' },
    { label: 'Accepted & Confirmed', value: 'ACCEPTED' },
    { label: 'Declined / Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-blue-600 font-bold text-xs uppercase tracking-wider">
              Institute Excursion Management
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 font-display mt-0.5">
              My Institute Bookings
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Track venue review states, proposed change requests, and transport coordination.
            </p>
          </div>

          <Link
            to="/destinations"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>Book New Trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            Loading bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">No bookings in this category</h3>
            <p className="text-slate-500 text-xs mt-1">Explore destinations to plan your next visit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                    <img
                      src={b.destination?.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200'}
                      alt={b.destination?.name || 'Destination'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {b.bookingReference}
                      </span>
                      <StatusBadge type="booking" status={b.status} size="sm" />
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mt-1">
                      {b.destination?.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(b.visitDate).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {b.totalGroupSize} Visitors ({b.studentCount} Students, {b.teacherCount} Teachers)
                      </span>
                    </div>

                    {/* Transport indicator */}
                    <div className="mt-2 flex items-center gap-2">
                      {b.requiresTransport ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                          <Truck className="w-3 h-3" />
                          <span>Fleet Transport: {b.travellerRequest?.status || 'Queued with Admin'}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Self-arranged transport</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-2 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Quote
                    </span>
                    <div className="text-lg font-extrabold text-slate-900 font-mono">
                      ₹{(b.confirmedQuoteAmount || b.originalQuoteAmount).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      const res = await api.getBookingDetail(b.id);
                      if (res.success) setSelectedBooking(res.data);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    View Details & Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BOOKING DETAILS MODAL */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                      #{selectedBooking.bookingReference}
                    </span>
                    <StatusBadge type="booking" status={selectedBooking.status} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                    {selectedBooking.destination?.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visit Date: <strong className="text-slate-800">
                      {new Date(selectedBooking.visitDate).toLocaleDateString([], {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong> ({selectedBooking.arrivalTime} - {selectedBooking.departureTime})
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ACTION REQUIRED: CHANGE REQUEST FROM DESTINATION */}
              {selectedBooking.changeRequests?.some((c) => c.status === 'PENDING') && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Destination Proposed Adjustments to Your Booking:</span>
                  </div>

                  {selectedBooking.changeRequests
                    .filter((c) => c.status === 'PENDING')
                    .map((c) => (
                      <div key={c.id} className="text-xs text-slate-700 space-y-2">
                        <p className="p-3 bg-white/80 rounded-xl border border-amber-200 font-medium">
                          "{c.reason}"
                        </p>
                        {c.proposedDate && (
                          <div className="text-xs">
                            Proposed Alternative Date:{' '}
                            <strong className="text-amber-900">
                              {new Date(c.proposedDate).toLocaleDateString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </strong>
                          </div>
                        )}
                        {c.proposedStudentCount && (
                          <div className="text-xs">
                            Proposed Student Count: <strong>{c.proposedStudentCount}</strong>
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => handleRespondChange(c.id, 'ACCEPT')}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Accept Proposed Terms
                          </button>
                          <button
                            onClick={() => handleRespondChange(c.id, 'REJECT')}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
                          >
                            Decline Proposal
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* SEPARATE LINKED TRAVELLER STATUS (Independent tracking) */}
              {selectedBooking.requiresTransport && selectedBooking.travellerRequest && (
                <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-purple-950 text-xs">
                      <Truck className="w-4 h-4 text-purple-600" />
                      <span>Dedicated Transport Coordination (Super Admin Queue)</span>
                    </div>
                    <StatusBadge type="traveller" status={selectedBooking.travellerRequest.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pickup Location</span>
                      <span className="font-semibold">{selectedBooking.travellerRequest.pickupAddress}, {selectedBooking.travellerRequest.pickupCity}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicles & Passengers</span>
                      <span className="font-semibold">{selectedBooking.travellerRequest.passengerCount} Passengers ({selectedBooking.travellerRequest.preferredVehicle})</span>
                    </div>

                    {selectedBooking.travellerRequest.quoteAmount && (
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Transport Fleet Quote</span>
                        <span className="text-sm font-extrabold text-purple-900 font-mono">₹{selectedBooking.travellerRequest.quoteAmount.toLocaleString()}</span>
                      </div>
                    )}

                    {selectedBooking.travellerRequest.vehicleDetails && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Fleet Details</span>
                        <span className="font-medium text-slate-800">{selectedBooking.travellerRequest.vehicleDetails}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Line-item Quote Breakdown */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Itemized Venue Pricing Snapshot
                </h3>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                  {selectedBooking.priceItems?.map((pi) => (
                    <div key={pi.id} className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-700">{pi.description}</span>
                      <span className="font-bold text-slate-900 font-mono">₹{pi.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}

                  {selectedBooking.facilities?.map((f) => (
                    <div key={f.id} className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-700">{f.facility?.name} (Qty: {f.quantity})</span>
                      <span className="font-mono text-slate-900">₹{f.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="flex justify-between pt-2 text-sm font-extrabold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-blue-600 font-mono text-base">
                      ₹{(selectedBooking.confirmedQuoteAmount || selectedBooking.originalQuoteAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status History Audit Trail */}
              {selectedBooking.statusHistory && selectedBooking.statusHistory.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Status History & Audit Trail
                  </h3>
                  <div className="space-y-2 text-xs border-l-2 border-slate-200 pl-3">
                    {selectedBooking.statusHistory.map((sh) => (
                      <div key={sh.id} className="relative pb-2">
                        <span className="font-bold text-slate-800">{sh.toStatus}</span>
                        {sh.reason && <p className="text-slate-600 text-[11px] mt-0.5">{sh.reason}</p>}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(sh.createdAt).toLocaleString()} by {sh.changedBy?.name || 'System'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'COMPLETED' ? (
                  <button
                    onClick={handleCancelBooking}
                    className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-colors"
                  >
                    Cancel Booking
                  </button>
                ) : (
                  <div></div>
                )}

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
