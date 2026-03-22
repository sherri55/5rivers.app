import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Modern <Select> — drop-in replacement for native <select>         */
/*  Provides consistent styling, custom chevron, and two variants:    */
/*    • "form"   – full-width inputs inside forms                     */
/*    • "filter" – compact selects used in list-page filter bars      */
/* ------------------------------------------------------------------ */

type Variant = 'form' | 'filter';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Visual variant */
  variant?: Variant;
  /** Optional leading icon (Material Symbols name) */
  icon?: string;
  /** The option elements */
  children: ReactNode;
}

const base =
  'select-hide-arrow relative w-full appearance-none rounded-xl bg-surface-container-low text-on-surface ' +
  'transition-all duration-200 cursor-pointer ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white ' +
  'hover:bg-surface-container ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-container-low';

const variants: Record<Variant, string> = {
  form:   'pl-4 pr-10 py-3 text-sm font-medium border border-outline-variant/20 shadow-sm',
  filter: 'pl-3 pr-9 py-2 text-xs font-medium border border-outline-variant/15 ghost-border',
};

const iconVariants: Record<Variant, string> = {
  form:   'pl-11',
  filter: 'pl-9',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ variant = 'form', icon, className = '', children, ...rest }, ref) => {
    const hasIcon = !!icon;

    return (
      <div className="relative">
        {/* Leading icon */}
        {hasIcon && (
          <span
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/60 ${
              variant === 'form' ? 'text-[20px]' : 'text-[16px]'
            }`}
          >
            {icon}
          </span>
        )}

        <select
          ref={ref}
          className={`${base} ${variants[variant]} ${hasIcon ? iconVariants[variant] : ''} ${className}`}
          {...rest}
        >
          {children}
        </select>

        {/* Custom chevron */}
        <span
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 ${
            variant === 'form' ? 'text-[20px]' : 'text-[16px]'
          }`}
        >
          expand_more
        </span>
      </div>
    );
  }
);

Select.displayName = 'Select';
