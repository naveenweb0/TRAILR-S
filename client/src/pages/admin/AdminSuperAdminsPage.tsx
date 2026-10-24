import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { SuperAdminUserItem, SuperAdminInvitationItem } from '../../types/index.js';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Mail,
  Copy,
  Check,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  CheckCircle2,
  Trash2,
  Info,
  Calendar,
  KeyRound,
  ArrowRight,
  Loader2,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { ScrollReveal } from '../../components/common/ScrollReveal.js';

export const AdminSuperAdminsPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [superAdmins, setSuperAdmins] = useState<SuperAdminUserItem[]>([]);
  const [invitations, setInvitations] = useState<SuperAdminInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'admins' | 'invitations'>('admins');
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<string>('ALL');

  // Add Super Admin Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [latestCreatedInvite, setLatestCreatedInvite] = useState<{ email: string; inviteUrl: string } | null>(null);

  // Revoke Modal
  const [userToRevoke, setUserToRevoke] = useState<SuperAdminUserItem | null>(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Cancel Invitation Modal
  const [inviteToCancel, setInviteToCancel] = useState<SuperAdminInvitationItem | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Copy Link State
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Platform Owner Governance
  const [isPlatformOwner, setIsPlatformOwner] = useState<boolean>(true);
  const [platformOwnerEmail, setPlatformOwnerEmail] = useState<string>('naveen.maan2006@gmail.com');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSuperAdmins();
      if (res.success && res.data) {
        setSuperAdmins(res.data.superAdmins || []);
        setInvitations(res.data.invitations || []);
        if (typeof res.data.isPlatformOwner === 'boolean') {
          setIsPlatformOwner(res.data.isPlatformOwner);
        }
        if (res.data.platformOwnerEmail) {
          setPlatformOwnerEmail(res.data.platformOwnerEmail);
        }
      }
    } catch (err: any) {
      console.error('Failed to load super administrators:', err);
      setError(err.message || 'Failed to retrieve administrator list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLink = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const fullUrl = `${window.location.origin}/admin/accept-invite?token=${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSubmitting(true);

    try {
      const res = await api.inviteSuperAdmin({
        email: inviteEmail.trim(),
        notes: inviteNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        setLatestCreatedInvite({
          email: res.data.email,
          inviteUrl: `${window.location.origin}${res.data.inviteUrl}`,
        });
        setSuccessMessage(`Super Admin invitation sent to ${res.data.email}.`);
        setInviteEmail('');
        setInviteNotes('');
        setIsInviteModalOpen(false);
        setActiveTab('invitations');
        await fetchData();
      }
    } catch (err: any) {
      console.error('Failed to create invitation:', err);
      setInviteError(err.message || 'Failed to create Super Admin invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!inviteToCancel) return;
    setCancelError(null);
    setCancelSubmitting(true);

    try {
      const res = await api.cancelSuperAdminInvitation(inviteToCancel.id);
      if (res.success) {
        setSuccessMessage(`Invitation for ${inviteToCancel.email} was successfully cancelled.`);
        setInviteToCancel(null);
        await fetchData();
      }
    } catch (err: any) {
      console.error('Failed to cancel invitation:', err);
      setCancelError(err.message || 'Failed to cancel invitation.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!userToRevoke) return;
    setRevokeError(null);
    setRevokeSubmitting(true);

    try {
      const res = await api.revokeSuperAdmin(userToRevoke.id);
      if (res.success) {
        setSuccessMessage(`Super Admin privileges for ${userToRevoke.email} were revoked.`);
        setUserToRevoke(null);
        await fetchData();
      }
    } catch (err: any) {
      console.error('Failed to revoke admin privileges:', err);
      setRevokeError(err.message || 'Failed to revoke administrator privileges.');
    } finally {
      setRevokeSubmitting(false);
    }
  };

  // Filtered lists
  const filteredAdmins = superAdmins.filter((adm) => {
    const q = search.toLowerCase();
    return adm.email.toLowerCase().includes(q) || adm.name.toLowerCase().includes(q);
  });

  const filteredInvitations = invitations.filter((inv) => {
    const q = search.toLowerCase();
    const matchesQuery = inv.email.toLowerCase().includes(q) || (inv.notes && inv.notes.toLowerCase().includes(q));
    const matchesStatus = invitationStatusFilter === 'ALL' || inv.status === invitationStatusFilter;
    return matchesQuery && matchesStatus;
  });

  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length;
  const activeAdminCount = superAdmins.filter((a) => a.isActive).length;

  return (
    <div className="min-h-screen bg-dots py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors">
                Command Centre
              </Link>
              <span className="text-slate-400 text-xs">/</span>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Super Admin Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
              Platform Administrators & Access Governance
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl">
              Grant and govern top-level Super Administrator credentials. Authorized accounts receive unrestricted visibility across all educational institutions, partner destinations, bookings, and fleet pipelines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {isPlatformOwner ? (
              <button
                onClick={() => {
                  setInviteError(null);
                  setIsInviteModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-purple-600/25 transition-all hover:-translate-y-0.5"
              >
                <UserPlus className="w-4 h-4 text-purple-200" />
                <span>Add Super Admin</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-2 shadow-xs">
                <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                <span>Invites managed by {platformOwnerEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Platform Owner Policy Notice when viewer is secondary admin */}
        {!isPlatformOwner && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Super Administrator Delegated Access</span>
              <span className="text-amber-800 text-xs leading-relaxed">
                You have authorized Super Admin access across the command centre. Per governance policy, creating new invitations and revoking administrators is restricted exclusively to primary platform ownership ({platformOwnerEmail}).
              </span>
            </div>
          </div>
        )}

        {/* Global Feedback Banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Latest Created Invite Card */}
        {latestCreatedInvite && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Super Admin Invitation Ready</span>
              </div>
              <button
                onClick={() => setLatestCreatedInvite(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-300">
              An invitation was generated for <span className="text-white font-bold">{latestCreatedInvite.email}</span>. When they click &ldquo;Continue with Google&rdquo; using this verified email, they will automatically be granted Super Admin access.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/10">
              <span className="text-xs font-mono text-purple-200 truncate flex-1 select-all px-2">
                {latestCreatedInvite.inviteUrl}
              </span>
              <button
                onClick={() => handleCopyLink(latestCreatedInvite.inviteUrl.split('token=')[1] || '')}
                className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedToken === (latestCreatedInvite.inviteUrl.split('token=')[1] || '') ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Invite Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Active Super Admins</span>
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{activeAdminCount}</div>
            <div className="text-[11px] text-purple-700 font-semibold">Authoritative control active</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Pending Invitations</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{pendingCount}</div>
            <div className="text-[11px] text-amber-700 font-semibold">Awaiting Google verification</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Accepted Invitations</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {invitations.filter((i) => i.status === 'ACCEPTED').length}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">Identity verified & linked</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Security Guarantee</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">Strict</div>
            <div className="text-[11px] text-slate-500 font-medium">Anti-lockout & audit logged</div>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('admins')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'admins' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Active Super Admins ({superAdmins.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('invitations')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'invitations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Invitations ({invitations.length})</span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email or name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {activeTab === 'invitations' && (
              <select
                value={invitationStatusFilter}
                onChange={(e) => setInvitationStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Active Super Admins Table */}
        {activeTab === 'admins' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Active Super Administrators</span>
              </h3>
              <span className="text-xs text-slate-400 font-semibold">{filteredAdmins.length} active records</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span>Loading administrator records...</span>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No Super Administrators matching query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Administrator</th>
                      <th className="py-3.5 px-4">Google Identity Status</th>
                      <th className="py-3.5 px-4">Role & Status</th>
                      <th className="py-3.5 px-4">Last Login</th>
                      <th className="py-3.5 px-4">Member Since</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredAdmins.map((admin) => {
                      const isSelf = currentUser?.id === admin.id || currentUser?.email.toLowerCase() === admin.email.toLowerCase();
                      const isSoleAdmin = activeAdminCount <= 1;
                      const isPlatformOwnerAccount = admin.email.toLowerCase() === platformOwnerEmail.toLowerCase();

                      return (
                        <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-sm shadow-inner">
                                {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                                  <span>{admin.name || 'Platform Administrator'}</span>
                                  {isPlatformOwnerAccount && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                      Owner
                                    </span>
                                  )}
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 font-mono text-[11px]">{admin.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {admin.neonAuthId ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Neon Auth Linked</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending Sign-In Link</span>
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 w-fit">
                                {admin.role}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {admin.isActive ? 'Active & Authorized' : 'Suspended'}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-slate-500 text-[11px]">
                            {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never logged in'}
                          </td>

                          <td className="py-4 px-4 text-slate-400 text-[11px]">
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-4 px-4 text-right">
                            {isPlatformOwnerAccount ? (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                Primary Owner
                              </span>
                            ) : isSelf ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic">
                                Protected
                              </span>
                            ) : isSoleAdmin ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic" title="Sole active admin cannot be revoked">
                                Sole Admin
                              </span>
                            ) : !isPlatformOwner ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic" title="Revoking is restricted to the platform owner">
                                Owner Only
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setRevokeError(null);
                                  setUserToRevoke(admin);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Revoke Privileges</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Super Admin Invitations Table */}
        {activeTab === 'invitations' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Super Administrator Invitations</span>
              </h3>
              <span className="text-xs text-slate-400 font-semibold">{filteredInvitations.length} total invitations</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading invitations...</span>
              </div>
            ) : filteredInvitations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No invitations matching query. Click &ldquo;Add Super Admin&rdquo; above to invite a new administrator.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Invited Email</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Invited By</th>
                      <th className="py-3.5 px-4">Notes</th>
                      <th className="py-3.5 px-4">Expiration</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredInvitations.map((inv) => {
                      const isPending = inv.status === 'PENDING';
                      const isExpired = inv.status === 'EXPIRED';
                      const isAccepted = inv.status === 'ACCEPTED';
                      const isCancelled = inv.status === 'CANCELLED';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>{inv.email}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span>PENDING</span>
                              </span>
                            )}
                            {isAccepted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>ACCEPTED</span>
                              </span>
                            )}
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>EXPIRED</span>
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-500" />
                                <span>CANCELLED</span>
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-slate-600 text-[11px]">
                            <div className="font-semibold text-slate-900">{inv.invitedBy?.name || 'Administrator'}</div>
                            <div className="text-slate-400 text-[10px]">{inv.invitedBy?.email}</div>
                          </td>

                          <td className="py-4 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                            {inv.notes || '—'}
                          </td>

                          <td className="py-4 px-4 text-slate-500 text-[11px]">
                            <div>{new Date(inv.expiresAt).toLocaleDateString()}</div>
                            <div className="text-slate-400 text-[10px]">
                              {new Date(inv.expiresAt) > new Date() ? 'Active' : 'Expired'}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isPending && (
                                <>
                                  <button
                                    onClick={(e) => handleCopyLink(inv.token, e)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                                    title="Copy direct invitation link"
                                  >
                                    {copiedToken === inv.token ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-700">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Link</span>
                                      </>
                                    )}
                                  </button>

                                  {isPlatformOwner && (
                                    <button
                                      onClick={() => {
                                        setCancelError(null);
                                        setInviteToCancel(inv);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Cancel</span>
                                    </button>
                                  )}
                                </>
                              )}

                              {isAccepted && (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Linked ({inv.acceptedBy?.name || 'User'})
                                </span>
                              )}

                              {(isExpired || isCancelled) && (
                                <span className="text-[11px] font-semibold text-slate-400">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Super Admin */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 font-display">Add Super Administrator</h2>
                    <p className="text-slate-500 text-xs">Grant verified Google OAuth administrator access</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {inviteError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient&apos;s Google Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. colleague@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The user must sign in using this exact email with Google OAuth to accept privileges.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrative Notes / Role Designation (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteNotes}
                    onChange={(e) => setInviteNotes(e.target.value)}
                    placeholder="e.g. Co-founder / Head of Operations"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Cryptographic Verification Guarantee</span>
                  </div>
                  <p>
                    Privileged access is never granted on email input alone. When the user signs in with Google, Neon Auth cryptographically verifies their identity token before granting Super Admin access.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-purple-600/25 transition-colors disabled:opacity-60"
                  >
                    {inviteSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create & Authorize Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Revoke Super Admin Confirmation */}
        {userToRevoke && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  Revoke Administrator Access?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to revoke Super Administrator privileges from:
                </p>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-900">
                  {userToRevoke.email}
                </div>
              </div>

              {revokeError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{revokeError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span>Account & Data Preservation</span>
                </div>
                <p>
                  This will demote their privileges from Super Admin. Their user profile, booking history, and data records will be preserved safely.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToRevoke(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Keep Access
                </button>

                <button
                  type="button"
                  onClick={handleRevokeAdmin}
                  disabled={revokeSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-rose-600/25 transition-colors disabled:opacity-60"
                >
                  {revokeSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <span>Confirm Revocation</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Cancel Invitation Confirmation */}
        {inviteToCancel && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Clock className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  Cancel Pending Invitation?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cancel the active Super Admin invitation for:
                </p>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-900">
                  {inviteToCancel.email}
                </div>
              </div>

              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{cancelError}</span>
                </div>
              )}

              <p className="text-xs text-slate-500 text-center">
                The invitation token will be immediately invalidated and cannot be accepted.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteToCancel(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Keep Invitation
                </button>

                <button
                  type="button"
                  onClick={handleCancelInvite}
                  disabled={cancelSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-rose-600/25 transition-colors disabled:opacity-60"
                >
                  {cancelSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Confirm Cancellation</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminSuperAdminsPage;
