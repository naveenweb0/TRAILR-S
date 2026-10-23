import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Destination } from '../../types/index.js';
import { DestinationCard } from '../../components/common/DestinationCard.js';
import { SkeletonCard } from '../../components/common/Skeleton.js';
import { TiltCard } from '../../components/common/TiltCard.js';
import { ScrollReveal } from '../../components/common/ScrollReveal.js';
import { WordByWordHeroText } from '../../components/landing/WordByWordHeroText.js';
import {
  Compass,
  Search,
  Sparkles,
  Shield,
  ShieldCheck,
  CalendarCheck,
  Truck,
  CheckCircle2,
  Users,
  MapPin,
  ArrowRight,
  Landmark,
  Building2,
  ChevronDown,
  FileCheck2,
  Clock,
  Check,
  Ticket,
  ChevronRight,
  Info,
  Map,
  Navigation,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [howItWorksTab, setHowItWorksTab] = useState<'schools' | 'venues'>('schools');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getDestinations()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDestinations(res.data);
        }
      })
      .catch((err) => console.error('Error fetching landing destinations:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCity.trim()) params.set('city', selectedCity.trim());
    if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
    navigate(`/destinations?${params.toString()}`);
  };

  const categories = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'Amusement Parks', value: 'Amusement' },
    { label: 'Waterparks', value: 'Waterpark' },
    { label: 'Museums & Heritage', value: 'Museum' },
    { label: 'Zoos & Wildlife', value: 'Zoo' },
    { label: 'Science Centres', value: 'Science' },
    { label: 'Adventure & Outdoor', value: 'Adventure' },
    { label: 'Cultural Attractions', value: 'Culture' },
  ];

  const popularQuickFilters = [
    { label: 'Theme & Waterparks', category: 'Amusement' },
    { label: 'Science Centres', category: 'Science' },
    { label: 'Museums & Heritage', category: 'Museum' },
    { label: 'Zoos & Wildlife', category: 'Zoo' },
  ];

  const filteredDestinations = destinations.filter((d) => {
    if (selectedCategory === 'ALL') return true;
    return d.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const faqs = [
    {
      q: 'How does institute registration work on SCHOOLDEST?',
      a: 'Institute staff or excursion coordinators register their institution by submitting official institute credentials, affiliation board, and coordinator contact details. Once submitted, the application profile is verified by the administration before group bookings can be submitted.',
    },
    {
      q: 'How does destination venue onboarding work?',
      a: 'Destination managers, theme park operators, science centres, and museum administrators submit their venue details, student group pricing tiers, complimentary teacher ratios, operating hours, and Cloudinary photos through our multi-step onboarding flow. Listings are held in pending review until approved by Super Admin.',
    },
    {
      q: 'How is group pricing calculated?',
      a: 'Destinations configure official student educational rates, adult rates, and complimentary teacher ratios (e.g. 1 free staff per 15 paying students). The platform automatically generates itemized cost breakdowns with zero intermediary markups.',
    },
    {
      q: 'Are bookings automatically confirmed upon submission?',
      a: 'No. Submitting a booking request creates a formal proposal sent directly to the destination manager. The venue reviews the student count, date availability, and batch timing before confirming or communicating adjustments.',
    },
    {
      q: 'How are student transportation requests handled?',
      a: 'Transportation is handled as a separate coordination workflow. When an institute requests transport assistance during booking, the venue reservation goes directly to the destination manager, while a linked fleet request is dispatched to the central administration fleet queue.',
    },
    {
      q: 'How do venues manage availability and capacity?',
      a: 'Destination managers access a dedicated availability calendar where they set daily student quotas, schedule maintenance blackout dates, and regulate institute arrival windows to prevent overcrowding and ensure student safety.',
    },
    {
      q: 'How are destination listings reviewed before going live?',
      a: 'Every destination submission is reviewed by platform administrators in the Super Admin portal. Administrators verify venue safety guidelines, business registration documents, and operational hours before publishing the listing to institutes.',
    },
  ];

  return (
    <div className="min-h-screen bg-aurora text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. BLACK BACKGROUND EDITORIAL HERO WITH CRISP WHITE TAG & WORD-BY-WORD SCROLL ANIMATION
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-24 sm:pt-24 sm:pb-32 lg:pt-28 lg:pb-36 overflow-hidden bg-slate-950 text-white border-b border-slate-900">
        {/* Soft Ambient Radial Lights (Deep Blue, Indigo, Cyan glow) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[650px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-cyan-500/15 rounded-full blur-[130px] pointer-events-none -z-10" />
        <div className="absolute -top-32 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center space-y-8">
          {/* Word By Word Hero with Crisp White Tag */}
          <WordByWordHeroText
            tagText="TRAILR'S • DIRECT B2B INSTITUTE EXCURSIONS"
            headlineWords={['We', 'lost', 'the', 'map', 'on', 'purpose.']}
            manifestoText="Real learning doesn't happen along predictable routes. TRAILR'S connects schools and institutes directly to India's most extraordinary discovery zones, science observatories, living citadels, and wilderness terrains. Zero middleman markup. 100% verified safety."
          />

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/destinations"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[15px] sm:text-[16px] shadow-lg shadow-blue-600/35 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-5 h-5 text-blue-200" />
              <span>Explore All Destinations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/school/onboard"
              className="px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-[15px] sm:text-[16px] backdrop-blur-md shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-blue-300" />
              <span>Onboard Your Institute</span>
            </Link>
          </div>

          {/* Sleek Single Search Capsule (Frosted Glass Dark Pill) */}
          <div className="w-full max-w-2xl pt-2">
            <form
              onSubmit={handleSearch}
              className="bg-slate-900/90 backdrop-blur-xl p-2.5 rounded-3xl border border-slate-800 shadow-2xl shadow-black/80 flex flex-col sm:flex-row items-center gap-2 transition-all hover:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
            >
              <div className="flex-1 flex items-center gap-3 px-3 py-2 w-full text-left">
                <Search className="w-5 h-5 text-blue-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search destinations, science labs, heritage forts..."
                  className="w-full text-sm sm:text-[15px] text-white placeholder-slate-400 bg-transparent focus:outline-none font-medium"
                />
              </div>

              <div className="h-7 w-px bg-slate-800 hidden sm:block shrink-0" />

              <div className="flex items-center gap-2 w-full sm:w-auto px-2">
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="City / Region"
                  className="w-full sm:w-36 text-sm text-white placeholder-slate-400 bg-transparent focus:outline-none font-medium py-1.5"
                />

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Search</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Popular quick filter pills */}
            <div className="pt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-bold">Trending:</span>
              {popularQuickFilters.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(q.category);
                    const p = new URLSearchParams();
                    p.set('category', q.category);
                    navigate(`/destinations?${p.toString()}`);
                  }}
                  className="px-3.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 hover:text-blue-300 text-slate-300 font-semibold border border-slate-800 transition-all shadow-2xs cursor-pointer"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Proof Metrics Strip */}
          <div className="w-full max-w-4xl pt-6">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-white font-display block">
                  50+
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wide">
                  Verified Venues
                </span>
              </div>

              <div className="space-y-1 border-l border-slate-800">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-display block">
                  0%
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wide">
                  Middleman Markup
                </span>
              </div>

              <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0">
                <span className="text-3xl sm:text-4xl font-black text-blue-400 font-display block">
                  140,000+
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wide">
                  Students Field-Tested
                </span>
              </div>

              <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0">
                <span className="text-3xl sm:text-4xl font-black text-indigo-400 font-display block">
                  100%
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wide">
                  Direct Invoicing
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. CORE VALUE PROPOSITION TILES
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-white/80 backdrop-blur-md border-y border-slate-200/90 py-14 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ScrollReveal direction="up" delay={50} className="h-full">
              <TiltCard maxTilt={8} className="h-full">
                <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:border-blue-300 transition-all shadow-xs hover:shadow-lg space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-[18px] font-black text-slate-900 leading-snug">
                    Direct Direct Bookings
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Book directly with attraction authorities, eliminating third-party agent markups and hidden fees.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={150} className="h-full">
              <TiltCard maxTilt={8} className="h-full">
                <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:border-emerald-300 transition-all shadow-xs hover:shadow-lg space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <h3 className="text-[18px] font-black text-slate-900 leading-snug">
                    Official Tier Rates
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Published student group rates with transparent free teacher ratios (1 chaperone free per 15 students).
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={250} className="h-full">
              <TiltCard maxTilt={8} className="h-full">
                <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:border-indigo-300 transition-all shadow-xs hover:shadow-lg space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-[18px] font-black text-slate-900 leading-snug">
                    Availability Calendar
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Real-time venue slot checking and arrival batches to ensure safe, uncrowded student experiences.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={350} className="h-full">
              <TiltCard maxTilt={8} className="h-full">
                <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:border-amber-300 transition-all shadow-xs hover:shadow-lg space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h3 className="text-[18px] font-black text-slate-900 leading-snug">
                    Central Fleet Logistics
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Optional coach fleet assistance coordinated strictly through centralized super-admin logistics queue.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. CURATED PREMIER DESTINATION SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      <section id="destinations-discovery" className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <ScrollReveal direction="up" delay={50}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <span className="text-blue-600 font-extrabold text-[13px] sm:text-[14px] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Curated Excursion Catalog</span>
                </span>
                <h2 className="text-[30px] sm:text-[38px] font-black text-slate-950 tracking-tight font-display">
                  Explore Verified Excursion Venues
                </h2>
                <p className="text-[15px] sm:text-[17px] text-slate-600 mt-2 max-w-2xl leading-relaxed">
                  Browse hand-vetted theme parks, science centres, historical museums, and wildlife sanctuaries ready for institute bookings.
                </p>
              </div>

              <Link
                to="/destinations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-[14px] font-extrabold text-blue-600 hover:text-blue-800 hover:border-blue-300 transition-all shadow-xs shrink-0"
              >
                <span>View Full Directory</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>

          {/* Category Filter Pills */}
          <ScrollReveal direction="up" delay={100}>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 no-scrollbar">
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value)}
                  className={`px-4 py-2 rounded-2xl text-[14px] font-extrabold whitespace-nowrap transition-all ${
                    selectedCategory === c.value
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/90'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {/* Destinations Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Landmark className="w-8 h-8" />
              </div>
              <h3 className="text-[22px] font-black text-slate-900 font-display">
                No Published Destinations in this Category Yet
              </h3>
              <p className="text-[15px] text-slate-600 leading-relaxed">
                SCHOOLDEST maintains zero fake listings or simulated reviews. Only verified destination partners approved by administration appear in this catalog.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/destination/onboard"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[15px] transition-all shadow-md shadow-blue-600/25"
                >
                  List Your Venue
                </Link>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[15px] transition-all"
                >
                  Reset Category
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredDestinations.map((dest, idx) => (
                <ScrollReveal key={dest.id} direction="up" delay={(idx % 6) * 75}>
                  <DestinationCard destination={dest} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. HOW IT WORKS (WITH AUDIENCE TABS & STEP CARDS)
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white/90 backdrop-blur-md border-y border-slate-200/90 py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" delay={50}>
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-blue-600 font-extrabold text-[13px] sm:text-[14px] uppercase tracking-wider">
                Platform Workflow
              </span>
              <h2 className="text-[30px] sm:text-[38px] font-black text-slate-950 tracking-tight font-display">
                How SCHOOLDEST Works
              </h2>
              <p className="text-[15px] sm:text-[17px] text-slate-600 leading-relaxed">
                A transparent, streamlined workflow designed specifically for institutions and excursion venue operators.
              </p>

              {/* Audience Switcher Tabs */}
              <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200/90 mt-4 shadow-inner">
                <button
                  onClick={() => setHowItWorksTab('schools')}
                  className={`px-6 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-black transition-all ${
                    howItWorksTab === 'schools'
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  For Institutes
                </button>
                <button
                  onClick={() => setHowItWorksTab('venues')}
                  className={`px-6 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-black transition-all ${
                    howItWorksTab === 'venues'
                      ? 'bg-white text-purple-700 shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  For Partner Venues
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Three-Step Experience Cards */}
          {howItWorksTab === 'schools' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <ScrollReveal direction="up" delay={80} className="h-full">
                <TiltCard maxTilt={8} className="h-full">
                  <div className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 space-y-3.5 h-full relative shadow-xs hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-[18px] flex items-center justify-center shadow-md shadow-blue-500/25">
                      1
                    </div>
                    <h3 className="text-[19px] font-black text-slate-950 font-display">
                      Discover Verified Destinations
                    </h3>
                    <p className="text-[14px] text-slate-600 leading-relaxed">
                      Browse verified amusement parks, science museums, zoos, and heritage centers tailored to your curriculum, student age group, and location.
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={160} className="h-full">
                <TiltCard maxTilt={8} className="h-full">
                  <div className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 space-y-3.5 h-full relative shadow-xs hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-[18px] flex items-center justify-center shadow-md shadow-blue-500/25">
                      2
                    </div>
                    <h3 className="text-[19px] font-black text-slate-950 font-display">
                      Inspect Pricing & Availability
                    </h3>
                    <p className="text-[14px] text-slate-600 leading-relaxed">
                      Review published educational ticket tiers, meal inclusions, complimentary teacher allowances, and real venue blackout dates.
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={240} className="h-full">
                <TiltCard maxTilt={8} className="h-full">
                  <div className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 space-y-3.5 h-full relative shadow-xs hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-[18px] flex items-center justify-center shadow-md shadow-blue-500/25">
                      3
                    </div>
                    <h3 className="text-[19px] font-black text-slate-950 font-display">
                      Submit Proposal & Coordinate
                    </h3>
                    <p className="text-[14px] text-slate-600 leading-relaxed">
                      Submit your group booking proposal. Venue management directly approves your date and arrival batch, with optional transport fleet tracking.
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <ScrollReveal direction="up" delay={80} className="h-full">
                <TiltCard maxTilt={8} className="h-full">
                  <div className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 space-y-3.5 h-full relative shadow-xs hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-[18px] flex items-center justify-center shadow-md shadow-purple-500/25">
                      1
                    </div>
                    <h3 className="text-[19px] font-black text-slate-950 font-display">
                      Register Your Destination
                    </h3>
                    <p className="text-[14px] text-slate-600 leading-relaxed">
                      Create your manager profile with verified Google Neon authentication and enter your institutional venue details.
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={160} className="h-full">
                <TiltCard maxTilt={8} className="h-full">
                  <div className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 space-y-3.5 h-full relative shadow-xs hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-[18px] flex items-center justify-center shadow-md shadow-purple-500/25">
                      2
                    </div>
                    <h3 className="text-[19px] font-black text-slate-950 font-display">
                      Configure Photos & Rates
                    </h3>
                    <p className="text-[14px] text-slate-600 leading-relaxed">
                      Upload Cloudinary photos, specify student ticket tiers, add meal packages, configure free teacher rules, and submit for admin review.
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={240} className="h-full">
                <TiltCard maxTilt={8} className="h-full">
                  <div className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 space-y-3.5 h-full relative shadow-xs hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-[18px] flex items-center justify-center shadow-md shadow-purple-500/25">
                      3
                    </div>
                    <h3 className="text-[19px] font-black text-slate-950 font-display">
                      Receive & Confirm Requests
                    </h3>
                    <p className="text-[14px] text-slate-600 leading-relaxed">
                      Upon Super Admin approval, manage incoming institutional requests directly, control daily capacity, and confirm student batches.
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>
            </div>
          )}

          {/* Important Clarity Note */}
          <ScrollReveal direction="up" delay={100}>
            <div className="mt-10 p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3.5 max-w-3xl mx-auto shadow-xs">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[14px] text-amber-900 leading-relaxed">
                <strong className="font-bold">Important booking policy:</strong> Submitting a booking request creates a formal proposal and does not automatically confirm a reservation. The venue management reviews capacity and accepts the requested excursion date.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. BENTO GRID: WHY INSTITUTES CHOOSE SCHOOLDEST
      ───────────────────────────────────────────────────────────── */}
      <section id="for-schools" className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" delay={50}>
            <div className="max-w-3xl mx-auto text-center mb-14 space-y-3">
              <span className="text-blue-600 font-extrabold text-[13px] sm:text-[14px] uppercase tracking-wider">
                Institutional Advantage
              </span>
              <h2 className="text-[30px] sm:text-[38px] font-black text-slate-950 tracking-tight font-display">
                Why Institutes Choose SCHOOLDEST
              </h2>
              <p className="text-[15px] sm:text-[17px] text-slate-600 leading-relaxed">
                A modern B2B platform engineered to make annual excursions transparent, organized, and compliant.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <ScrollReveal direction="up" delay={50} className="h-full">
              <TiltCard maxTilt={6} className="h-full">
                <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-[19px] font-black text-slate-900 font-display">
                    Curriculum-Aligned Discovery
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Filter destinations by grade level, curriculum theme, safety certifications, and travel distance across India.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={100} className="h-full">
              <TiltCard maxTilt={6} className="h-full">
                <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-[19px] font-black text-slate-900 font-display">
                    Automated Faculty Ratios
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Our calculation engine automatically computes free chaperone ratios (e.g. 1 per 15 students) to eliminate unexpected staff costs.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={150} className="h-full">
              <TiltCard maxTilt={6} className="h-full">
                <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-[19px] font-black text-slate-900 font-display">
                    Locked Quotation Snapshots
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Receive locked price snapshots for institute board and management approval with transparent breakdown of tickets and meals.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200} className="h-full">
              <TiltCard maxTilt={6} className="h-full">
                <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-[19px] font-black text-slate-900 font-display">
                    Capacity-Synchronized Dates
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Real-time synchronization prevents scheduling conflicts, maintenance days, or overcrowded public holiday dates.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={250} className="h-full">
              <TiltCard maxTilt={6} className="h-full">
                <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-[19px] font-black text-slate-900 font-display">
                    Live Status Tracking
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Monitor status from SUBMITTED, UNDER REVIEW, CONFIRMED, to COMPLETED with direct notification alerts.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={300} className="h-full">
              <TiltCard maxTilt={6} className="h-full">
                <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h3 className="text-[19px] font-black text-slate-900 font-display">
                    Central Fleet Coordination
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Select your student transport requirements with confidence. Fleet requests are coordinated through our centralized logistics queue.
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. DESTINATION PARTNERS DARK LUXURY SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      <section id="partner-venues" className="bg-aurora-dark text-white py-16 sm:py-20 lg:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <ScrollReveal direction="left" delay={80} className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-[13px] sm:text-[14px] font-black">
                <Landmark className="w-4 h-4 text-purple-400" />
                <span>For Attractions, Theme Parks, Science Centres & Zoos</span>
              </div>

              <h2 className="text-[32px] sm:text-[42px] lg:text-[48px] font-black tracking-tight leading-[1.1] text-white font-display">
                Direct Institute Demand, <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
                  Zero Intermediary Commissions.
                </span>
              </h2>

              <p className="text-[16px] sm:text-[18px] text-slate-300 leading-relaxed max-w-2xl font-normal">
                Join India's dedicated institutional marketplace. Publish your venue, control daily student capacity, set educational rates, and receive structured group booking requests directly from verified institutes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[14px] text-slate-200">Custom student & meal packages</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[14px] text-slate-200">Real capacity & arrival batch control</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[14px] text-slate-200">Cloudinary high-res photo gallery</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[14px] text-slate-200">Direct coordinator contact channels</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/destination/onboard"
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[15px] sm:text-[16px] shadow-xl shadow-purple-600/30 hover:shadow-2xl transition-all"
                >
                  <span>List Your Destination Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={120} className="lg:col-span-5">
              <TiltCard maxTilt={8}>
                <div className="glass-card-dark rounded-3xl p-7 space-y-6">
                  <div className="text-[17px] font-black text-white flex items-center justify-between border-b border-white/10 pb-4">
                    <span>Venue Onboarding Track</span>
                    <span className="text-purple-400 text-[12px] font-black uppercase tracking-wider bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-400/30">
                      Vetted Marketplace
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-purple-600/40 text-purple-300 font-black text-[15px] flex items-center justify-center shrink-0 border border-purple-400/30">
                        1
                      </div>
                      <div>
                        <div className="text-[16px] font-black text-white">4-Step Onboarding Form</div>
                        <p className="text-[13px] text-slate-400 mt-0.5">Submit institutional details, ticketing tiers, and safety guidelines.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-purple-600/40 text-purple-300 font-black text-[15px] flex items-center justify-center shrink-0 border border-purple-400/30">
                        2
                      </div>
                      <div>
                        <div className="text-[16px] font-black text-white">Cloudinary Media Gallery</div>
                        <p className="text-[13px] text-slate-400 mt-0.5">Upload 5–6 high-resolution campus and attraction photos.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-purple-600/40 text-purple-300 font-black text-[15px] flex items-center justify-center shrink-0 border border-purple-400/30">
                        3
                      </div>
                      <div>
                        <div className="text-[16px] font-black text-white">Super-Admin Audit</div>
                        <p className="text-[13px] text-slate-400 mt-0.5">Prompt administrative publishing to thousands of verified coordinators.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. OPERATIONAL TRANSPARENCY
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-white/80 border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" delay={50}>
            <div className="max-w-3xl mx-auto text-center mb-14 space-y-3">
              <span className="text-blue-600 font-extrabold text-[13px] sm:text-[14px] uppercase tracking-wider">
                System Architecture
              </span>
              <h2 className="text-[30px] sm:text-[38px] font-black text-slate-950 tracking-tight font-display">
                Clear Separation of Responsibilities
              </h2>
              <p className="text-[15px] sm:text-[17px] text-slate-600 leading-relaxed">
                SCHOOLDEST cleanly decouples venue hospitality and logistics to maintain operational integrity.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ScrollReveal direction="up" delay={100} className="h-full">
              <TiltCard maxTilt={6}>
                <div className="bg-slate-50/80 rounded-3xl p-7 border border-slate-200/80 space-y-3 h-full shadow-xs hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <h3 className="text-[20px] font-black text-slate-900 font-display">
                    Venue Booking Requests
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Handled directly by destination managers. Venues manage admission tickets, meal packages, complimentary staff allowances, activity schedules, and daily student quotas.
                  </p>
                  <div className="pt-2 text-[13px] font-extrabold text-blue-700 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Destination Manager Portal
                  </div>
                </div>
              </TiltCard>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200} className="h-full">
              <TiltCard maxTilt={6}>
                <div className="bg-slate-50/80 rounded-3xl p-7 border border-slate-200/80 space-y-3 h-full shadow-xs hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h3 className="text-[20px] font-black text-slate-900 font-display">
                    Central Transport Logistics
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Fleet and bus requests remain strictly within the SCHOOLDEST administration fleet coordination queue. Venues are never burdened with bus vendor liabilities.
                  </p>
                  <div className="pt-2 text-[13px] font-extrabold text-purple-700 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Super Admin Fleet Dispatch
                  </div>
                </div>
              </TiltCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FAQS ACCORDION WITH MODERN ACCENTS
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" delay={50}>
            <div className="text-center mb-14 space-y-3">
              <span className="text-blue-600 font-extrabold text-[13px] sm:text-[14px] uppercase tracking-wider">
                Answers & Assistance
              </span>
              <h2 className="text-[30px] sm:text-[38px] font-black text-slate-950 tracking-tight font-display">
                Frequently Asked Questions
              </h2>
              <p className="text-[15px] sm:text-[17px] text-slate-600 leading-relaxed">
                Clear, transparent answers about our booking platform, verification standards, and operations.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <ScrollReveal key={idx} direction="up" delay={(idx % 6) * 50}>
                <div
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="text-[16px] sm:text-[17px] font-extrabold text-slate-900 leading-snug">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-300 ${
                        openFaq === idx ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-6 pt-1 text-[15px] text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            {/* Col 1 & 2: Brand & Mission */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img src="/brand/logo-dark.png" alt="TRAILR'S" className="h-8 w-auto invert" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                India's dedicated B2B excursion marketplace connecting verified educational institutions directly with attractions, theme parks, science museums, and wildlife sanctuaries.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Super-Admin Verified Listings & Secure Direct Invoicing</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-sm tracking-wide uppercase">Discovery</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/destinations" className="hover:text-blue-400 transition-colors">
                    All Destinations
                  </Link>
                </li>
                <li>
                  <Link to="/destinations?category=Amusement" className="hover:text-blue-400 transition-colors">
                    Theme & Waterparks
                  </Link>
                </li>
                <li>
                  <Link to="/destinations?category=Science" className="hover:text-blue-400 transition-colors">
                    Science & Planetariums
                  </Link>
                </li>
                <li>
                  <Link to="/destinations?category=Museum" className="hover:text-blue-400 transition-colors">
                    Heritage & Museums
                  </Link>
                </li>
              </ul>
            </div>

            {/* Access Portals */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-sm tracking-wide uppercase">Portals</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/login" className="hover:text-blue-400 transition-colors">
                    Account Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/school" className="hover:text-blue-400 transition-colors">
                    Institute Portal
                  </Link>
                </li>
                <li>
                  <Link to="/destination" className="hover:text-purple-400 transition-colors">
                    Destination Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Trust & Security */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-sm tracking-wide uppercase">Trust & Safety</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Platform verification ensures that educational group pricing, teacher allowances, and safety parameters remain transparent and uncompromised.
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>© {new Date().getFullYear()} TRAILR'S / SCHOOLDEST. All rights reserved. Direct B2B Excursion Network.</div>
            <div className="flex items-center gap-4">
              <span>Direct Educational Rates</span>
              <span>•</span>
              <span>Zero Markups</span>
              <span>•</span>
              <span>Dedicated Fleet Transport</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
