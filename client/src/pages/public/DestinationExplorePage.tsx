import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Destination } from '../../types/index.js';
import { DestinationCard } from '../../components/common/DestinationCard.js';
import { SkeletonCard } from '../../components/common/Skeleton.js';
import { Search, Filter, SlidersHorizontal, MapPin, Sparkles, Landmark, ArrowRight, RotateCcw } from 'lucide-react';

export const DestinationExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [city, setCity] = useState(searchParams.get('city') || 'ALL');
  const [sort, setSort] = useState(searchParams.get('sort') || 'featured');

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category !== 'ALL') params.category = category;
      if (city !== 'ALL') params.city = city;
      if (sort !== 'featured') params.sort = sort;

      const res = await api.getDestinations(params);
      if (res.success) {
        setDestinations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, [category, city, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDestinations();
  };

  const categories = [
    { label: 'All Destinations', value: 'ALL' },
    { label: 'Amusement Parks', value: 'Amusement' },
    { label: 'Waterparks', value: 'Waterpark' },
    { label: 'Science & Planetariums', value: 'Science' },
    { label: 'Museums & Heritage', value: 'Museum' },
    { label: 'Wildlife & Zoos', value: 'Zoo' },
    { label: 'Adventure & Outdoor', value: 'Adventure' },
  ];

  return (
    <div className="min-h-screen bg-aurora py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-blue-200/90 text-blue-700 text-[13px] font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Verified Educational Excursion Network</span>
          </div>
          <h1 className="text-[36px] sm:text-[44px] font-black text-slate-950 font-display tracking-tight leading-tight">
            Destination Discovery Marketplace
          </h1>
          <p className="text-[17px] sm:text-[18px] text-slate-600 max-w-3xl leading-relaxed">
            Browse verified waterparks, science centres, museums, wildlife parks, and educational landmarks across India with direct institutional booking.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-6 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search venue name, attractions, activities..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-[16px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Filter destinations by city"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[16px] font-medium text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="ALL">All Cities across India</option>
                <option value="Delhi">Delhi NCR</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Ludhiana">Ludhiana</option>
                <option value="Kapurthala">Kapurthala</option>
                <option value="Chandigarh">Chandigarh</option>
              </select>
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort destinations"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[16px] font-medium text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="featured">Featured First</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="min_group">Small Group Friendly</option>
              </select>

              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[16px] font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-slate-100 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-[14px] sm:text-[15px] font-bold whitespace-nowrap transition-all ${
                  category === cat.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 sm:p-16 text-center max-w-2xl mx-auto shadow-sm space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Landmark className="w-8 h-8" />
            </div>
            <h3 className="text-[24px] font-bold text-slate-900 font-display">
              No Published Destinations Found
            </h3>
            <p className="text-[16px] text-slate-600 leading-relaxed max-w-md mx-auto">
              There are currently no approved venues matching your filter criteria. All venues on SCHOOLDEST undergo administrator vetting before appearing in this directory.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearch('');
                  setCategory('ALL');
                  setCity('ALL');
                  setSort('featured');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[15px] font-bold rounded-xl transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Filters</span>
              </button>
              <Link
                to="/destination/onboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-bold rounded-xl shadow-sm transition-all"
              >
                <Landmark className="w-4 h-4" />
                <span>List a Venue</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-[15px] text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900 text-[16px]">{destinations.length}</span> published destination{destinations.length === 1 ? '' : 's'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {destinations.map((dest) => (
                <DestinationCard key={dest.id} destination={dest} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
