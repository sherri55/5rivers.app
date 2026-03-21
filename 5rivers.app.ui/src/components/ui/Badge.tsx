import { cn } from '@/lib/cn';

type BadgeVariant =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'gray'
  | 'indigo'
  | 'emerald';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  yellow: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

// --- Pre-built domain badges ---

const sourceTypeVariant: Record<string, BadgeVariant> = {
  DISPATCHED: 'blue',
  DIRECT: 'green',
};

export function SourceTypeBadge({ sourceType }: { sourceType: string }) {
  return (
    <Badge variant={sourceTypeVariant[sourceType] ?? 'gray'}>
      {sourceType === 'DISPATCHED' ? 'Dispatched' : 'Direct'}
    </Badge>
  );
}

const unitStatusVariant: Record<string, BadgeVariant> = {
  ACTIVE: 'green',
  MAINTENANCE: 'yellow',
  INACTIVE: 'gray',
  RETIRED: 'red',
};

export function UnitStatusBadge({ status }: { status: string }) {
  return <Badge variant={unitStatusVariant[status] ?? 'gray'}>{status}</Badge>;
}

const invoiceStatusVariant: Record<string, BadgeVariant> = {
  CREATED: 'gray',
  RAISED: 'yellow',
  RECEIVED: 'green',
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return <Badge variant={invoiceStatusVariant[status] ?? 'gray'}>{status}</Badge>;
}

const payTypeVariant: Record<string, BadgeVariant> = {
  HOURLY: 'blue',
  PERCENTAGE: 'emerald',
  CUSTOM: 'gray',
};

export function PayTypeBadge({ payType }: { payType: string }) {
  return <Badge variant={payTypeVariant[payType] ?? 'gray'}>{payType}</Badge>;
}

const carrierRateTypeVariant: Record<string, BadgeVariant> = {
  PERCENTAGE: 'blue',
  FLAT_PER_JOB: 'green',
  FLAT_PER_LOAD: 'indigo',
  FLAT_PER_TON: 'yellow',
  HOURLY: 'gray',
};

const carrierRateTypeLabel: Record<string, string> = {
  PERCENTAGE: 'Percentage',
  FLAT_PER_JOB: 'Flat / Job',
  FLAT_PER_LOAD: 'Flat / Load',
  FLAT_PER_TON: 'Flat / Ton',
  HOURLY: 'Hourly',
};

export function CarrierRateTypeBadge({ rateType }: { rateType: string }) {
  return (
    <Badge variant={carrierRateTypeVariant[rateType] ?? 'gray'}>
      {carrierRateTypeLabel[rateType] ?? rateType}
    </Badge>
  );
}
