import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-200/80 via-slate-100 to-slate-200/80 rounded-xl ${className}`}
      style={style}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm p-0 space-y-4">
      {/* Media placeholder */}
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-5 sm:p-6 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-28 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-5/6 rounded-lg" />
        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
        <Skeleton className="h-5 w-44 rounded-lg" />
        <Skeleton className="h-5 w-24 rounded-lg" />
      </div>

      <div className="p-4 space-y-3">
        {/* Head */}
        <div className="grid gap-4 px-3 py-2 bg-slate-50/80 rounded-xl" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded-md" />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="grid gap-4 px-3 py-3 border-b border-slate-100 last:border-none items-center"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton key={cIdx} className="h-5 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC<{ title?: string; isDark?: boolean }> = ({
  title = 'Loading Operations Center...',
  isDark = false,
}) => {
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-aurora'} py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fadeIn`}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Banner Header */}
        <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'glass-card border-white/80'} shadow-lg space-y-3`}>
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-72 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'} shadow-sm space-y-3`}
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-6 w-6 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          ))}
        </div>

        {/* Big Table / List */}
        <SkeletonTable rows={5} cols={6} />
      </div>
    </div>
  );
};
