"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`shimmer rounded ${className}`} />
  );
}

export function PostSkeleton() {
  return (
    <article className="py-8 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-3/4" />
      <div className="border border-standard p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="flex-1 h-5" />
        </div>
        <div className="w-full h-[2px] bg-tertiary" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </article>
  );
}

export function RoomSkeleton() {
  return (
    <div className="border border-standard p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border border-standard animate-pulse">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
