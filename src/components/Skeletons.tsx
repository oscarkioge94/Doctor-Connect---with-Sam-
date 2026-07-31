import React from 'react';
import { motion } from 'motion/react';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    initial={{ opacity: 0.5 }}
    animate={{ opacity: [0.4, 0.8, 0.4] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    className={`bg-slate-200/80 rounded-lg ${className}`}
  />
);

export const PatientListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <SkeletonBox className="w-11 h-11 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-sm">
            <SkeletonBox className="h-4 w-3/4" />
            <SkeletonBox className="h-3 w-1/2" />
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-6">
          <SkeletonBox className="h-4 w-24" />
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export const AppointmentListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SkeletonBox className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBox className="h-3.5 w-32" />
            <SkeletonBox className="h-3 w-24" />
          </div>
        </div>
        <SkeletonBox className="h-6 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

export const TimelineSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SkeletonBox className="w-6 h-6 rounded-full" />
            <SkeletonBox className="h-3.5 w-28" />
          </div>
          <SkeletonBox className="h-3 w-20" />
        </div>
        <SkeletonBox className="h-12 w-full rounded-lg" />
        <div className="flex space-x-3 pt-1">
          <SkeletonBox className="h-4 w-16 rounded-md" />
          <SkeletonBox className="h-4 w-16 rounded-md" />
          <SkeletonBox className="h-4 w-16 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBox className="h-3.5 w-24" />
          <SkeletonBox className="w-9 h-9 rounded-xl" />
        </div>
        <SkeletonBox className="h-8 w-20" />
        <SkeletonBox className="h-3 w-32" />
      </div>
    ))}
  </div>
);
