import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { TravellerServiceRequest, TravellerStatus } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import {
  Truck,
  Calendar,
  Building2,
  Users,
  MapPin,
  Clock,
  IndianRupee,
  CheckCircle2,
  X,
  Edit,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminTravellerPage: React.FC = () => {
  const [requests, setRequests] = useState<TravellerServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<TravellerServiceRequest | null>(null);

  // Edit Drawer Form
  const [status, setStatus] = useState<TravellerStatus>('NEW');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.listTravellerRequests();
      if (res.success) setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenDrawer = (req: TravellerServiceRequest) => {
    setSelectedReq(req);
    setStatus(req.status);
    setVehicleDetails(req.vehicleDetails || '');
    setQuoteAmount(req.quoteAmount ? String(req.quoteAmount) : '');
    setAdminNotes(req.adminNotes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setSaving(true);

    try {
      const res = await api.updateTravellerRequest(selectedReq.id, {
        status,
        vehicleDetails,
        quoteAmount: quoteAmount ? parseFloat(quoteAmount) : undefined,
        adminNotes,
      });

      if (res.success) {
        setSelectedReq(null);
        fetchRequests();
      }
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-dots py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 uppercase tracking-wider">
                Admin-Only Queue
              </span>
              <span className="text-xs text-slate-400">Isolated from destination portals</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-display mt-1 flex items-center gap-2">
              <Truck className="w-6 h-6 text-purple-600" />
              <span>Dedicated Traveller & Fleet Coordination Queue</span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Review institute transport requirements, assign fleet partners, provide quotes, and track bus reservations.
            </p>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Active Fleet Coordination Requests</h3>
            <span className="text-xs text-slate-400 font-semibold">{requests.length} total records</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading fleet requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No transportation assistance requests submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Institute</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Route & Timing</th>
                    <th className="py-3 px-4">Passengers / Vehicle</th>
                    <th className="py-3 px-4">Fleet Status</th>
                    <th className="py-3 px-4">Quote</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {r.booking?.bookingReference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.school?.name}</div>
                        <div className="text-[11px] text-slate-400">{r.school?.contactPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {r.destination?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {r.pickupCity} ({r.pickupTime})
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{r.pickupAddress}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-purple-900">{r.passengerCount} Passengers</div>
                        <div className="text-[11px] text-slate-500">{r.preferredVehicle}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge type="traveller" status={r.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {r.quoteAmount ? `₹${r.quoteAmount.toLocaleString()}` : <span className="text-slate-400 font-normal">Pending</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDrawer(r)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-colors"
                        >
                          Manage Fleet
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COORDINATION DRAWER / MODAL */}
        {selectedReq && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded">
                    #{selectedReq.booking?.bookingReference}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    Fleet Coordination & Quoting
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <div>Institute: <strong className="text-slate-900">{selectedReq.school?.name}</strong></div>
                <div>Destination: <strong>{selectedReq.destination?.name}</strong></div>
                <div>Passenger Strength: <strong>{selectedReq.passengerCount}</strong> ({selectedReq.preferredVehicle})</div>
                <div>Pickup: <strong>{selectedReq.pickupAddress}, {selectedReq.pickupCity}</strong> at {selectedReq.pickupTime}</div>
                {selectedReq.specialInstructions && (
                  <div className="pt-1 text-purple-900 font-medium">Instructions: "{selectedReq.specialInstructions}"</div>
                )}
              </div>

              <form onSubmit={handleUpdate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fleet Service Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TravellerStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="NEW">NEW - Newly Queued</option>
                    <option value="SOURCING_TRANSPORT">SOURCING_TRANSPORT - Contacting Fleet Partners</option>
                    <option value="QUOTE_PREPARED">QUOTE_PREPARED - Fleet Sourced, Quote Ready</option>
                    <option value="AWAITING_SCHOOL_APPROVAL">AWAITING_SCHOOL_APPROVAL - Sent to Institute</option>
                    <option value="CONFIRMED">CONFIRMED - Coaches Reserved & Locked</option>
                    <option value="COMPLETED">COMPLETED - Trip Executed</option>
                    <option value="UNAVAILABLE">UNAVAILABLE - Fleet Capacity Exhausted</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fleet Quote Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      placeholder="e.g. 28500"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Calculated for all requested coaches including fuel, driver toll, and taxes.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assigned Vehicle & Fleet Operator Details
                  </label>
                  <textarea
                    rows={2}
                    value={vehicleDetails}
                    onChange={(e) => setVehicleDetails(e.target.value)}
                    placeholder="e.g. 3x 49-seater BharatBenz AC coaches. Operator: Royal Travels Ludhiana (Driver Contact: +91 98765 00001)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Internal Admin Notes</label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Rate negotiated with fleet manager; police verification complete."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReq(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md"
                  >
                    {saving ? 'Updating...' : 'Save Fleet Coordination'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
