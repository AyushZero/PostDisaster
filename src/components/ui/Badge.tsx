import React from 'react';
import { AlertSeverity, SeverityLevel } from '@/types';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: SeverityLevel | AlertSeverity }) {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    low: 'success',
    medium: 'info',
    high: 'warning',
    critical: 'danger',
  };

  const labels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  return <Badge variant={variants[severity]}>{labels[severity]}</Badge>;
}

export function StatusBadge({ status }: { status: 'active' | 'resolved' | 'inactive' }) {
  const variants: Record<string, 'success' | 'warning' | 'default'> = {
    active: 'warning',
    resolved: 'success',
    inactive: 'default',
  };

  const labels: Record<string, string> = {
    active: 'Active',
    resolved: 'Resolved',
    inactive: 'Inactive',
  };

  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
