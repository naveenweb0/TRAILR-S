import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import {
  School as SchoolIcon,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  X,
  Eye,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Activity,
  History,
  RotateCcw,
  Ban,
  FileCheck,
  MessageSquare,
  Building,
  GraduationCap,
  Globe,
  Hash,
  ArrowRight,
} from 'lucide-react';

export const AdminSchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Verification Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    status: 'VERIFIED' | 'PENDING' | 'REJECTED' | null;
    notes: string;
  }>({
    open: false,
    status: null,
    notes: '',
  });

  const closeDecisionModal = () => setDecisionModal({ open: false, status: null, notes: '' });

  const openDecisionModal = (
    school: any,
    status: 'VERIFIED' | 'PENDING' | 'REJECTED',
    notes = ''
  ) => {
    setSelectedSchool(school);
    setDecisionModal({ open: true, status, notes });
  };

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await api.listAllSchools();
      if (res.success) setSchools(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (!selectedSchool && !decisionModal.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (decisionModal.open) closeDecisionModal();
        else setSelectedSchool(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSchool, decisionModal.open]);

  const handleInspectSchool = async (school: any) => {
    setDetailLoading(true);
    setSelectedSchool(school);
    try {
      const res = await api.getAdminSchoolDetail(school.id);
      if (res.success) {
        setSelectedSchool(res.data);
      }
    } catch (err) {
      console.error('Failed to load full school details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateVerification = async (
    schoolId: string,
    status: 'VERIFIED' | 'PENDING' | 'REJECTED',
    notes: string
  ) => {
    setActionLoading(true);
    try {
      await api.updateSchoolVerification(schoolId, status, notes);
      setDecisionModal({ open: false, status: null, notes: '' });
      await fetchSchools();
      if (selectedSchool && selectedSchool.id === schoolId) {
        const detailRes = await api.getAdminSchoolDetail(schoolId);
        if (detailRes.success) setSelectedSchool(detailRes.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update institute verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      await api.updateUserStatus(userId, !currentStatus);
      if (selectedSchool) {
        const detailRes = await api.getAdminSchoolDetail(selectedSchool.id);
        if (detailRes.success) setSelectedSchool(detailRes.data);
      }
      fetchSchools();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
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
  const verifiedCount = schools.filter((s) => s.verificationStatus === 'VERIFIED').length;
  const pendingCount = schools.filter((s) => s.verificationStatus === 'PENDING').length;
  const rejectedCount = schools.filter((s) => s.verificationStatus === 'REJECTED').length;

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      // Tab filter
      if (activeTab === 'VERIFIED' && s.verificationStatus !== 'VERIFIED') return false;
      if (activeTab === 'PENDING' && s.verificationStatus !== 'PENDING') return false;
      if (activeTab === 'REJECTED' && s.verificationStatus !== 'REJECTED') return false;

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesCity = s.city?.toLowerCase().includes(q);
        const matchesState = s.state?.toLowerCase().includes(q);
        const matchesBoard = s.board?.toLowerCase().includes(q);
        const matchesAffiliation = s.affiliationNumber?.toLowerCase().includes(q);
        const matchesPerson = s.contactPerson?.toLowerCase().includes(q);
        const matchesEmail = s.officialEmail?.toLowerCase().includes(q);
        const matchesId = s.id?.toLowerCase().includes(q);
        return (
          matchesName ||
          matchesCity ||
          matchesState ||
          matchesBoard ||
          matchesAffiliation ||
          matchesPerson ||
          matchesEmail ||
          matchesId
        );
      }
      return true;
    });
  }, [schools, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / itemsPerPage));
  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchools.slice(start, start + itemsPerPage);
  }, [filteredSchools, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const verificationBadge = (status: string) => {
    if (status === 'VERIFIED')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </span>
      );
    if (status === 'PENDING')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
          <Activity className="w-3.5 h-3.5" /> Pending
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ───── Page Header ───── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-lg border border-blue-200/80">
                <SchoolIcon className="w-3.5 h-3.5" />
                Institute Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Registered Institutions
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
              Inspect institute profiles, approve educational affiliations, audit coordinators, and manage platform permissions.
            </p>
          </div>
        </div>

        {/* ───── Stats Cards ───── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`p-4 rounded-2xl border transition-all text-left ${
              activeTab === 'ALL'
                ? 'bg-white border-slate-300 shadow-md ring-2 ring-slate-900/10'
                : 'bg-white/60 border-slate-200 hover:bg-white hover:shadow-sm'
            }`}
          >
            <div className="text-2xl font-extrabold text-slate-900">{schools.length}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Total Institutes</div>
          </button>
          <button
            onClick={() => setActiveTab('VERIFIED')}
            className={`p-4 rounded-2xl border transition-all text-left ${
              activeTab === 'VERIFIED'
                ? 'bg-emerald-50 border-emerald-300 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white/60 border-slate-200 hover:bg-emerald-50/50 hover:shadow-sm'
            }`}
          >
            <div className="text-2xl font-extrabold text-emerald-700">{verifiedCount}</div>
            <div className="text-xs font-semibold text-emerald-600 mt-0.5">Approved</div>
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`p-4 rounded-2xl border transition-all text-left ${
              activeTab === 'PENDING'
                ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-500/20'
                : 'bg-white/60 border-slate-200 hover:bg-amber-50/50 hover:shadow-sm'
            }`}
          >
            <div className="text-2xl font-extrabold text-amber-700">{pendingCount}</div>
            <div className="text-xs font-semibold text-amber-600 mt-0.5">Pending Review</div>
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`p-4 rounded-2xl border transition-all text-left ${
              activeTab === 'REJECTED'
                ? 'bg-rose-50 border-rose-300 shadow-md ring-2 ring-rose-500/20'
                : 'bg-white/60 border-slate-200 hover:bg-rose-50/50 hover:shadow-sm'
            }`}
          >
            <div className="text-2xl font-extrabold text-rose-700">{rejectedCount}</div>
            <div className="text-xs font-semibold text-rose-600 mt-0.5">Rejected</div>
          </button>
        </div>

        {/* ───── Search Bar ───── */}
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by institute name, city, board, coordinator, or email..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-300 shadow-sm placeholder:text-slate-400 transition-all"
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

        {/* ───── Schools Table ───── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <SchoolIcon className="w-4 h-4 text-blue-600" />
              <span>Institution Directory</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {filteredSchools.length === 0
                ? '0 results'
                : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredSchools.length)} of ${filteredSchools.length}`}
            </span>
          </div>

          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
              <span className="text-sm text-slate-500">Loading institutions...</span>
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="p-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <SchoolIcon className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-800 text-sm">No institutes found</p>
              <p className="text-slate-400 text-xs">
                {searchTerm ? 'Try adjusting your search query or switching tabs.' : 'No institutions in this category yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Institution</th>
                    <th className="py-3.5 px-5">Board / Type</th>
                    <th className="py-3.5 px-5">Location</th>
                    <th className="py-3.5 px-5">Contact</th>
                    <th className="py-3.5 px-5">Bookings</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSchools.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      onClick={() => handleInspectSchool(s)}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {s.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                              {s.name}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {displayOrEmpty(s.officialEmail)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {displayOrEmpty(s.board, '—')}
                        </span>
                        <div className="text-xs text-slate-400 mt-1">{displayOrEmpty(s.schoolType, '—')}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-sm font-medium text-slate-800">{displayOrEmpty(s.city)}</div>
                        <div className="text-xs text-slate-400">{displayOrEmpty(s.state)} — {displayOrEmpty(s.pincode)}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-sm font-medium text-slate-800">{displayOrEmpty(s.contactPerson)}</div>
                        <div className="text-xs text-slate-400">{displayOrEmpty(s.contactPhone)}</div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          {s._count?.bookings ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {verificationBadge(s.verificationStatus)}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectSchool(s);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                          {s.verificationStatus !== 'VERIFIED' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDecisionModal(s, 'VERIFIED');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDecisionModal(s, 'PENDING');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors border border-amber-200"
                            >
                              Revoke
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
              <span className="text-xs text-slate-500 font-medium">
                Page {currentPage} of {totalPages}
              </span>
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
            SCHOOL INSPECTION MODAL
        ═══════════════════════════════════════════════════════════════ */}
        {selectedSchool && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedSchool(null);
            }}
          >
            <div className="bg-white rounded-3xl w-full max-h-[calc(100dvh-48px)] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              style={{ width: 'min(960px, calc(100vw - 32px))' }}
            >
              {/* ── Modal Header ── */}
              <div className="shrink-0 px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedSchool.logo && (
                        <img
                          src={selectedSchool.logo}
                          alt={`${displayOrEmpty(selectedSchool.name)} logo`}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        />
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                        {displayOrEmpty(selectedSchool.board)}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        {displayOrEmpty(selectedSchool.schoolType)}
                      </span>
                      {verificationBadge(selectedSchool.verificationStatus)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
                      {displayOrEmpty(selectedSchool.name)}
                    </h2>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {displayOrEmpty(selectedSchool.address)}, {displayOrEmpty(selectedSchool.city)}, {displayOrEmpty(selectedSchool.state)} — {displayOrEmpty(selectedSchool.pincode)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSchool(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable Body ── */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 space-y-8 min-h-0">

                {/* UUID & Booking Count Bar */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold uppercase text-xs">Institute UUID:</span>
                    <code className="bg-white px-3 py-1 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 select-all">
                      {selectedSchool.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedSchool.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
                      title="Copy Institute UUID"
                    >
                      {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-sm text-slate-600">
                    Total Bookings:{' '}
                    <strong className="text-indigo-700 font-mono">
                      {selectedSchool.bookings?.length ?? selectedSchool._count?.bookings ?? 0}
                    </strong>
                  </span>
                </div>

                {/* ── Timestamps Row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                    <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-blue-900 block">Registered</span>
                      <div className="text-sm text-slate-800 font-medium mt-0.5">
                        {formatDateTime(selectedSchool.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                    <Activity className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-blue-900 block">Last Profile Update</span>
                      <div className="text-sm text-slate-800 font-medium mt-0.5">
                        {formatDateTime(selectedSchool.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                    <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-blue-900 block">Last Staff Login</span>
                      <div className="text-sm text-slate-800 font-medium mt-0.5">
                        {formatDateTime(
                          selectedSchool.staff
                            ?.map((staff: any) => staff.user?.lastLoginAt)
                            .filter(Boolean)
                            .sort()
                            .at(-1)
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Institution Details Grid ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Coordinator */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Authorized Coordinator
                    </h4>
                    <div className="space-y-2.5 text-sm">
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Name & Designation</span>
                        <p className="font-semibold text-slate-900 mt-0.5">
                          {displayOrEmpty(selectedSchool.contactPerson)}
                          <span className="text-slate-500 font-normal"> — {displayOrEmpty(selectedSchool.designation, 'Coordinator')}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Email</span>
                        <p className="text-slate-800 mt-0.5 break-all">{displayOrEmpty(selectedSchool.officialEmail)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Phone</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{displayOrEmpty(selectedSchool.contactPhone)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Educational Details */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      Educational Profile
                    </h4>
                    <div className="space-y-2.5 text-sm">
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Board Affiliation</span>
                        <p className="font-semibold text-slate-900 mt-0.5">{displayOrEmpty(selectedSchool.board)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Institute Category</span>
                        <p className="text-slate-800 mt-0.5">{displayOrEmpty(selectedSchool.schoolType)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Student Strength</span>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">
                          {selectedSchool.approximateStrength == null
                            ? 'Not provided'
                            : `${selectedSchool.approximateStrength.toLocaleString()} students`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Premises & Digital */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      Premises & Digital
                    </h4>
                    <div className="space-y-2.5 text-sm">
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Full Address</span>
                        <p className="text-slate-800 mt-0.5">{displayOrEmpty(selectedSchool.address)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Website</span>
                        {selectedSchool.website ? (
                          <a href={selectedSchool.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-0.5 inline-block break-all font-semibold">
                            {selectedSchool.website}
                          </a>
                        ) : (
                          <p className="text-slate-400 italic mt-0.5">Not provided</p>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">GSTIN / GST Number</span>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">
                          {displayOrEmpty(selectedSchool.gstNumber, 'Not recorded')}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Verification Notes</span>
                        <p className="text-slate-600 italic text-xs mt-0.5">
                          {displayOrEmpty(selectedSchool.verificationNotes)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Excursion Bookings ── */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Excursion Bookings ({selectedSchool.bookings?.length || 0})
                  </h3>

                  {!selectedSchool.bookings || selectedSchool.bookings.length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-2xl text-center text-sm text-slate-400 border border-slate-100">
                      No excursion bookings submitted by this institute yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">Booking Ref</th>
                            <th className="py-3 px-4">Destination</th>
                            <th className="py-3 px-4">Visit Date</th>
                            <th className="py-3 px-4">Group Size</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedSchool.bookings.map((b: any) => (
                            <tr key={b.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                #{b.bookingReference}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800">
                                {b.destination?.name || 'Destination Venue'}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {new Date(b.visitDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {b.totalGroupSize} visitors
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                ₹{(b.confirmedQuoteAmount || b.originalQuoteAmount || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <StatusBadge type="booking" status={b.status} size="sm" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Staff Accounts ── */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Staff & Coordinator Accounts ({selectedSchool.staff?.length || 0})
                  </h3>

                  {!selectedSchool.staff || selectedSchool.staff.length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-2xl text-center text-sm text-slate-400 border border-slate-100">
                      No individual staff members linked yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedSchool.staff.map((st: any) => (
                        <div key={st.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {st.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                {displayOrEmpty(st.user?.name)}
                                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                  {st.role}
                                </span>
                                {!st.user?.isActive && (
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {displayOrEmpty(st.user?.email)}
                                {st.user?.phone ? ` • ${st.user.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          {st.user && (
                            <button
                              onClick={() => handleToggleUserStatus(st.user.id, st.user.isActive)}
                              disabled={actionLoading}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                                st.user.isActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {st.user.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Audit Timeline ── */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    Verification & Audit Timeline
                  </h3>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    {/* Initial Registration */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                        1
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">Institute Profile Registered</span>
                          <span className="text-xs text-slate-400">{formatDateTime(selectedSchool.createdAt)}</span>
                        </div>
                        <p className="text-slate-600 text-sm mt-0.5">
                          Account initiated by {displayOrEmpty(selectedSchool.contactPerson)}.
                        </p>
                      </div>
                    </div>

                    {/* Audit Logs */}
                    {selectedSchool.auditLogs && selectedSchool.auditLogs.length > 0 ? (
                      selectedSchool.auditLogs.map((log: any, idx: number) => (
                        <div key={log.id} className="flex gap-4 border-t border-slate-200/60 pt-4">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                            {idx + 2}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {log.action?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                            </div>
                            <p className="text-slate-700 text-sm mt-0.5">{log.details}</p>
                            {log.user && (
                              <span className="text-xs text-slate-400 mt-1 block">
                                Actor: {log.user.name} ({log.user.role})
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border-t border-slate-200/60 pt-4 text-sm text-slate-500 italic">
                        No audit interventions recorded yet.
                      </div>
                    )}

                    {/* Last Profile Update */}
                    {selectedSchool.updatedAt !== selectedSchool.createdAt && (
                      <div className="flex gap-4 border-t border-slate-200/60 pt-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm">
                          ✓
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">Last Profile Update</span>
                            <span className="text-xs text-slate-400">{formatDateTime(selectedSchool.updatedAt)}</span>
                          </div>
                          <p className="text-slate-600 text-sm mt-0.5">
                            Contact details or strength parameters updated.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Modal Footer ── */}
              <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 sm:px-8 border-t border-slate-100 bg-white">
                {selectedSchool.verificationStatus !== 'VERIFIED' ? (
                  <>
                    <button
                      onClick={() => openDecisionModal(selectedSchool, 'VERIFIED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5" /> Approve Institute
                    </button>
                    <button
                      onClick={() => openDecisionModal(selectedSchool, 'PENDING')}
                      className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors border border-amber-200 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Request Changes
                    </button>
                    <button
                      onClick={() => openDecisionModal(selectedSchool, 'REJECTED')}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors border border-rose-200 flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" /> Reject Institute
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openDecisionModal(selectedSchool, 'PENDING')}
                    className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors border border-amber-200"
                  >
                    Revoke Approval
                  </button>
                )}
                <button
                  onClick={() => setSelectedSchool(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            APPROVAL DECISION MODAL
        ═══════════════════════════════════════════════════════════════ */}
        {decisionModal.open && selectedSchool && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <MessageSquare
                    className={`w-5 h-5 ${
                      decisionModal.status === 'VERIFIED'
                        ? 'text-emerald-600'
                        : decisionModal.status === 'REJECTED'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  />
                  {decisionModal.status === 'VERIFIED'
                    ? 'Confirm Institute Approval'
                    : decisionModal.status === 'REJECTED'
                    ? 'Reject Institute Registration'
                    : 'Request Corrections / Revoke'}
                </h3>
                <button onClick={closeDecisionModal} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {decisionModal.status === 'VERIFIED'
                  ? 'Approving will mark this institution as APPROVED and record the audit log.'
                  : decisionModal.status === 'REJECTED'
                  ? 'Rejecting will flag this institute as REJECTED and notify institute administrators.'
                  : 'Specify the corrections required. Status will be set to PENDING.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {decisionModal.status === 'VERIFIED' ? 'Approval note (optional)' : decisionModal.status === 'REJECTED' ? 'Rejection reason *' : 'Requested changes *'}
                </label>
                <textarea
                  rows={4}
                  required={decisionModal.status !== 'VERIFIED'}
                  value={decisionModal.notes}
                  onChange={(e) => setDecisionModal({ ...decisionModal, notes: e.target.value })}
                  placeholder={
                    decisionModal.status === 'REJECTED'
                      ? 'Explain why this institute is being rejected...'
                      : 'Describe the information or corrections required...'
                  }
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-300 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeDecisionModal}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || (decisionModal.status !== 'VERIFIED' && !decisionModal.notes.trim())}
                  onClick={() =>
                    handleUpdateVerification(selectedSchool.id, decisionModal.status!, decisionModal.notes)
                  }
                  className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                    decisionModal.status === 'VERIFIED'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : decisionModal.status === 'REJECTED'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  } disabled:opacity-50`}
                >
                  {actionLoading
                    ? 'Updating...'
                    : decisionModal.status === 'VERIFIED'
                    ? 'Approve Institute'
                    : decisionModal.status === 'REJECTED'
                    ? 'Reject Institute'
                    : 'Request Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
