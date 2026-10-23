import React from 'react';
import { BookingStatus, AvailabilityStatus, TravellerStatus } from '../../types/index.js';
import { CheckCircle2, Clock, AlertCircle, XCircle, Truck, HelpCircle, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  type: 'booking' | 'availability' | 'traveller' | 'verification';
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, size = 'md' }) => {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (type === 'booking') {
    switch (status as BookingStatus) {
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${pad}`}>
            <Clock className="w-3.5 h-3.5" />
            Submitted (Pending Review)
          </span>
        );
      case 'CHANGES_REQUESTED':
      case 'AWAITING_SCHOOL_RESPONSE':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-300 animate-pulse ${pad}`}>
            <AlertCircle className="w-3.5 h-3.5" />
            Changes Proposed
          </span>
        );
      case 'ACCEPTED':
      case 'AWAITING_CONFIRMATION':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accepted by Destination
          </span>
        );
      case 'CONFIRMED':
      case 'COMPLETED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-green-100 text-green-800 border border-green-300 ${pad}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Trip Confirmed
          </span>
        );
      case 'REJECTED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${pad}`}>
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </span>
        );
      case 'CANCELLED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${pad}`}>
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-600 ${pad}`}>
            {status}
          </span>
        );
    }
  }

  if (type === 'traveller') {
    switch (status as TravellerStatus) {
      case 'NEW':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${pad}`}>
            <Truck className="w-3.5 h-3.5" />
            Transport Queued (Admin)
          </span>
        );
      case 'SOURCING_TRANSPORT':
      case 'UNDER_REVIEW':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${pad}`}>
            <Clock className="w-3.5 h-3.5" />
            Sourcing Fleet Coaches
          </span>
        );
      case 'QUOTE_PREPARED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${pad}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Quote Ready
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Buses Reserved
          </span>
        );
      case 'UNAVAILABLE':
      case 'CANCELLED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${pad}`}>
            <XCircle className="w-3.5 h-3.5" />
            Unavailable / Cancelled
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-600 ${pad}`}>
            <Truck className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  }

  if (type === 'availability') {
    switch (status as AvailabilityStatus) {
      case 'AVAILABLE':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}>
            Available
          </span>
        );
      case 'LIMITED':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded bg-amber-50 text-amber-700 border border-amber-200 ${pad}`}>
            Limited Capacity
          </span>
        );
      case 'FULLY_BOOKED':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded bg-rose-50 text-rose-700 border border-rose-200 ${pad}`}>
            Fully Booked
          </span>
        );
      case 'CLOSED':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded bg-slate-100 text-slate-600 border border-slate-200 ${pad}`}>
            Closed
          </span>
        );
      case 'BLACKOUT':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded bg-purple-50 text-purple-700 border border-purple-200 ${pad}`}>
            Blackout / Holiday
          </span>
        );
      default:
        return <span className={`rounded bg-slate-100 text-slate-600 ${pad}`}>{status}</span>;
    }
  }

  // Verification
  if (status === 'VERIFIED') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}>
        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
      </span>
    );
  } else if (status === 'PENDING') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${pad}`}>
        <Clock className="w-3.5 h-3.5" /> Pending Approval
      </span>
    );
  }

  return <span className={`rounded bg-slate-100 text-slate-600 ${pad}`}>{status}</span>;
};
