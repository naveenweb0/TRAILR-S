import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  Building2,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  School,
  Loader2,
  Globe,
  Phone,
  Calendar,
  Users,
  LogOut,
  Hash,
} from 'lucide-react';
import { SkeletonDashboard } from '../../components/common/Skeleton.js';

export const SchoolOnboardingPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status state if already submitted
  const [existingStatus, setExistingStatus] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    board: 'CBSE',
    schoolType: 'Private Day School',
    affiliationNumber: '',
    yearEstablished: '',
    website: '',
    gstNumber: '',
    approximateStrength: '',
    campusArea: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    officialEmail: '',
    contactPerson: user?.name || '',
    designation: 'Principal / Administrator',
    contactPhone: '',
    emergencyPhone: '',
  });

  // Restore saved draft progress for returning users with incomplete onboarding
  useEffect(() => {
    if (user?.id) {
      const draftKey = `schooldest_school_draft_${user.id}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData((prev) => ({
            ...prev,
            ...parsed,
            contactPerson: parsed.contactPerson || user.name || '',
          }));
        } catch (e) {
          console.warn('Failed to parse saved school draft', e);
        }
      } else if (user.name) {
        setFormData((prev) => ({ ...prev, contactPerson: user.name }));
      }
    }
  }, [user]);

  // Check if user already submitted onboarding
  useEffect(() => {
    // Guard: redirect destination users away from school onboarding
    if (user?.portalType === 'DESTINATION' && !user?.school) {
      navigate('/destination/onboard', { replace: true });
      return;
    }
    async function checkStatus() {
      try {
        const res = await api.getSchoolOnboardingStatus();
        if (res.success && res.data?.isOnboarded) {
          setExistingStatus(res.data);
        }
      } catch (err) {
        console.warn('Status check notice:', err);
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, [user, navigate]);

  const updateFormDataAndDraft = (updater: (prev: typeof formData) => typeof formData) => {
    setFormData((prev) => {
      const updated = updater(prev);
      if (user?.id) {
        try {
          localStorage.setItem(`schooldest_school_draft_${user.id}`, JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFormDataAndDraft((prev) => ({ ...prev, [name]: value }));
  };

  // Helper for numeric-only inputs
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, maxLen?: number) => {
    const { name, value } = e.target;
    const cleanNumbers = value.replace(/\D/g, '');
    const finalVal = maxLen ? cleanNumbers.slice(0, maxLen) : cleanNumbers;
    updateFormDataAndDraft((prev) => ({ ...prev, [name]: finalVal }));
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation and edit keys
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (allowed.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Strict Validation
    if (
      !formData.name.trim() ||
      !formData.officialEmail.trim() ||
      !formData.website.trim() ||
      !formData.gstNumber.trim() ||
      !formData.contactPhone.trim() ||
      !formData.emergencyPhone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim() ||
      !formData.affiliationNumber.trim() ||
      !formData.approximateStrength.trim() ||
      !formData.yearEstablished.trim()
    ) {
      setError('Please fill in all mandatory institutional, academic, and contact fields.');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (formData.pincode.length < 5) {
      setError('Please enter a valid PIN Code (minimum 5-6 digits).');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (formData.contactPhone.length < 10) {
      setError('Please enter a valid 10-digit primary mobile / phone number.');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const res = await api.onboardSchool({
        ...formData,
        approximateStrength: formData.approximateStrength ? parseInt(formData.approximateStrength, 10) : undefined,
        yearEstablished: formData.yearEstablished ? parseInt(formData.yearEstablished, 10) : undefined,
      });

      if (res.success) {
        if (res.data?.token) {
          localStorage.setItem('schooldest_token', res.data.token);
        }
        if (user?.id) {
          localStorage.removeItem(`schooldest_school_draft_${user.id}`);
        }
        await refreshUser();
        // Switch to pending screen
        setExistingStatus({
          isOnboarded: true,
          schoolId: res.data.school.id,
          schoolName: res.data.school.name,
          status: res.data.school.verificationStatus,
          message: 'Your institute application has been submitted and is pending verification.',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(res.message || 'Submission failed. Please check your data.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting institute onboarding form.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonDashboard title="Verifying Institutional Profile..." />;
  }

  // Already submitted / Pending Review Screen
  if (existingStatus && existingStatus.isOnboarded) {
    const isPending = existingStatus.status === 'PENDING';
    const isVerified = existingStatus.status === 'VERIFIED';
    const isRejected = existingStatus.status === 'REJECTED';

    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full glass-card rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-7">
          <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            {isPending && (
              <div className="w-20 h-20 p-5 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Clock className="w-10 h-10" />
              </div>
            )}
            {isVerified && (
              <div className="w-20 h-20 p-5 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {isRejected && (
              <div className="w-20 h-20 p-5 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          <div>
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-[13px] font-black tracking-wide uppercase mb-3 ${
                isPending
                  ? 'bg-amber-100 text-amber-800'
                  : isVerified
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              Status: {existingStatus.status === 'VERIFIED' ? 'APPROVED' : existingStatus.status}
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-black text-slate-950 font-display">
              {isPending && 'Application Under Review'}
              {isVerified && 'Institution Approved'}
              {isRejected && 'Application Requires Attention'}
            </h1>
            <p className="text-[17px] text-slate-600 font-bold mt-2 leading-relaxed">
              {existingStatus.schoolName}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/90 text-left border border-slate-200 space-y-3 text-[15px] shadow-sm">
            {isPending && (
              <>
                <p className="text-slate-800 leading-relaxed font-medium">
                  Your institute onboarding application has been successfully received by the SCHOOLDEST approval desk.
                </p>
                <div className="pt-2 text-[14px] text-slate-500 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Super administrators review affiliation and coordinator credentials.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>You will receive an alert once booking permissions are activated.</span>
                  </div>
                </div>
              </>
            )}
            {isVerified && (
              <p className="text-emerald-800 font-bold leading-relaxed">
                Your institution has been approved! You now have full access to direct destination reservations and fleet scheduling.
              </p>
            )}
            {isRejected && (
              <p className="text-rose-800 leading-relaxed">
                The institute profile could not be approved with the provided affiliation credentials. Please contact administration for clarification.
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isVerified ? (
              <Link
                to="/school"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                <span>Go to Institute Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-[15px] transition-colors"
              >
                Refresh Status
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[15px] flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aurora py-14 px-4 sm:px-6 lg:px-8 relative selection:bg-blue-600 selection:text-white">
      {/* Proper High-Class Full-Screen Modal Loader on Submit */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-8 sm:p-10 max-w-md w-full text-center space-y-5 shadow-2xl border border-white/40">
            <div className="w-20 h-20 mx-auto relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <Building2 className="w-8 h-8 text-blue-600 absolute" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[20px] font-black text-slate-900 font-display">
                Submitting Institute Registration
              </h3>
              <p className="text-[14px] text-slate-500 leading-relaxed">
                Syncing credentials, validating academic details, and routing profile to verification desk...
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>256-Bit SSL Encrypted &bull; Do not close window</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/30 mb-2">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-black text-slate-950 tracking-tight font-display">
            First-Time Institute Onboarding
          </h1>
          <p className="text-[16px] sm:text-[17px] text-slate-600 max-w-xl mx-auto leading-relaxed">
            Provide comprehensive institutional credentials to enable direct excursion bookings with verified destinations across India.
          </p>
        </div>

        {error && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[15px] flex items-start gap-3.5 shadow-sm animate-fadeIn">
            <AlertCircle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-extrabold block text-rose-900">Please Correct the Following</span>
              <span className="mt-0.5 block">{error}</span>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-7 sm:p-10 shadow-2xl space-y-8">
          {/* Section 1: Institutional Identification */}
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-[18px] font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>1. Institution Identification</span>
              </h2>
              <p className="text-[14px] text-slate-500 mt-0.5">Official recognized details and academic accreditation</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Full Institute / Institution Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. National Public School / Cambridge International Academy"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Educational Board / Affiliation *
                </label>
                <select
                  name="board"
                  value={formData.board}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-800 bg-white"
                >
                  <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                  <option value="ICSE">ICSE / ISC (Council for CISCE)</option>
                  <option value="State Board">State Secondary Board</option>
                  <option value="IB">IB (International Baccalaureate)</option>
                  <option value="Cambridge">Cambridge International (IGCSE)</option>
                  <option value="Other">Other Recognized Board / University</option>
                </select>
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Institute Category / Type *
                </label>
                <select
                  name="schoolType"
                  value={formData.schoolType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-800 bg-white"
                >
                  <option value="Private Day School">Private Day Institute</option>
                  <option value="Day-cum-Boarding">Day-cum-Boarding</option>
                  <option value="Residential Boarding">Residential Boarding Institute</option>
                  <option value="Government / Kendriya Vidyalaya">Government / Kendriya Vidyalaya</option>
                  <option value="International School">International Institute</option>
                  <option value="College / University">College / Higher Educational Institute</option>
                </select>
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Affiliation / Registration Number *
                </label>
                <input
                  type="text"
                  name="affiliationNumber"
                  required
                  value={formData.affiliationNumber}
                  onChange={handleChange}
                  placeholder="e.g. CBSE/AFF/2024/98213"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Year Established *
                </label>
                <input
                  type="text"
                  name="yearEstablished"
                  required
                  value={formData.yearEstablished}
                  onChange={(e) => handleNumericChange(e, 4)}
                  onKeyDown={handleNumericKeyDown}
                  placeholder="e.g. 1998 (Numbers only)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Official Institute Email Address *
                </label>
                <input
                  type="email"
                  name="officialEmail"
                  required
                  value={formData.officialEmail}
                  onChange={handleChange}
                  placeholder="e.g. principal@institute.edu.in"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
                <span className="text-[12px] text-slate-500 mt-1 block">Used for official booking contract confirmations</span>
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Institute Website *
                </label>
                <input
                  type="url"
                  name="website"
                  required
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.institute.edu.in"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
                <span className="text-[12px] text-slate-500 mt-1 block">Mandatory official portal / website for verification</span>
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Institute GSTIN / GST Number *
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  required
                  value={formData.gstNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  maxLength={15}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white font-mono uppercase"
                />
                <span className="text-[12px] text-slate-500 mt-1 block">Mandatory 15-character GSTIN for official B2B excursion invoicing</span>
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Approximate Student Strength *
                </label>
                <input
                  type="text"
                  name="approximateStrength"
                  required
                  value={formData.approximateStrength}
                  onChange={(e) => handleNumericChange(e, 7)}
                  onKeyDown={handleNumericKeyDown}
                  placeholder="e.g. 2400 (Numbers only)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Campus Area / Acreage
                </label>
                <input
                  type="text"
                  name="campusArea"
                  value={formData.campusArea}
                  onChange={handleChange}
                  placeholder="e.g. 8 Acres / 25,000 sq ft"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address & Location */}
          <div className="space-y-5 pt-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-[18px] font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>2. Physical Campus Address</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="sm:col-span-3">
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Campus Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street / Sector / Campus Main Road"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. New Delhi"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Delhi / Maharashtra"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  PIN Code * (Numbers only)
                </label>
                <input
                  type="text"
                  name="pincode"
                  required
                  value={formData.pincode}
                  onChange={(e) => handleNumericChange(e, 6)}
                  onKeyDown={handleNumericKeyDown}
                  placeholder="e.g. 110022"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Primary Contact & Emergency Chaperone */}
          <div className="space-y-5 pt-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-[18px] font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>3. Primary Excursion Coordinator & Emergency Contacts</span>
              </h2>
              <p className="text-[14px] text-slate-500 mt-0.5">Authorized coordinator managing group excursion requests and safety</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Coordinator Name *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  required
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Designation / Role *
                </label>
                <input
                  type="text"
                  name="designation"
                  required
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Excursion Incharge / Vice Principal"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Direct Mobile / Contact Phone * (10 Digits)
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => handleNumericChange(e, 10)}
                  onKeyDown={handleNumericKeyDown}
                  placeholder="9811000000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white font-mono"
                />
                <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed</span>
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Secondary / Emergency Contact Phone * (10 Digits)
                </label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  required
                  value={formData.emergencyPhone}
                  onChange={(e) => handleNumericChange(e, 10)}
                  onKeyDown={handleNumericKeyDown}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 text-[16px] text-slate-900 bg-white font-mono"
                />
                <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed</span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>All submitted profiles undergo super-admin verification.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[16px] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>Submit Institute Registration</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
