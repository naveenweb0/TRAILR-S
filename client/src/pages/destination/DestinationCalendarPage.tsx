import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { AvailabilityCalendar } from '../../components/common/AvailabilityCalendar.js';
import { AvailabilityDay, AvailabilityStatus, Destination } from '../../types/index.js';
import { Calendar, Settings, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const DestinationCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit date state
  const [selectedDay, setSelectedDay] = useState<AvailabilityDay | null>(null);
  const [editStatus, setEditStatus] = useState<AvailabilityStatus>('AVAILABLE');
  const [editCapacity, setEditCapacity] = useState<number>(1000);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    api.getMyDestinationProfile()
      .then((res) => {
        if (res.success) setProfile(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleEditDate = (dayData: AvailabilityDay) => {
    setSelectedDay(dayData);
    setEditStatus(dayData.status);
    setEditCapacity(dayData.capacity || profile?.maxGroupSize || 1000);
    setEditNotes(dayData.notes || '');
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;
    setSaving(true);

    try {
      const res = await api.updateDateAvailability({
        date: selectedDay.date,
        status: editStatus,
        dailyCapacity: editCapacity,
        notes: editNotes,
      });

      if (res.success) {
        setSelectedDay(null);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update calendar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading calendar...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-rose-500">Destination profile not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">
            Operational Controls
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display mt-0.5">
            Availability & Capacity Calendar Manager
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Click any date on the calendar to open, close, mark blackout, or set custom group capacity limits.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AvailabilityCalendar
              key={refreshTrigger}
              destinationId={profile.id}
              isEditable={true}
              onEditDate={handleEditDate}
            />
          </div>

          <div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                Calendar Quick Guide
              </h3>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <p>
                  <strong>Live Institute Sync:</strong> Any updates made here instantly reflect in the public discovery and institute booking calendars.
                </p>
                <p>
                  <strong>No Double Booking:</strong> The platform validates booked count against daily capacity transactionally when institutes submit requests.
                </p>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 space-y-1">
                  <div className="font-bold">Default Venue Policy:</div>
                  <div>Max Group: <strong>{profile.maxGroupSize} visitors</strong></div>
                  <div>Tour Guide: <strong>{profile.guideAvailable ? 'Included' : 'Self-guided'}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Date Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Edit Capacity & Availability
                  </h3>
                  <p className="text-xs text-slate-500">Date: {selectedDay.date}</p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAvailability} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Availability Status *</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AvailabilityStatus)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="AVAILABLE">Available (Open for Institute Bookings)</option>
                    <option value="LIMITED">Limited Capacity</option>
                    <option value="CLOSED">Closed for Institute Visits</option>
                    <option value="BLACKOUT">Blackout / Maintenance / Holiday</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Daily Visitor Capacity</label>
                  <input
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Current Bookings on this date: {selectedDay.bookedCount} visitors
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Instructions for Institutes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Wave pool open from 11 AM; Special physics lab session"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
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
