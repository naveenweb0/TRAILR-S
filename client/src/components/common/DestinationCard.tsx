import React from 'react';
import { Link } from 'react-router-dom';
import { Destination } from '../../types/index.js';
import { MapPin, Users, CheckCircle2, ArrowRight, Sparkles, Building2, Ticket } from 'lucide-react';
import { CldImage } from './CldImage.js';
import { TiltCard } from './TiltCard.js';

interface DestinationCardProps {
  destination: Destination;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({ destination }) => {
  const coverUrl =
    destination.coverImage ||
    destination.images?.find((img) => img.isCover)?.url ||
    destination.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80';

  const startingPrice = destination.startingPrice || destination.ticketTypes?.[0]?.basePrice || null;

  return (
    <TiltCard maxTilt={6} scale={1.02} className="h-full">
      <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-blue-300/80 transition-all duration-300 flex flex-col group overflow-hidden h-full relative">
        {/* Subtle Ambient Border Glow on Hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-cyan-500/0 group-hover:from-blue-500/20 group-hover:via-indigo-500/20 group-hover:to-cyan-500/20 rounded-[26px] blur-sm transition-all duration-500 pointer-events-none -z-10" />

        {/* Media & Badges */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
          <CldImage
            src={coverUrl}
            publicId={(destination as any).coverImagePublicId || destination.images?.find((img) => img.isCover)?.publicId}
            alt={destination.name}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            width={640}
            height={400}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/20 pointer-events-none" />

          {/* Category & Status Tags */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
            <span className="px-3 py-1 rounded-xl text-[12px] font-black bg-slate-950/80 backdrop-blur-md text-white border border-white/20 shadow-md tracking-wide uppercase">
              {destination.category}
            </span>
            {destination.isVerified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[12px] font-bold bg-blue-600/90 backdrop-blur-md text-white shadow-md border border-blue-400/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />
                <span>Verified</span>
              </span>
            )}
          </div>

          {/* Location & Capacity on bottom overlay */}
          <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white text-[13px] z-10">
            <span className="flex items-center gap-1.5 font-bold drop-shadow-md">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">{destination.city}, {destination.state}</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[12px] font-bold shrink-0 border border-white/10">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{destination.minGroupSize}–{destination.maxGroupSize}</span>
            </span>
          </div>
        </div>

        {/* Content & Details */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-950 text-[18px] sm:text-[19px] group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
              {destination.name}
            </h3>
            <p className="text-slate-600 text-[14px] mt-1.5 line-clamp-2 leading-relaxed">
              {destination.description || 'Dedicated excursion destination offering educational programs and group bookings for institutes.'}
            </p>

            {/* Facilities Chips */}
            {destination.facilities && destination.facilities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {destination.facilities.slice(0, 3).map((f) => (
                  <span
                    key={f.id}
                    className="text-[12px] px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                  >
                    {f.name}
                  </span>
                ))}
                {destination.facilities.length > 3 && (
                  <span className="text-[12px] px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 font-medium">
                    +{destination.facilities.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Call to Action */}
          <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Student Admission
              </div>
              <div className="text-slate-900 font-black text-[21px] sm:text-[23px] flex items-baseline gap-1 mt-0.5">
                {startingPrice ? (
                  <>
                    <span className="text-blue-600 font-mono">₹{Number(startingPrice).toLocaleString('en-IN')}</span>
                    <span className="text-[12px] text-slate-500 font-normal">/student</span>
                  </>
                ) : (
                  <span className="text-[14px] text-slate-700 font-bold">Educational Tier</span>
                )}
              </div>

              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>1 Free Teacher / 15 Students</span>
              </span>
            </div>

            <Link
              to={`/destinations/${destination.slug || destination.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-extrabold bg-slate-900 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all shrink-0 group-hover:bg-blue-600"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </TiltCard>
  );
};
