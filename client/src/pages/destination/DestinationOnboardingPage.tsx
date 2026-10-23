import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { MediaUploader, UploadedMediaItem } from '../../components/common/MediaUploader.js';
import {
  Landmark,
  Building,
  Mail,
  Phone,
  User,
  MapPin,
  Clock,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Users,
  LogOut,
  Info,
} from 'lucide-react';
import { SkeletonDashboard } from '../../components/common/Skeleton.js';

const CATEGORIES = [
  'Amusement & Theme Park',
  'Waterpark',
  'Science Centre & Planetarium',
  'Museum & Heritage Site',
  'Botanical Garden & Zoo',
  'Adventure & Outdoor Sports',
  'Art & Cultural Village',
  'Aquarium & Oceanarium',
  'Industrial & Educational Tour',
];

export const DestinationOnboardingPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status check if user already has an active proposal
  const [existingStatus, setExistingStatus] = useState<any>(null);

  // Wizard Step: 1 = Basic Info, 2 = Pricing & Capacity, 3 = Cloudinary Media, 4 = Review
  const [step, setStep] = useState<number>(1);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0],
    businessName: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    officialEmail: '',
    contactPhone: '',
    managerName: user?.name || '',
    googleProfile: '',
    website: '',
    studentTicketPrice: '',
    teacherTicketPrice: '',
    complimentaryStaffRatio: '',
    minGroupSize: '',
    maxGroupSize: '',
    guideNeeded: 'no',
    openingTime: '',
    closingTime: '',
    safetyInfo: '',
  });

  // Media state for Cloudinary uploader
  const [mediaItems, setMediaItems] = useState<UploadedMediaItem[]>([]);

  // Restore draft progress for returning users with incomplete onboarding
  useEffect(() => {
    if (user?.id) {
      const draftKey = `schooldest_dest_draft_${user.id}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.formData) {
            setFormData((prev) => ({
              ...prev,
              ...parsed.formData,
              managerName: parsed.formData.managerName || user.name || '',
            }));
          }
          if (typeof parsed.step === 'number' && parsed.step >= 1 && parsed.step <= 4) {
            setStep(parsed.step);
          }
          if (Array.isArray(parsed.mediaItems) && parsed.mediaItems.length > 0) {
            setMediaItems(parsed.mediaItems);
          }
        } catch (e) {
          console.warn('Failed to parse saved destination draft', e);
        }
      } else if (user.name) {
        setFormData((prev) => ({ ...prev, managerName: user.name }));
      }
    }
  }, [user]);

  useEffect(() => {
    // Guard: redirect school users away from destination onboarding
    if (user?.portalType === 'SCHOOL' && !user?.destination) {
      navigate('/school/onboard', { replace: true });
      return;
    }
    async function checkExisting() {
      try {
        const res = await api.getDestinationOnboardingStatus();
        if (res.success && res.data?.hasProposal) {
          setExistingStatus(res.data);
        }
      } catch (err) {
        console.warn('Status check notice:', err);
      } finally {
        setLoading(false);
      }
    }
    checkExisting();
  }, [user, navigate]);

  const updateDraft = (newFormData: typeof formData, newStep: number, newMedia: UploadedMediaItem[]) => {
    if (user?.id) {
      try {
        localStorage.setItem(
          `schooldest_dest_draft_${user.id}`,
          JSON.stringify({
            formData: newFormData,
            step: newStep,
            mediaItems: newMedia,
          })
        );
      } catch (e) {}
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    setFormData(updated);
    updateDraft(updated, step, mediaItems);
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (
        !formData.name.trim() ||
        !formData.businessName.trim() ||
        !formData.address.trim() ||
        !formData.city.trim() ||
        !formData.officialEmail.trim() ||
        !formData.contactPhone.trim() ||
        !formData.googleProfile.trim()
      ) {
        setError('Please fill in all mandatory identification, Google profile link, and address fields.');
        return;
      }
    } else if (step === 2) {
      if (!formData.studentTicketPrice || Number(formData.studentTicketPrice) <= 0) {
        setError('Please specify a valid student ticket price.');
        return;
      }
    } else if (step === 3) {
      const completed = mediaItems.filter((i) => i.status === 'completed');
      if (completed.length < 3) {
        setError(`Please upload at least 3 photos (currently ${completed.length} completed). Recommended: 5–6 images.`);
        return;
      }
    }
    setStep((s) => {
      const nextStep = Math.min(4, s + 1);
      updateDraft(formData, nextStep, mediaItems);
      return nextStep;
    });
  };

  const handleStepBack = (prevStep: number) => {
    setStep(prevStep);
    updateDraft(formData, prevStep, mediaItems);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const completedMedia = mediaItems
        .filter((i) => i.status === 'completed' && i.url)
        .map((i, idx) => ({
          url: i.url!,
          publicId: i.publicId,
          isCover: i.isCover,
          order: idx,
        }));

      const payload = {
        ...formData,
        studentTicketPrice: Number(formData.studentTicketPrice),
        teacherTicketPrice: Number(formData.teacherTicketPrice),
        complimentaryStaffRatio: Number(formData.complimentaryStaffRatio),
        minGroupSize: Number(formData.minGroupSize),
        maxGroupSize: Number(formData.maxGroupSize),
        guideAvailable: formData.guideNeeded === 'yes',
        guideNeeded: formData.guideNeeded === 'yes',
        images: completedMedia,
      };

      const res = await api.onboardDestination(payload);
      if (res.success) {
        if (res.data?.token) {
          localStorage.setItem('schooldest_token', res.data.token);
        }
        if (user?.id) {
          localStorage.removeItem(`schooldest_dest_draft_${user.id}`);
        }
        await refreshUser();
        setExistingStatus({
          hasProposal: true,
          status: res.data.destination.status,
          destination: res.data.destination,
          message: 'Your destination proposal has been submitted and is pending administrator review.',
        });
      } else {
        setError(res.message || 'Submission failed. Please check your data.');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting destination onboarding form.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (allowed.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, maxLen?: number) => {
    const { name, value } = e.target;
    const cleanNumbers = value.replace(/\D/g, '');
    const finalVal = maxLen ? cleanNumbers.slice(0, maxLen) : cleanNumbers;
    const updated = { ...formData, [name]: finalVal };
    setFormData(updated);
    updateDraft(updated, step, mediaItems);
  };

  if (loading) {
    return <SkeletonDashboard title="Verifying Destination Partner Status..." />;
  }

  // Already submitted / Proposal Status screen
  if (existingStatus && existingStatus.hasProposal) {
    const isPending = existingStatus.status === 'PENDING_APPROVAL';
    const isPublished = existingStatus.status === 'PUBLISHED';

    return (
      <div className="min-h-screen bg-dots flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200/90 text-center space-y-7">
          <div className="w-18 h-18 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            {isPending && (
              <div className="w-18 h-18 p-4 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-10 h-10" />
              </div>
            )}
            {isPublished && (
              <div className="w-18 h-18 p-4 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {!isPending && !isPublished && (
              <div className="w-18 h-18 p-4 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Landmark className="w-10 h-10" />
              </div>
            )}
          </div>

          <div>
            <span
              className={`inline-block px-3.5 py-1 rounded-full text-[13px] font-bold uppercase tracking-wider mb-3 ${
                isPending
                  ? 'bg-amber-100 text-amber-800'
                  : isPublished
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              Proposal Status: {existingStatus.status.replace('_', ' ')}
            </span>
            <h2 className="text-[28px] sm:text-[32px] font-black text-slate-950 font-display">
              {existingStatus.destination?.name || 'Your Venue'}
            </h2>
            <p className="text-[15px] text-slate-500 mt-1">
              Category: <span className="font-semibold text-slate-700">{existingStatus.destination?.category}</span>
            </p>
          </div>

          {isPending && (
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left text-[14px] text-amber-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-[15px]">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                Under Administrator Review
              </p>
              <p className="text-slate-600 leading-relaxed">
                Your venue proposal and ticket pricing model have been received. The platform super-admin team reviews all student safety protocols and pricing details before publishing to institutes nationwide.
              </p>
            </div>
          )}

          {isPublished && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-left text-[14px] text-emerald-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-[15px]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Destination Published & Live
              </p>
              <p className="text-slate-600 leading-relaxed">
                Your venue is live on SCHOOLDEST! Institutes across India can now discover your attraction and request student group bookings.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isPublished ? (
              <Link
                to="/destination"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
              >
                <span>Go to Destination Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-[15px] transition-colors"
              >
                Refresh Proposal Status
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[15px] flex items-center justify-center gap-1.5 transition-colors"
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
    <div className="min-h-screen bg-dots py-14 px-4 sm:px-6 lg:px-8 relative">
      {/* Full-Screen Glass Modal Loader */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto relative">
              <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 font-display">
                Submitting Venue Proposal...
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Uploading photo gallery to Cloudinary and dispatching venue listing to the Super-Admin verification queue.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Direct Partnership Ledger &bull; Do not close window</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 text-white shadow-xl shadow-purple-600/25 mb-2">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-black text-slate-950 tracking-tight font-display">
            Destination Partner Onboarding
          </h1>
          <p className="text-[16px] sm:text-[17px] text-slate-600 max-w-lg mx-auto leading-relaxed">
            List your venue, attraction, or excursion destination to host student group visits from verified educational institutions.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Venue Details' },
              { num: 2, label: 'Tickets & Operations' },
              { num: 3, label: 'Media & Gallery' },
              { num: 4, label: 'Review & Submit' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-bold transition-all ${
                    step === s.num
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span
                  className={`text-[14px] sm:text-[15px] font-bold hidden sm:inline ${
                    step === s.num ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[15px] flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Notice</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Multi-step Form Card */}
        <div className="bg-white rounded-3xl p-7 sm:p-10 shadow-xl border border-slate-200/90">
          {/* STEP 1: Venue Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-[20px] font-bold text-slate-900">Step 1: Venue Identification & Location</h2>
                <p className="text-[14px] text-slate-500 mt-0.5">Enter public and operational details about your venue</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Destination / Attraction Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Wonderla Amusement Park, Bangalore"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Venue Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-800 bg-slate-50/50"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Legal Business Entity Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Wonderla Holidays Limited"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Venue Description *
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    required
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Provide a detailed description of activities, attractions, and educational relevance for institute groups..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Full Venue Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Physical address, landmark, highway"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
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
                    placeholder="e.g. Bangalore"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
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
                    placeholder="e.g. Karnataka"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="pincode"
                    required
                    value={formData.pincode}
                    onKeyDown={handleNumericKeyDown}
                    onChange={(e) => handleNumericChange(e, 6)}
                    placeholder="e.g. 562109"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50 font-mono"
                  />
                  <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Official Business Email *
                  </label>
                  <input
                    type="email"
                    name="officialEmail"
                    required
                    value={formData.officialEmail}
                    onChange={handleChange}
                    placeholder="e.g. institutes@wonderla.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Manager Name *
                  </label>
                  <input
                    type="text"
                    name="managerName"
                    required
                    value={formData.managerName}
                    onChange={handleChange}
                    placeholder="Authorized Manager Name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="contactPhone"
                    required
                    value={formData.contactPhone}
                    onKeyDown={handleNumericKeyDown}
                    onChange={(e) => handleNumericChange(e, 10)}
                    placeholder="9800000000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50 font-mono"
                  />
                  <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed (10 digits)</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Google Business Profile / Maps Link *
                  </label>
                  <input
                    type="url"
                    name="googleProfile"
                    required
                    value={formData.googleProfile}
                    onChange={handleChange}
                    placeholder="https://maps.google.com/?cid=... or https://g.co/kgs/..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                  <span className="text-[12px] text-slate-500 mt-1 block">Mandatory link for venue authenticity & location verification</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Official Website (Optional)
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://www.yourvenue.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                  <span className="text-[12px] text-slate-400 mt-1 block">Optional official web address</span>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-7 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[16px] flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
                >
                  <span>Continue to Pricing & Operations</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Tickets & Operations */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-[20px] font-bold text-slate-900">Step 2: Institute Pricing & Group Capacities</h2>
                <p className="text-[14px] text-slate-500 mt-0.5">Define institute rates, teacher concessions, and group parameters</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Ticket per Student (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 text-[15px] font-bold">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="studentTicketPrice"
                      required
                      value={formData.studentTicketPrice}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) => handleNumericChange(e, 6)}
                      placeholder="450"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50 font-mono"
                    />
                  </div>
                  <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Ticket per Teacher (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 text-[15px] font-bold">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="teacherTicketPrice"
                      required
                      value={formData.teacherTicketPrice}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) => handleNumericChange(e, 6)}
                      placeholder="250"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50 font-mono"
                    />
                  </div>
                  <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Free Teacher Ratio
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      name="complimentaryStaffRatio"
                      value={formData.complimentaryStaffRatio}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) => handleNumericChange(e, 3)}
                      placeholder="15"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50 font-mono"
                    />
                  </div>
                  <span className="text-[12px] text-slate-400 mt-1 block">1 free teacher per N students (Numbers only)</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Minimum Group Size
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="minGroupSize"
                    value={formData.minGroupSize}
                    onKeyDown={handleNumericKeyDown}
                    onChange={(e) => handleNumericChange(e, 5)}
                    placeholder="25"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50 font-mono"
                  />
                  <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Maximum Group Size
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="maxGroupSize"
                    value={formData.maxGroupSize}
                    onKeyDown={handleNumericKeyDown}
                    onChange={(e) => handleNumericChange(e, 5)}
                    placeholder="1000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50 font-mono"
                  />
                  <span className="text-[12px] text-slate-400 mt-1 block">Only numbers allowed</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Guide Needed? *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, guideNeeded: 'yes' }))}
                      className={`py-3 px-4 rounded-xl border text-[15px] font-bold text-center transition-all ${
                        formData.guideNeeded === 'yes'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, guideNeeded: 'no' }))}
                      className={`py-3 px-4 rounded-xl border text-[15px] font-bold text-center transition-all ${
                        formData.guideNeeded === 'no'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      No
                    </button>
                  </div>
                  <span className="text-[12px] text-slate-400 mt-1 block">Dedicated educational guide available</span>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    name="openingTime"
                    value={formData.openingTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    name="closingTime"
                    value={formData.closingTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-3">
                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Safety & First-Aid Information
                  </label>
                  <textarea
                    name="safetyInfo"
                    rows={3}
                    value={formData.safetyInfo}
                    onChange={handleChange}
                    placeholder="First aid station, emergency medical room, certified staff on site..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 text-[16px] text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStepBack(1)}
                  className="px-6 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-[15px] flex items-center gap-2 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-7 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[16px] flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
                >
                  <span>Continue to Media Upload</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Media Upload */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-[20px] font-bold text-slate-900">Step 3: High-Resolution Photo Gallery</h2>
                <p className="text-[14px] text-slate-500 mt-0.5">
                  Drag and drop 5–6 high quality photos of attractions, facilities, and groups. Select one as your primary cover photo.
                </p>
              </div>

              <MediaUploader
                maxImages={6}
                minImages={3}
                items={mediaItems}
                onChange={(items) => {
                  setMediaItems(items);
                  updateDraft(formData, step, items);
                }}
              />

              <div className="pt-6 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStepBack(2)}
                  className="px-6 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-[15px] flex items-center gap-2 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-7 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[16px] flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
                >
                  <span>Review Application</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-[20px] font-bold text-slate-900">Step 4: Final Verification & Submission</h2>
                <p className="text-[14px] text-slate-500 mt-0.5">Confirm your proposal details before submitting to platform administration</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-[15px]">
                  <span className="font-bold text-slate-900 block text-[17px]">{formData.name}</span>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Category:</span> {formData.category}</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Entity:</span> {formData.businessName}</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Location:</span> {formData.city}, {formData.state} - {formData.pincode}</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Email:</span> {formData.officialEmail}</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Phone:</span> {formData.contactPhone}</p>
                  <p className="text-slate-600 truncate"><span className="font-semibold text-slate-800">Google Profile:</span> {formData.googleProfile}</p>
                  {formData.website && (
                    <p className="text-slate-600 truncate"><span className="font-semibold text-slate-800">Website:</span> {formData.website}</p>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-[15px]">
                  <span className="font-bold text-slate-900 block text-[17px]">Institute Pricing Model</span>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Ticket per Student:</span> ₹{formData.studentTicketPrice}</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Ticket per Teacher:</span> ₹{formData.teacherTicketPrice}</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Guide Provided:</span> {formData.guideNeeded === 'yes' ? 'Yes' : 'No'}</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Complimentary Ratio:</span> 1 free staff per {formData.complimentaryStaffRatio} students</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Group Size:</span> {formData.minGroupSize} – {formData.maxGroupSize} students</p>
                  <p className="text-slate-600"><span className="font-semibold text-slate-800">Photos Attached:</span> {mediaItems.filter((i) => i.status === 'completed').length} uploaded to Cloudinary</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-[14px] text-purple-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-[15px]">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  Compliance & Quality Guarantee
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Upon submission, your proposal will enter the <span className="font-bold text-purple-800">PENDING APPROVAL</span> state. The Super Admin team will verify business licensing, safety records, and pricing consistency before publishing your listing.
                </p>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStepBack(3)}
                  className="px-6 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-[15px] flex items-center gap-2 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Media</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[16px] shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting Proposal...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Destination Proposal</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
