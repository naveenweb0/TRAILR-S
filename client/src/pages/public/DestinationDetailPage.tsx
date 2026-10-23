import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Destination } from '../../types/index.js';
import { AvailabilityCalendar } from '../../components/common/AvailabilityCalendar.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Sparkles,
  Utensils,
  Lock,
  ArrowRight,
  Phone,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { CldImage } from '../../components/common/CldImage.js';

export const DestinationDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getDestinationDetail(slug)
      .then((res) => {
        if (res.success) {
          setDestination(res.data);
          const cover = res.data.coverImage || res.data.images?.[0]?.url;
          setSelectedImage(cover || '');
        }
      })
      .catch((err) => setError(err.message || 'Destination not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleBookNow = () => {
    if (!destination) return;
    const query = new URLSearchParams({
      destinationId: destination.id,
      ...(selectedDate ? { visitDate: selectedDate } : {}),
    });

    if (!user) {
      navigate(`/login?redirect=/school/book?${query.toString()}`);
    } else {
      navigate(`/school/book?${query.toString()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        Loading destination details...
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="font-bold text-slate-900 text-lg">Destination Not Found</h2>
          <p className="text-slate-500 text-xs mt-1 mb-4">{error || 'Could not load destination'}</p>
          <Link to="/destinations" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
            Back to Destinations
          </Link>
        </div>
      </div>
    );
  }

  const primaryTicket = destination.ticketTypes?.find((t) => t.category === 'STUDENT') || destination.ticketTypes?.[0];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Banner Breadcrumb */}
      <div className="bg-slate-900 text-white py-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link to="/destinations" className="hover:text-white">Destinations</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200">{destination.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white">
                  {destination.category}
                </span>
                {destination.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Verified Educational Partner
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                {destination.name}
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                {destination.address}, {destination.city}, {destination.state} - {destination.pincode}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleBookNow}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Institute Excursion</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT 2 COLUMNS: Image Gallery & Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="h-96 w-full bg-slate-900 relative">
                <CldImage
                  src={selectedImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200'}
                  alt={destination.name}
                  className="w-full h-full object-cover"
                  width={1200}
                  height={800}
                />
              </div>

              {/* Thumbnails */}
              {destination.images && destination.images.length > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                  {destination.images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(img.url)}
                      className={`h-16 w-24 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImage === img.url ? 'border-blue-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <CldImage
                        src={img.url}
                        publicId={(img as any).publicId}
                        alt={img.caption || ''}
                        className="w-full h-full object-cover"
                        width={200}
                        height={130}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Overview & Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">About This Destination</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {destination.description}
              </p>

              {/* Key Quick Facts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-medium">Operating Hours</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {destination.openingTime} - {destination.closingTime}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-medium">Group Size</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {destination.minGroupSize} - {destination.maxGroupSize} students
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-medium">Tour Guide</span>
                  <span className={`font-bold mt-0.5 block ${destination.guideAvailable ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {destination.guideAvailable ? 'Guide Included' : 'Self-Guided'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-medium">Complimentary Staff</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">
                    1 Free / {primaryTicket?.complimentaryStaffRatio || 15} Students
                  </span>
                </div>
              </div>
            </div>

            {/* Facilities & Add-ons */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Facilities & Food Options</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {destination.facilities?.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        {f.isIncluded ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Utensils className="w-4 h-4 text-blue-600" />
                        )}
                        {f.name}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{f.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      {f.isIncluded ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                          Included
                        </span>
                      ) : (
                        <span className="text-xs font-extrabold text-blue-600">
                          +₹{f.extraPrice}<span className="text-[10px] text-slate-500 font-normal">/person</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* School Policies & Safety */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Safety & Policies</h2>
              <div className="space-y-4 text-xs text-slate-600">
                {destination.safetyInfo && (
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Health & Safety Standards
                    </h4>
                    <p className="pl-5 leading-relaxed">{destination.safetyInfo}</p>
                  </div>
                )}

                {destination.schoolPolicies && (
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Institute Group Guidelines
                    </h4>
                    <p className="pl-5 leading-relaxed">{destination.schoolPolicies}</p>
                  </div>
                )}

                {destination.cancellationPolicy && (
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <Clock className="w-4 h-4 text-slate-700" /> Rescheduling & Cancellation Rules
                    </h4>
                    <p className="pl-5 leading-relaxed">{destination.cancellationPolicy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Calendar & Sticky Booking Widget */}
          <div className="space-y-6">
            {/* Live Interactive Availability Calendar */}
            <div className="sticky top-28 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">Select Visit Date</h3>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Sync
                  </span>
                </div>

                <AvailabilityCalendar
                  destinationId={destination.id}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                />
              </div>

              {/* Booking CTA card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs text-slate-400">Starting Rate</span>
                  <div className="text-2xl font-extrabold text-white">
                    ₹{primaryTicket?.basePrice || 350}
                    <span className="text-xs text-slate-400 font-normal"> /student</span>
                  </div>
                </div>

                {selectedDate ? (
                  <div className="p-3 bg-blue-900/40 border border-blue-500/30 rounded-xl text-xs text-blue-200 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>Selected Date: <strong className="text-white">{selectedDate}</strong></span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Click an available date on the calendar above.</span>
                  </div>
                )}

                <button
                  onClick={handleBookNow}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Proceed to Institute Booking Form</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Direct B2B Confirmation with Venue
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    Optional Admin Transport Coordination
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
