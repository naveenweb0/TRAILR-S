import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Booking } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import {
  Calendar,
  Search,
  Truck,
  Users,
  X,
  MapPin,
  Clock,
  IndianRupee,
  FileText,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Activity,
  History,
  Copy,
  Check,
  Building,
  School,
  Landmark,
} from 'lucide-react';

export const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.listAllBookings(params);
      if (res.success) setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const handleInspectBooking = async (b: Booking) => {
    setDetailLoading(true);
    setSelectedBooking(b);
    try {
      const res = await api.getAdminBookingDetail(b.id);
      if (res.success) setSelectedBooking(res.data);
    } catch (err) {
      console.error('Failed to load full booking details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return 'Not recorded';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid date';
    return (
      d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' (IST)'
    );
  };

  // Filtered bookings client-side
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesRef = b.bookingReference?.toLowerCase().includes(q);
        const matchesSchool = b.school?.name?.toLowerCase().includes(q);
        const matchesDest = b.destination?.name?.toLowerCase().includes(q);
        return matchesRef || matchesSchool || matchesDest;
      }
      return true;
    });
  }, [bookings, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  return (
    <div className="min-h-screen bg-dots py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <span className="text-purple-600 font-bold text-xs uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Network Operations & Booking Audits
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-1">
            Global Institute Excursion Bookings
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Audit venue reservations, itemized quote snapshots, fleet transport requirements, and revision logs across the ecosystem.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, institute, or venue..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold shrink-0"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none"
            >
              <option value="ALL">All Statuses ({bookings.length})</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Excursions List</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              Showing {filteredBookings.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Activity className="w-6 h-6 animate-spin text-purple-600" />
              <span>Loading global excursion bookings...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800">No excursion bookings match this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Institute</th>
                    <th className="py-3 px-4">Destination Venue</th>
                    <th className="py-3 px-4">Visit Date</th>
                    <th className="py-3 px-4">Visitors</th>
                    <th className="py-3 px-4">Venue Status</th>
                    <th className="py-3 px-4">Fleet Transport</th>
                    <th className="py-3 px-4">Quote Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{b.bookingReference}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {b.school?.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {b.destination?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {new Date(b.visitDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {b.totalGroupSize} ({b.studentCount} students)
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge type="booking" status={b.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        {b.requiresTransport ? (
                          <Link
                            to="/admin/traveller-requests"
                            className="inline-flex items-center gap-1"
                          >
                            <StatusBadge
                              type="traveller"
                              status={b.travellerRequest?.status || 'NEW'}
                              size="sm"
                            />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        ₹{(b.confirmedQuoteAmount || b.originalQuoteAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleInspectBooking(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition-colors"
                        >
                          Audit Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
              <span className="text-slate-500 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto text-slate-800">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                      #{selectedBooking.bookingReference}
                    </span>
                    <StatusBadge type="booking" status={selectedBooking.status} size="sm" />
                    {selectedBooking.requiresTransport && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Fleet Transport Requested
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1 font-display">
                    Excursion Booking Audit Record
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Timestamps Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Submission Date & Time</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{formatDateTime(selectedBooking.createdAt)}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Last Status Update</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{formatDateTime(selectedBooking.updatedAt)}</p>
                </div>
              </div>

              {/* School and Venue Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                    <School className="w-3.5 h-3.5 text-blue-600" />
                    <span>Institute</span>
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{selectedBooking.school?.name}</p>
                  <p className="text-slate-600">{selectedBooking.school?.city}, {selectedBooking.school?.state}</p>
                  <p className="text-slate-500 text-[11px]">{selectedBooking.school?.officialEmail}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                    <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Destination Venue</span>
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{selectedBooking.destination?.name}</p>
                  <p className="text-slate-600">{selectedBooking.destination?.city}, {selectedBooking.destination?.state}</p>
                  <p className="text-slate-500 text-[11px]">{selectedBooking.destination?.category}</p>
                </div>
              </div>

              {/* Visitor Counts & Logistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-center">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Visit Date</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {new Date(selectedBooking.visitDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Visitors</span>
                  <div className="font-black text-slate-900 text-base mt-0.5">{selectedBooking.totalGroupSize}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Students</span>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedBooking.studentCount}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Teachers & Staff</span>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedBooking.teacherCount || 0}</div>
                </div>
              </div>

              {/* Itemized Stored Quote Snapshot */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Itemized Quote Snapshot & Financials</span>
                  </span>
                  <span className="font-mono text-sm font-black text-emerald-700">
                    Total: ₹{(selectedBooking.confirmedQuoteAmount || selectedBooking.originalQuoteAmount || 0).toLocaleString()}
                  </span>
                </div>

                {selectedBooking.priceItems && selectedBooking.priceItems.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Item Description</th>
                          <th className="py-2 px-3">Unit Price</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {selectedBooking.priceItems.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-semibold text-slate-900">{item.description || item.itemDescription}</td>
                            <td className="py-2 px-3 font-mono">₹{item.unitPrice}</td>
                            <td className="py-2 px-3 font-mono">{item.quantity}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">
                              ₹{(item.totalPrice || item.unitPrice * item.quantity).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                    Gross estimated excursion value: ₹{(selectedBooking.confirmedQuoteAmount || selectedBooking.originalQuoteAmount || 0).toLocaleString()}.
                  </div>
                )}
              </div>

              {/* Fleet Transport Section */}
              {selectedBooking.requiresTransport && (
                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <Truck className="w-4 h-4 text-purple-600" />
                      <span>Dedicated Traveller Fleet Request</span>
                    </span>
                    <Link
                      to="/admin/traveller-requests"
                      className="text-purple-700 font-bold hover:underline text-[11px]"
                    >
                      Manage in Fleet Queue →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                    <div>Status: <strong>{selectedBooking.travellerRequest?.status || 'NEW'}</strong></div>
                    <div>AC Preference: <strong>{selectedBooking.travellerRequest?.acPreference || 'AC'}</strong></div>
                    <div>Coaches/Buses: <strong>{selectedBooking.travellerRequest?.busesCount || 'To be calculated'}</strong></div>
                  </div>
                </div>
              )}

              {/* Status History Logs */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-600" />
                  <span>State Transitions & Historical Audit</span>
                </span>
                <div className="space-y-2 border-l-2 border-slate-200 pl-3 text-xs">
                  {selectedBooking.statusHistory && selectedBooking.statusHistory.length > 0 ? (
                    selectedBooking.statusHistory.map((sh: any) => (
                      <div key={sh.id} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sh.toStatus}</span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(sh.createdAt)}</span>
                        </div>
                        {sh.reason && <p className="text-slate-600 text-[11px]">{sh.reason}</p>}
                        {sh.changedBy && (
                          <span className="text-[10px] text-slate-400 block">
                            By {sh.changedBy.name} ({sh.changedBy.role})
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-[11px]">No transitional change history logged.</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-5 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200"
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
