import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { AvailabilityCalendar } from '../../components/common/AvailabilityCalendar.js';
import { AvailabilityDay, AvailabilityStatus } from '../../types/index.js';
import {
  Landmark,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  MapPin,
  Eye,
  Users,
  Image as ImageIcon,
  Clock,
  IndianRupee,
  FileCheck,
  RotateCcw,
  Ban,
  MessageSquare,
  Search,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Ticket,
  Building,
  Phone,
  Mail,
  Globe,
  Activity,
  History,
  Maximize2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export const AdminDestinationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'ALL';
  const [activeTab, setActiveTab] = useState<string>(initialTab.toUpperCase());

  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Proposal decision modal state (Approve confirmation, Change Request, Reject)
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    type: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | null;
    notes: string;
    destId: string;
    destName: string;
  }>({
    open: false,
    type: null,
    notes: '',
    destId: '',
    destName: '',
  });

  // Live Availability Calendar management state
  const [calendarRefreshKey, setCalendarRefreshKey] = useState<number>(0);
  const [dateEditModal, setDateEditModal] = useState<{
    open: boolean;
    dayData: AvailabilityDay | null;
    status: AvailabilityStatus;
    dailyCapacity: number;
    notes: string;
    saving: boolean;
  }>({
    open: false,
    dayData: null,
    status: 'AVAILABLE',
    dailyCapacity: 1000,
    notes: '',
    saving: false,
  });

  // Lightbox Image Inspection
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    caption?: string;
    isCover?: boolean;
  } | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // New Destination Form
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    category: 'Amusement & Waterpark',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    officialEmail: '',
    contactPhone: '',
    googleProfile: '',
    website: '',
    guideNeeded: 'no',
    managerName: '',
    managerEmail: '',
    studentTicketPrice: '350',
    teacherTicketPrice: '250',
    minGroupSize: '25',
    maxGroupSize: '1200',
  });

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const res = await api.listAllDestinations();
      if (res.success) setDestinations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  // Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab.toUpperCase());
    }
  }, [searchParams]);

  // Handle Escape key to close modals and prevent background scrolling
  useEffect(() => {
    if (!selectedDestination && !decisionModal.open && !lightboxImage && !onboardingOpen && !dateEditModal.open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dateEditModal.open) {
          setDateEditModal((prev) => ({ ...prev, open: false }));
        } else if (lightboxImage) {
          setLightboxImage(null);
        } else if (decisionModal.open) {
          setDecisionModal({ open: false, type: null, notes: '', destId: '', destName: '' });
        } else if (onboardingOpen) {
          setOnboardingOpen(false);
        } else if (selectedDestination) {
          setSelectedDestination(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDestination, decisionModal.open, lightboxImage, onboardingOpen, dateEditModal.open]);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.adminOnboardDestination({
        ...formData,
        guideAvailable: formData.guideNeeded === 'yes',
      });
      if (res.success) {
        setOnboardingOpen(false);
        showToast('Destination successfully onboarded and created!');
        fetchDestinations();
      }
    } catch (err: any) {
      showToast(err.message || 'Onboarding failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dest: any) => {
    const newStatus = dest.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';
    try {
      await api.updateDestinationStatus(dest.id, newStatus, newStatus === 'PUBLISHED');
      showToast(`Venue status updated to ${newStatus}`);
      await fetchDestinations();
      if (selectedDestination && selectedDestination.id === dest.id) {
        const detailRes = await api.getAdminDestinationDetail(dest.id);
        if (detailRes.success) setSelectedDestination(detailRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const executeProposalDecision = async () => {
    if (!decisionModal.destId || !decisionModal.type) return;
    setActionLoading(true);
    try {
      const res = await api.processProposalDecision(
        decisionModal.destId,
        decisionModal.type,
        decisionModal.notes
      );
      if (res.success) {
        showToast(
          decisionModal.type === 'APPROVED'
            ? 'Destination successfully approved and published!'
            : decisionModal.type === 'CHANGES_REQUESTED'
            ? 'Revision request sent to destination manager.'
            : 'Destination proposal rejected.'
        );
        const targetId = decisionModal.destId;
        setDecisionModal({ open: false, type: null, notes: '', destId: '', destName: '' });
        await fetchDestinations();
        if (selectedDestination && selectedDestination.id === targetId) {
          const detailRes = await api.getAdminDestinationDetail(targetId);
          if (detailRes.success) setSelectedDestination(detailRes.data);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to process proposal decision', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDateEdit = (dayData: AvailabilityDay) => {
    setDateEditModal({
      open: true,
      dayData,
      status: (dayData.status as AvailabilityStatus) || 'AVAILABLE',
      dailyCapacity: dayData.capacity || selectedDestination?.maxGroupSize || 800,
      notes: dayData.notes || '',
      saving: false,
    });
  };

  const handleSaveDateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestination || !dateEditModal.dayData) return;
    setDateEditModal((prev) => ({ ...prev, saving: true }));
    try {
      const res = await api.updateAdminDestinationAvailability(selectedDestination.id, {
        date: dateEditModal.dayData.date,
        status: dateEditModal.status,
        dailyCapacity: dateEditModal.dailyCapacity,
        notes: dateEditModal.notes,
      });
      if (res.success) {
        showToast(`Availability updated for ${dateEditModal.dayData.date}!`);
        setDateEditModal((prev) => ({ ...prev, open: false, saving: false }));
        setCalendarRefreshKey((k) => k + 1);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update calendar availability', 'error');
      setDateEditModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleInspectDestination = async (dest: any, focusCalendar: boolean = false) => {
    setDetailLoading(true);
    setSelectedDestination(dest);
    try {
      const res = await api.getAdminDestinationDetail(dest.id);
      if (res.success) {
        setSelectedDestination(res.data);
      }
    } catch (err) {
      console.error('Failed to load full destination detail:', err);
    } finally {
      setDetailLoading(false);
      if (focusCalendar) {
        setTimeout(() => {
          const calElem = document.getElementById('destination-calendar-section');
          if (calElem) calElem.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
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

  const displayOrEmpty = (val: any, fallback = 'Not provided') => {
    if (val === undefined || val === null || String(val).trim() === '') return fallback;
    return val;
  };

  // Counts
  const pendingCount = destinations.filter((d) => d.status === 'PENDING_APPROVAL').length;
  const publishedCount = destinations.filter((d) => d.status === 'PUBLISHED').length;
  const draftCount = destinations.filter((d) => d.status === 'DRAFT').length;
  const archivedCount = destinations.filter((d) => d.status === 'ARCHIVED' || d.status === 'PAUSED').length;

  // Filtered destinations
  const filteredDestinations = useMemo(() => {
    return destinations.filter((d) => {
      // Tab filter
      if (activeTab === 'PENDING' && d.status !== 'PENDING_APPROVAL') return false;
      if (activeTab === 'PUBLISHED' && d.status !== 'PUBLISHED') return false;
      if (activeTab === 'DRAFT' && d.status !== 'DRAFT') return false;
      if (activeTab === 'ARCHIVED' && d.status !== 'ARCHIVED' && d.status !== 'PAUSED') return false;

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = d.name?.toLowerCase().includes(q);
        const matchesBusiness = d.businessName?.toLowerCase().includes(q);
        const matchesCity = d.city?.toLowerCase().includes(q);
        const matchesState = d.state?.toLowerCase().includes(q);
        const matchesManager = d.managerName?.toLowerCase().includes(q);
        const matchesEmail = d.officialEmail?.toLowerCase().includes(q);
        const matchesId = d.id?.toLowerCase().includes(q);
        return (
          matchesName ||
          matchesBusiness ||
          matchesCity ||
          matchesState ||
          matchesManager ||
          matchesEmail ||
          matchesId
        );
      }
      return true;
    });
  }, [destinations, activeTab, searchTerm]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredDestinations.length / itemsPerPage));
  const paginatedDestinations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDestinations.slice(start, start + itemsPerPage);
  }, [filteredDestinations, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
      DRAFT: 'bg-blue-50 text-blue-700 border-blue-200',
      PAUSED: 'bg-slate-100 text-slate-600 border-slate-200',
      ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border inline-block ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {status === 'PENDING_APPROVAL' ? 'Pending Review' : status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold transition-all ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ───── Page Header ───── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/80">
                <Landmark className="w-3.5 h-3.5" />
                Destination Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Destination Directory & Proposals
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
              Review venue proposals, manage publication status, audit media galleries, and coordinate onboarding.
            </p>
          </div>

          <button
            onClick={() => setOnboardingOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            Onboard New Destination
          </button>
        </div>

        {/* ───── Stats Cards ───── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: 'ALL', label: 'Total Venues', count: destinations.length, color: 'slate' },
            { key: 'PENDING', label: 'Pending Review', count: pendingCount, color: 'amber' },
            { key: 'PUBLISHED', label: 'Published', count: publishedCount, color: 'emerald' },
            { key: 'DRAFT', label: 'Drafts', count: draftCount, color: 'blue' },
            { key: 'ARCHIVED', label: 'Paused / Archived', count: archivedCount, color: 'slate' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                tab.key === 'ALL' ? setSearchParams({}) : setSearchParams({ tab: tab.key.toLowerCase() });
              }}
              className={`p-4 rounded-2xl border transition-all text-left ${
                activeTab === tab.key
                  ? tab.color === 'amber'
                    ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-500/20'
                    : tab.color === 'emerald'
                    ? 'bg-emerald-50 border-emerald-300 shadow-md ring-2 ring-emerald-500/20'
                    : tab.color === 'blue'
                    ? 'bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-300 shadow-md ring-2 ring-slate-900/10'
                  : 'bg-white/60 border-slate-200 hover:bg-white hover:shadow-sm'
              }`}
            >
              <div className={`text-2xl font-extrabold ${
                tab.color === 'amber' ? 'text-amber-700' : tab.color === 'emerald' ? 'text-emerald-700' : tab.color === 'blue' ? 'text-blue-700' : 'text-slate-900'
              }`}>
                {tab.count}
              </div>
              <div className={`text-xs font-semibold mt-0.5 ${
                tab.color === 'amber' ? 'text-amber-600' : tab.color === 'emerald' ? 'text-emerald-600' : tab.color === 'blue' ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {tab.label}
              </div>
            </button>
          ))}
        </div>

        {/* ───── Search Bar ───── */}
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by venue name, city, manager, or email..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 shadow-sm placeholder:text-slate-400 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ───── Destinations Table ───── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              {activeTab === 'PENDING' ? 'Proposals Awaiting Review' : 'Destination Directory'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {filteredDestinations.length === 0
                ? '0 results'
                : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredDestinations.length)} of ${filteredDestinations.length}`}
            </span>
          </div>

          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
              <span className="text-sm text-slate-500">Loading destinations...</span>
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="p-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Landmark className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-800 text-sm">No destinations found</p>
              <p className="text-slate-400 text-xs">
                {searchTerm ? 'Try adjusting your search query or switching tabs.' : 'No destinations in this category yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Venue</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5">Location</th>
                    <th className="py-3.5 px-5">Manager</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Verified</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDestinations.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                      onClick={() => handleInspectDestination(d)}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {d.name?.charAt(0)?.toUpperCase() || 'D'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              {d.name}
                              {d.images && d.images.length > 0 && (
                                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                  <ImageIcon className="w-3 h-3 text-emerald-500" /> {d.images.length}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{d.businessName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {d.category}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-sm font-medium text-slate-800">{d.city}, {d.state}</div>
                        <div className="text-xs text-slate-400">{d.pincode || '—'}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-sm font-medium text-slate-800">{d.managerName}</div>
                        <div className="text-xs text-slate-400 break-all">{d.officialEmail}</div>
                      </td>
                      <td className="py-4 px-5">
                        {statusBadge(d.status)}
                      </td>
                      <td className="py-4 px-5">
                        {d.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold">Pending</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectDestination(d);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                              d.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {d.status === 'PENDING_APPROVAL' ? 'Review' : 'Inspect'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectDestination(d, true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-blue-200"
                            title="Manage Live Availability Calendar"
                          >
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            Calendar
                          </button>
                          {d.status === 'PENDING_APPROVAL' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDecisionModal({
                                  open: true,
                                  type: 'APPROVED',
                                  notes: '',
                                  destId: d.id,
                                  destName: d.name,
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(d);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                d.status === 'PUBLISHED'
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {d.status === 'PUBLISHED' ? 'Pause' : 'Publish'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ONBOARD MODAL
        ═══════════════════════════════════════════════════════════════ */}
        {onboardingOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Onboard Destination</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Create venue in database and provision manager login.
                  </p>
                </div>
                <button onClick={() => setOnboardingOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleOnboardSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Destination Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Wonderla Adventure Park"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Business Entity *</label>
                    <input type="text" required value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="e.g. Wonderla Holidays Ltd."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Category *</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                      <option value="Amusement & Waterpark">Amusement & Waterpark</option>
                      <option value="Science Centre & Planetarium">Science Centre & Planetarium</option>
                      <option value="Museum & Heritage">Museum & Heritage</option>
                      <option value="Wildlife Park & Zoo">Wildlife Park & Zoo</option>
                      <option value="Adventure Camp">Adventure Camp</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Street Address</label>
                    <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. 28th Km, Mysore Road"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">City *</label>
                    <input type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Ludhiana"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">State *</label>
                    <input type="text" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="Punjab"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Venue Email *</label>
                    <input type="email" required value={formData.officialEmail} onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })} placeholder="bookings@venue.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Phone *</label>
                    <input type="text" required value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} placeholder="+91 98765 00000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Google Business Profile / Maps Link *</label>
                    <input type="url" required value={formData.googleProfile} onChange={(e) => setFormData({ ...formData, googleProfile: e.target.value })} placeholder="https://maps.google.com/..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Official Website (Optional)</label>
                    <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://venue.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Manager Name *</label>
                    <input type="text" required value={formData.managerName} onChange={(e) => setFormData({ ...formData, managerName: e.target.value })} placeholder="Park Director"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Manager Login Email *</label>
                    <input type="email" required value={formData.managerEmail} onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })} placeholder="manager@venue.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Ticket per Student ₹</label>
                    <input type="number" value={formData.studentTicketPrice} onChange={(e) => setFormData({ ...formData, studentTicketPrice: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Ticket per Teacher ₹</label>
                    <input type="number" value={formData.teacherTicketPrice} onChange={(e) => setFormData({ ...formData, teacherTicketPrice: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 text-sm mb-1.5">Guide Needed / Provided?</label>
                    <select value={formData.guideNeeded} onChange={(e) => setFormData({ ...formData, guideNeeded: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none">
                      <option value="no">No (Self-guided / Venue Staff)</option>
                      <option value="yes">Yes (Dedicated Tour Guide Included)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setOnboardingOpen(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 font-semibold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md transition-all">
                    {saving ? 'Onboarding...' : 'Onboard & Publish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            INSPECTION & REVIEW MODAL
        ═══════════════════════════════════════════════════════════════ */}
        {selectedDestination && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !actionLoading) setSelectedDestination(null);
            }}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden w-full"
              style={{ width: 'min(1080px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 48px)' }}
            >
              {/* ── Modal Header ── */}
              <div className="shrink-0 bg-gradient-to-r from-emerald-50/50 to-white border-b border-slate-200/80 px-6 py-5 sm:px-8 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                        {selectedDestination.category}
                      </span>
                      {statusBadge(selectedDestination.status)}
                      {selectedDestination.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Unverified
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
                      {selectedDestination.name}
                    </h2>
                    <div className="text-sm text-slate-500">
                      Legal Entity: <span className="font-semibold text-slate-700">{displayOrEmpty(selectedDestination.businessName)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDestination(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable Body ── */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 space-y-8 min-h-0">

                {/* ID & Public Link Bar */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-slate-400 font-semibold uppercase text-xs shrink-0">Destination ID:</span>
                    <code className="bg-white px-3 py-1 rounded-lg border border-slate-200 font-mono text-xs text-slate-900 break-all select-all">
                      {selectedDestination.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedDestination.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white transition-colors"
                      title="Copy Destination ID"
                    >
                      {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
                    <span className="text-slate-400 font-semibold uppercase text-xs">Public Link:</span>
                    <a
                      href={`/destinations/${selectedDestination.slug || selectedDestination.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                      title="Open public destination page"
                    >
                      <span>/{selectedDestination.slug}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  </div>
                </div>

                {/* ── Manager & Business Details ── */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    Manager & Business Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <span className="text-xs text-slate-400 font-medium uppercase block">Manager</span>
                      <div className="font-bold text-slate-900 text-base">{displayOrEmpty(selectedDestination.managerName)}</div>
                      <div className="text-sm text-slate-600 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="break-all">{displayOrEmpty(selectedDestination.officialEmail)}</span>
                      </div>
                      <div className="text-sm text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {displayOrEmpty(selectedDestination.contactPhone)}
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <span className="text-xs text-slate-400 font-medium uppercase block">Address</span>
                      <div className="text-sm text-slate-800 leading-relaxed">{displayOrEmpty(selectedDestination.address)}</div>
                      <div className="font-bold text-slate-900">
                        {displayOrEmpty(selectedDestination.city)}, {displayOrEmpty(selectedDestination.state)} — {displayOrEmpty(selectedDestination.pincode)}
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <span className="text-xs text-slate-400 font-medium uppercase block">Corporate & Digital</span>
                      <div>
                        <span className="text-xs text-slate-400 block">Registered Business</span>
                        <div className="font-bold text-slate-900 mt-0.5">{displayOrEmpty(selectedDestination.businessName)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Google Business Profile / Maps</span>
                        {selectedDestination.googleProfile ? (
                          <a href={selectedDestination.googleProfile} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-semibold break-all text-sm mt-0.5 inline-block">
                            {selectedDestination.googleProfile}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-sm">Not provided</span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Website</span>
                        {selectedDestination.website ? (
                          <a href={selectedDestination.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold break-all text-sm mt-0.5 inline-block">
                            {selectedDestination.website}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-sm">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Description & Policies ── */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Venue Description & Policies
                  </h3>

                  <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div>
                      <span className="text-xs text-slate-400 font-medium uppercase block mb-1.5">Full Overview</span>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {displayOrEmpty(selectedDestination.description, 'No detailed description provided.')}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <span className="text-xs text-slate-400 font-medium uppercase block mb-1">Safety Info</span>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {displayOrEmpty(selectedDestination.safetyInfo, 'Standard safety guidelines apply.')}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium uppercase block mb-1">Institute Policies</span>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {displayOrEmpty(selectedDestination.schoolPolicies, 'Dedicated bag drop and group assembly zone.')}
                        </p>
                      </div>
                    </div>

                    {/* Facilities Tags */}
                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-xs text-slate-400 font-medium uppercase block mb-2">
                        Facilities ({selectedDestination.facilities?.length || 0})
                      </span>
                      {!selectedDestination.facilities || selectedDestination.facilities.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Standard amenities.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedDestination.facilities.map((f: any) => (
                            <span key={f.id} className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 font-medium text-xs shadow-sm">
                              {f.name || f.facilityName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Operating Info & Capacity ── */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Operating Hours & Capacity
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-400 font-medium uppercase block">Hours</span>
                      <div className="font-extrabold text-slate-900 text-lg mt-1">
                        {displayOrEmpty(selectedDestination.openingTime, '09:30')} – {displayOrEmpty(selectedDestination.closingTime, '18:00')}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Institute excursion window</p>
                    </div>
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-400 font-medium uppercase block">Operating Days</span>
                      <div className="font-semibold text-slate-900 text-sm mt-1 leading-relaxed">
                        {displayOrEmpty(selectedDestination.weeklyOperatingDays, 'Mon–Sun')}
                      </div>
                    </div>
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-400 font-medium uppercase block">Group Size & Guide</span>
                      <div className="font-bold text-slate-900 text-base mt-1">
                        {selectedDestination.minGroupSize || 20}–{selectedDestination.maxGroupSize || 1500} students
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Guide: <strong className={selectedDestination.guideAvailable ? 'text-emerald-700' : 'text-slate-700'}>{selectedDestination.guideAvailable ? 'Yes (Provided)' : 'No (Self-guided)'}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Live Calendar & Date Availability Manager ── */}
                <div id="destination-calendar-section" className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        Live Availability Calendar & Operational Dates
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Click on any date to open, close, mark holiday/blackout, or customize student capacity for this venue.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                      Click any date to edit
                    </span>
                  </div>

                  <AvailabilityCalendar
                    key={`${selectedDestination.id}-${calendarRefreshKey}`}
                    destinationId={selectedDestination.id}
                    isEditable={true}
                    onEditDate={handleOpenDateEdit}
                  />
                </div>

                {/* ── Ticket Pricing ── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-emerald-600" />
                      Ticket Pricing ({selectedDestination.ticketTypes?.length || 0})
                    </h3>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">INR ₹</span>
                  </div>

                  {!selectedDestination.ticketTypes || selectedDestination.ticketTypes.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-2xl text-center text-sm text-slate-400 border border-slate-100">
                      Standard rates: ₹350/student, ₹250/staff
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedDestination.ticketTypes.map((t: any) => (
                        <div key={t.id} className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-900 text-base block">{t.name}</span>
                              <span className="text-xs text-slate-500 uppercase font-semibold">
                                {t.category || 'General'} {t.ageGroup ? `• ${t.ageGroup}` : ''}
                              </span>
                            </div>
                            <span className="font-mono font-extrabold text-emerald-700 text-lg">₹{t.basePrice}</span>
                          </div>
                          <div className="text-sm text-slate-600 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span>Quantity Range</span>
                            <span className="font-semibold">{t.minQuantity || 1} – {t.maxQuantity || '∞'}</span>
                          </div>
                          {(t.complimentaryStaffRatio || t.complimentaryTeacherRatio) && (
                            <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg font-semibold">
                              1 free staff per {t.complimentaryStaffRatio || t.complimentaryTeacherRatio} students
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Policies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-slate-200">
                      <span className="font-semibold text-slate-700 text-sm block mb-1">Cancellation Policy</span>
                      <p className="text-sm text-slate-600">
                        {displayOrEmpty(selectedDestination.cancellationPolicy, 'Free cancellation up to 48 hours before visit.')}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-200">
                      <span className="font-semibold text-slate-700 text-sm block mb-1">Refund Policy</span>
                      <p className="text-sm text-slate-600">
                        {displayOrEmpty(selectedDestination.refundPolicy, 'Full reschedule or refund for weather closures.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Media Gallery ── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      Media Gallery ({selectedDestination.images?.length || 0})
                    </h3>
                    <span className="text-xs text-slate-400">Click to enlarge</span>
                  </div>

                  {!selectedDestination.images || selectedDestination.images.length === 0 ? (
                    <div className="p-10 bg-slate-50 rounded-2xl text-center text-sm text-slate-400 space-y-2 border border-slate-100">
                      <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">No gallery photos uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedDestination.images.map((img: any) => (
                        <div
                          key={img.id}
                          onClick={() => setLightboxImage(img)}
                          className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video group shadow-sm bg-slate-100 cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all"
                        >
                          <img
                            src={img.url}
                            alt={img.caption || 'Venue photo'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/brand/logo.png'; }}
                          />
                          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-colors flex items-center justify-center">
                            <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                          </div>
                          {img.isCover && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow">
                              Cover
                            </span>
                          )}
                          {img.caption && (
                            <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1.5 text-xs text-white truncate px-2.5">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Audit Timeline ── */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    Submission & Audit Timeline
                  </h3>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                        1
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">Proposal Submitted</span>
                          <span className="text-xs text-slate-400">{formatDateTime(selectedDestination.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">
                          Submitted by {selectedDestination.managerName || 'Manager'}.
                        </p>
                      </div>
                    </div>

                    {selectedDestination.auditLogs && selectedDestination.auditLogs.length > 0 ? (
                      selectedDestination.auditLogs.map((log: any, idx: number) => (
                        <div key={log.id} className="flex gap-4 border-t border-slate-200/60 pt-4">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                            {idx + 2}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{log.action?.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-700 mt-0.5">{log.details}</p>
                            {log.user && (
                              <span className="text-xs text-slate-400 mt-1 block">
                                Reviewer: {log.user.name} ({log.user.role})
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border-t border-slate-200/60 pt-4 text-sm text-slate-500 italic">
                        No previous review decisions recorded.
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Bookings ── */}
                {selectedDestination.bookings && selectedDestination.bookings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Venue Bookings ({selectedDestination.bookings.length})
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">Ref</th>
                            <th className="py-3 px-4">Institute</th>
                            <th className="py-3 px-4">Visit Date</th>
                            <th className="py-3 px-4">Group Size</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDestination.bookings.map((b: any) => (
                            <tr key={b.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">#{b.bookingReference}</td>
                              <td className="py-3 px-4 font-medium text-slate-800">{b.school?.name}</td>
                              <td className="py-3 px-4 text-slate-600">{new Date(b.visitDate).toLocaleDateString()}</td>
                              <td className="py-3 px-4 font-bold">{b.totalGroupSize}</td>
                              <td className="py-3 px-4 font-mono font-bold">₹{(b.confirmedQuoteAmount || b.originalQuoteAmount || 0).toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Modal Footer ── */}
              <div className="shrink-0 bg-white border-t border-slate-200/90 px-6 py-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    onClick={() => setSelectedDestination(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    Status: <strong className="text-slate-800">{selectedDestination.status}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  {selectedDestination.status === 'PENDING_APPROVAL' ? (
                    <>
                      <button
                        onClick={() => setDecisionModal({ open: true, type: 'REJECTED', notes: '', destId: selectedDestination.id, destName: selectedDestination.name })}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200"
                      >
                        <Ban className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => setDecisionModal({ open: true, type: 'CHANGES_REQUESTED', notes: '', destId: selectedDestination.id, destName: selectedDestination.name })}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1.5 border border-amber-300"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Request Changes
                      </button>
                      <button
                        onClick={() => setDecisionModal({ open: true, type: 'APPROVED', notes: '', destId: selectedDestination.id, destName: selectedDestination.name })}
                        disabled={actionLoading}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        <FileCheck className="w-4 h-4" /> Approve
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(selectedDestination)}
                      disabled={actionLoading}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        selectedDestination.status === 'PUBLISHED'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {selectedDestination.status === 'PUBLISHED' ? 'Pause Listing' : 'Publish Listing'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            DECISION CONFIRMATION MODAL
        ═══════════════════════════════════════════════════════════════ */}
        {decisionModal.open && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  {decisionModal.type === 'APPROVED' ? (
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                  ) : decisionModal.type === 'CHANGES_REQUESTED' ? (
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Ban className="w-5 h-5 text-rose-600" />
                  )}
                  {decisionModal.type === 'APPROVED'
                    ? 'Confirm Approval'
                    : decisionModal.type === 'CHANGES_REQUESTED'
                    ? 'Request Revisions'
                    : 'Reject Proposal'}
                </h3>
                <button
                  onClick={() => setDecisionModal({ open: false, type: null, notes: '', destId: '', destName: '' })}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {decisionModal.type === 'APPROVED'
                  ? `Approve "${decisionModal.destName}"? This will verify and publish the venue.`
                  : decisionModal.type === 'CHANGES_REQUESTED'
                  ? 'Specify what needs adjustment. Status will move to DRAFT.'
                  : `Rejecting "${decisionModal.destName}" will archive the proposal permanently.`}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {decisionModal.type === 'APPROVED' ? 'Approval Note (Optional)' : 'Review Notes *'}
                </label>
                <textarea
                  rows={4}
                  required={decisionModal.type !== 'APPROVED'}
                  value={decisionModal.notes}
                  onChange={(e) => setDecisionModal({ ...decisionModal, notes: e.target.value })}
                  placeholder={
                    decisionModal.type === 'APPROVED'
                      ? 'Verified credentials and safety standards...'
                      : decisionModal.type === 'CHANGES_REQUESTED'
                      ? 'Please upload clear photos and verify ticket rates...'
                      : 'Unable to verify operation permit...'
                  }
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDecisionModal({ open: false, type: null, notes: '', destId: '', destName: '' })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || (decisionModal.type !== 'APPROVED' && !decisionModal.notes.trim())}
                  onClick={executeProposalDecision}
                  className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                    decisionModal.type === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : decisionModal.type === 'CHANGES_REQUESTED'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  } disabled:opacity-50`}
                >
                  {actionLoading
                    ? 'Processing...'
                    : decisionModal.type === 'APPROVED'
                    ? 'Confirm & Publish'
                    : decisionModal.type === 'CHANGES_REQUESTED'
                    ? 'Send Revision Request'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            LIGHTBOX
        ═══════════════════════════════════════════════════════════════ */}
        {lightboxImage && (
          <div
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[80] flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center gap-3 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-black max-h-[80vh] flex items-center justify-center">
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.caption || 'Venue photo'}
                  className="max-h-[75vh] w-auto max-w-full object-contain"
                />
              </div>
              {(lightboxImage.caption || lightboxImage.isCover) && (
                <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-xl text-white text-sm flex items-center gap-2 border border-slate-700/60">
                  {lightboxImage.isCover && (
                    <span className="px-2 py-0.5 rounded bg-emerald-600 font-bold text-xs">Cover</span>
                  )}
                  <span>{lightboxImage.caption || 'Gallery photo'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            DATE AVAILABILITY & CAPACITY EDIT MODAL
        ═══════════════════════════════════════════════════════════════ */}
        {dateEditModal.open && dateEditModal.dayData && selectedDestination && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Edit Date Availability
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {dateEditModal.dayData.date} • {selectedDestination.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDateEditModal((prev) => ({ ...prev, open: false }))}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDateAvailability} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Availability Status *</label>
                  <select
                    value={dateEditModal.status}
                    onChange={(e) =>
                      setDateEditModal((prev) => ({
                        ...prev,
                        status: e.target.value as AvailabilityStatus,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 text-sm"
                  >
                    <option value="AVAILABLE">Available (Open for Institute Group Bookings)</option>
                    <option value="LIMITED">Limited Capacity (Few Slots Left)</option>
                    <option value="CLOSED">Closed (Venue Closed for Visits)</option>
                    <option value="BLACKOUT">Blackout / Maintenance / Public Holiday</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Marking <strong>Available</strong> allows schools and institutes to choose this date during booking.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Daily Visitor / Student Capacity</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={dateEditModal.dailyCapacity}
                    onChange={(e) =>
                      setDateEditModal((prev) => ({
                        ...prev,
                        dailyCapacity: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 text-sm"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Current booked: <strong>{dateEditModal.dayData.bookedCount || 0}</strong> students. Remaining capacity updates automatically.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Operational Note / Holiday Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. State Holiday, Special educational tour day, Waterpark servicing"
                    value={dateEditModal.notes}
                    onChange={(e) =>
                      setDateEditModal((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDateEditModal((prev) => ({ ...prev, open: false }))}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dateEditModal.saving}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {dateEditModal.saving ? 'Updating...' : 'Save Availability'}
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
