import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { Booking, Destination } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { SkeletonDashboard } from '../../components/common/Skeleton.js';
import {
  School,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  Compass,
  PlusCircle,
  MapPin,
  Users,
} from 'lucide-react';
import { ScrollReveal } from '../../components/common/ScrollReveal.js';

export const SchoolDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [featuredDestinations, setFeaturedDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If authenticated user does not have a linked school profile, route to onboarding
    if (user && !user.school && user.role !== 'SUPER_ADMIN') {
      navigate('/school/onboard');
      return;
    }

    Promise.all([api.getMyBookings(), api.getDestinations()])
      .then(([bRes, dRes]) => {
        if (bRes.success) setBookings(bRes.data);
        if (dRes.success) setFeaturedDestinations(dRes.data.slice(0, 3));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <SkeletonDashboard title="Loading Institute Excursion Portal..." />;
  }

  const pendingCount = bookings.filter((b) => b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW').length;
  const changesCount = bookings.filter((b) => b.status === 'CHANGES_REQUESTED' || b.status === 'AWAITING_SCHOOL_RESPONSE').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'ACCEPTED').length;
  const travellerPendingCount = bookings.filter((b) => b.requiresTransport && b.travellerRequest?.status !== 'CONFIRMED').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Verification Status Banner if PENDING */}
        {user?.school?.verificationStatus === 'PENDING' && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900">Institution Approval In Progress</h4>
              <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                Your institute profile is currently undergoing review and approval by platform administration. You can browse all destinations and prepare excursion details; official booking requests will activate upon profile approval.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-900 font-black text-[10px] tracking-wide uppercase shrink-0">
              PENDING
            </span>
          </div>
        )}

        {/* Welcome Section */}
        <ScrollReveal direction="up" delay={50}>
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[13px] font-bold">
                  <School className="w-4 h-4" />
                  <span>{user?.school?.name || 'Authorized Institute Excursion Portal'}</span>
                </div>
                <h1 className="text-[28px] sm:text-[34px] font-black font-display tracking-tight leading-tight">
                  Welcome back, {user?.name}
                </h1>
                <p className="text-slate-300 text-[15px] sm:text-[16px] max-w-xl leading-relaxed">
                  Plan, book, and coordinate upcoming institute picnics, waterpark trips, and educational visits.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/destinations"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[15px] shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-105"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Explore Venues & Book</span>
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <ScrollReveal direction="up" delay={80}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Total Bookings</span>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-slate-900 tracking-tight">{bookings.length}</div>
              <div className="text-[13px] text-slate-500">Excursion records</div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={140}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Pending Review</span>
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-blue-600 tracking-tight">{pendingCount}</div>
              <div className="text-[13px] text-blue-700">Awaiting venue action</div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Confirmed / Accepted</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-emerald-600 tracking-tight">{confirmedCount}</div>
              <div className="text-[13px] text-emerald-700">Venue approved</div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={260}>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2">
              <div className="flex items-center justify-between text-slate-600 text-[15px] font-bold">
                <span>Fleet Requests</span>
                <Truck className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-[30px] sm:text-[34px] font-black text-purple-600 tracking-tight">{travellerPendingCount}</div>
              <div className="text-[13px] text-purple-700">Admin coordination</div>
            </div>
          </ScrollReveal>
        </div>

        {/* Action alert if changes requested */}
        {changesCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900 text-xs">Action Required: Changes Proposed by Destination</h4>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  A destination has proposed an alternative date or group size adjustment for your review.
                </p>
              </div>
            </div>
            <Link
              to="/school/bookings?status=CHANGES_REQUESTED"
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              Review Proposed Changes
            </Link>
          </div>
        )}

        {/* RECENT BOOKINGS TABLE */}
        <ScrollReveal direction="up" delay={100}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Recent Institute Trip Bookings</h2>
              <p className="text-slate-500 text-xs mt-0.5">Status tracking and line-item details</p>
            </div>
            <Link
              to="/school/bookings"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading trips...</div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-sm">No bookings yet</h4>
              <p className="text-slate-500 text-xs mt-1">
                Explore destinations and reserve your institute's excursion dates.
              </p>
              <Link
                to="/destinations"
                className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
              >
                Discover Venues
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Visit Date</th>
                    <th className="py-3 px-4">Visitors</th>
                    <th className="py-3 px-4">Venue Status</th>
                    <th className="py-3 px-4">Transport</th>
                    <th className="py-3 px-4">Estimate</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {bookings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {b.bookingReference}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {b.destination?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {new Date(b.visitDate).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{b.totalGroupSize}</span>
                        <span className="text-slate-400 text-[10px]"> ({b.studentCount} students)</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge type="booking" status={b.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        {b.requiresTransport ? (
                          <StatusBadge
                            type="traveller"
                            status={b.travellerRequest?.status || 'NEW'}
                            size="sm"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400">Self-arranged</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{(b.confirmedQuoteAmount || b.originalQuoteAmount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/school/bookings?viewId=${b.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* EXPLORE DESTINATIONS TEASER */}
      <ScrollReveal direction="up" delay={150}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Popular Destinations for Institutes</h3>
              <p className="text-slate-500 text-xs">Directly bookable on the platform</p>
            </div>
            <Link
              to="/destinations"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Browse All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {featuredDestinations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-800 text-sm">No destinations currently published</div>
              <p className="mt-1">Verified amusement parks, science centres, and educational venues will appear here as they are published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredDestinations.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 rounded-2xl bg-slate-100 overflow-hidden mb-3">
                      <img
                        src={d.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600'}
                        alt={d.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{d.category}</div>
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{d.name}</h4>
                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {d.city}, {d.state}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {d.startingPrice ? `₹${d.startingPrice}` : 'Published Rates'}{' '}
                      <span className="text-[10px] font-normal text-slate-500">/student</span>
                    </span>
                    <Link
                      to={`/destinations/${d.slug || d.id}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      View Availability
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>
      </div>
    </div>
  );
};
