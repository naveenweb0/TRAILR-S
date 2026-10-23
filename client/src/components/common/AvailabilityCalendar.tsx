import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { AvailabilityDay, AvailabilityStatus } from '../../types/index.js';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, AlertTriangle } from 'lucide-react';

interface AvailabilityCalendarProps {
  destinationId: string;
  selectedDate?: string;
  onSelectDate?: (date: string, dayData?: AvailabilityDay) => void;
  isEditable?: boolean; // For destination manager to toggle status/capacity
  onEditDate?: (dayData: AvailabilityDay) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  destinationId,
  selectedDate,
  onSelectDate,
  isEditable = false,
  onEditDate,
}) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [calendarData, setCalendarData] = useState<{
    days: AvailabilityDay[];
    minGroupSize: number;
    maxGroupSize: number;
    bookingLeadDays: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = async () => {
    if (!destinationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDestinationAvailability(destinationId, currentYear, currentMonth);
      if (res.success) {
        setCalendarData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load availability calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [destinationId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Calculate leading empty days for the 1st of the month
  const firstDayOfWeek = calendarData?.days?.[0]?.dayOfWeek ?? 0;
  const leadDays = Array.from({ length: firstDayOfWeek });

  const getStatusColor = (status: AvailabilityStatus, isPast: boolean) => {
    if (isPast) return 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed';

    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-100/80 cursor-pointer';
      case 'LIMITED':
        return 'bg-amber-50 text-amber-900 border-amber-300 hover:border-amber-500 hover:bg-amber-100/80 cursor-pointer';
      case 'PENDING_CONFIRMATION':
        return 'bg-blue-50 text-blue-900 border-blue-200 hover:border-blue-400 cursor-pointer';
      case 'FULLY_BOOKED':
        return 'bg-rose-50 text-rose-800 border-rose-200 cursor-not-allowed';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed';
      case 'BLACKOUT':
        return 'bg-purple-50 text-purple-800 border-purple-200 cursor-not-allowed';
      default:
        return 'bg-white border-slate-200';
    }
  };

  const handleDateClick = (dayData: AvailabilityDay) => {
    if (isEditable && onEditDate) {
      onEditDate(dayData);
      return;
    }

    if (dayData.isPast) return;
    if (dayData.status === 'CLOSED' || dayData.status === 'FULLY_BOOKED' || dayData.status === 'BLACKOUT') {
      return;
    }

    if (onSelectDate) {
      onSelectDate(dayData.date, dayData);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {monthNames[currentMonth - 1]} {currentYear}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setCurrentYear(now.getFullYear());
              setCurrentMonth(now.getMonth() + 1);
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-500 mb-2">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Days Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          <div className="animate-pulse flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            Loading live availability...
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {leadDays.map((_, i) => (
            <div key={`lead-${i}`} className="h-16 rounded-lg bg-slate-50/50"></div>
          ))}

          {calendarData?.days.map((dayData) => {
            const isSelected = selectedDate === dayData.date;
            const canBook =
              !dayData.isPast &&
              dayData.status !== 'CLOSED' &&
              dayData.status !== 'FULLY_BOOKED' &&
              dayData.status !== 'BLACKOUT';

            return (
              <div
                key={dayData.date}
                onClick={() => handleDateClick(dayData)}
                className={`h-16 p-1.5 rounded-xl border flex flex-col justify-between transition-all select-none relative ${getStatusColor(
                  dayData.status,
                  dayData.isPast
                )} ${
                  isSelected
                    ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/90 shadow-md font-bold'
                    : ''
                }`}
                title={dayData.notes || `${dayData.status} (${dayData.remainingCapacity} spots)`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : ''}`}>
                    {dayData.day}
                  </span>
                  {dayData.status === 'LIMITED' && !dayData.isPast && (
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  )}
                  {dayData.status === 'AVAILABLE' && !dayData.isPast && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  )}
                </div>

                <div className="text-[10px] leading-tight">
                  {dayData.isPast ? (
                    <span className="text-slate-400">Past</span>
                  ) : dayData.status === 'CLOSED' ? (
                    <span className="text-slate-500 font-medium">Closed</span>
                  ) : dayData.status === 'FULLY_BOOKED' ? (
                    <span className="text-rose-600 font-bold">Full</span>
                  ) : dayData.status === 'BLACKOUT' ? (
                    <span className="text-purple-600 font-medium">Holiday</span>
                  ) : (
                    <div className="truncate">
                      <span className="font-semibold text-emerald-800">{dayData.remainingCapacity}</span>
                      <span className="text-slate-500 text-[9px]"> spots</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accessible Status Legend */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
          <span>Limited Capacity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300"></span>
          <span>Fully Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span>
          <span>Closed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span>
          <span>Blackout / Holiday</span>
        </div>
      </div>
    </div>
  );
};
