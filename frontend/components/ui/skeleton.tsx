import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-muted',
        className
      )}
      {...props}
    />
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}

export { Skeleton, TableSkeleton, CardSkeleton };
