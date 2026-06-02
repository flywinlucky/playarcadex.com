import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800",
        "bg-[length:200%_100%] animate-[shimmer_2s_infinite]",
        className
      )}
      {...props}
    />
  );
}

// 游戏卡片骨架屏
function GameCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      {/* 图片区域 */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>
      
      {/* 内容区域 */}
      <div className="p-3 space-y-2">
        {/* 标题 */}
        <Skeleton className="h-4 w-3/4" />
        
        {/* 标签区域 */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// 游戏网格骨架屏
function GameGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}

// 特色游戏骨架屏
function FeaturedGamesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-32" />
      </div>
      <GameGridSkeleton count={12} />
    </div>
  );
}

// 页面骨架屏
function PageSkeleton() {
  return (
    <div className="space-y-8 p-4">
      {/* 面包屑 */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      {/* 标题 */}
      <Skeleton className="h-8 w-64" />
      
      {/* 内容 */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export { 
  Skeleton, 
  GameCardSkeleton, 
  GameGridSkeleton, 
  FeaturedGamesSkeleton, 
  PageSkeleton 
}; 