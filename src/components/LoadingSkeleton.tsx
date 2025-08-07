import React from 'react';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export function Skeleton({ className = '', height = 'h-4', width = 'w-full' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`} />
  );
}

interface PlayerCardSkeletonProps {
  count?: number;
}

export function PlayerCardSkeleton({ count = 6 }: PlayerCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border animate-pulse">
          <div className="flex justify-between items-start mb-3">
            <Skeleton height="h-5" width="w-24" />
            <Skeleton height="h-6" width="w-12" />
          </div>
          <Skeleton height="h-4" width="w-32" className="mb-3" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton height="h-3" width="w-16" />
              <Skeleton height="h-3" width="w-12" />
            </div>
            <div className="flex justify-between">
              <Skeleton height="h-3" width="w-20" />
              <Skeleton height="h-3" width="w-8" />
            </div>
            <div className="flex justify-between">
              <Skeleton height="h-3" width="w-16" />
              <Skeleton height="h-3" width="w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <Skeleton height="h-6" width="w-48" />
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  height="h-4" 
                  width={colIndex === 0 ? "w-32" : "w-20"} 
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatsSkeletonProps {
  count?: number;
}

export function StatsSkeleton({ count = 4 }: StatsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border animate-pulse">
          <div className="flex items-center">
            <Skeleton height="h-8" width="w-8" className="rounded-lg" />
            <div className="ml-4 flex-1">
              <Skeleton height="h-3" width="w-20" className="mb-1" />
              <Skeleton height="h-6" width="w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 