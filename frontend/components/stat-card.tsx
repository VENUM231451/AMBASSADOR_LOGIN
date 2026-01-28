'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}
